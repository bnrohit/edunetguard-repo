const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const { requireAuth, requireAdmin } = require('./auth');
const { authenticate } = require('../auth/store');
const { saveAllowedCidrs } = require('../monitoring/cidr-policy');
const store = require('../monitoring/user-monitor-store');
const runner = require('../monitoring/user-monitor-runner');
const { discoverMonitor } = require('../monitoring/device-discovery');
const { classifyDevice } = require('../monitoring/device-guidance');
const {
  MAX_PER_USER,
  normalizeInput,
  validateTarget,
  policySummary,
} = require('../monitoring/user-monitor-policy');

const policyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many policy changes. Try again later.' },
});

const discoveryLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many discovery requests. Try again later.' },
});

const manualCheckLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many manual monitor checks. Try again shortly.' },
});

async function discoverAndSave(monitor, ownerId, allowAdmin = false) {
  const discovery = await discoverMonitor(monitor);
  const profile = classifyDevice(monitor, discovery);
  const current = store.findById(monitor.id);
  // A queued discovery cannot overwrite results for a target edited during its scan.
  if (!current || current.target !== monitor.target || current.type !== monitor.type) return current;
  return store.updateDiscovery(monitor.id, ownerId, discovery, profile, allowAdmin);
}

function scheduleDiscovery(monitor, ownerId) {
  if (process.env.USER_MONITOR_AUTO_DISCOVERY === 'false') return;
  setImmediate(() => {
    discoverAndSave(monitor, ownerId).catch((error) => {
      console.warn('User monitor discovery failed:', monitor.id, error.message);
    });
  });
}

function notFoundOrDenied(result, res) {
  if (result === false) return res.status(403).json({ error: 'You do not own this monitor.' });
  if (result === null) return res.status(404).json({ error: 'Monitor not found.' });
  return null;
}

router.get('/policy', requireAuth, (req, res) => {
  res.json(policySummary());
});

router.patch('/admin/policy', policyLimiter, requireAdmin, (req, res) => {
  try {
    const verified = authenticate(req.user.username, req.body?.password);
    if (!verified || verified.role !== 'admin') {
      return res.status(401).json({ error: 'Administrator password verification failed.' });
    }
    if (!Array.isArray(req.body?.allowedPrivateCidrs)) {
      return res.status(400).json({ error: 'allowedPrivateCidrs must be an array of IPv4 CIDRs.' });
    }
    const cidrs = saveAllowedCidrs(req.body.allowedPrivateCidrs, req.user.username);
    console.info('Monitoring allowlist updated by admin:', req.user.username, 'CIDR count:', cidrs.length);
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ policy: policySummary() });
  } catch (error) {
    console.error('Monitoring policy update failed:', error.message);
    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Unable to save monitoring policy.',
    });
  }
});

router.get('/admin/all', requireAdmin, (req, res) => {
  res.json({ monitors: store.listAll(), policy: policySummary() });
});

router.post('/admin/:id/discover', discoveryLimiter, requireAdmin, async (req, res) => {
  try {
    const current = store.findById(req.params.id);
    if (!current) return res.status(404).json({ error: 'Monitor not found.' });
    const updated = await discoverAndSave(current, req.user.id, true);
    return res.json({ monitor: updated });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Unable to discover device.',
    });
  }
});

router.patch('/admin/:id', requireAdmin, async (req, res) => {
  const current = store.findById(req.params.id);
  if (!current) return res.status(404).json({ error: 'Monitor not found.' });

  const changes = {};
  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'enabled')) {
    changes.enabled = Boolean(req.body.enabled);
  } else {
    return res.status(400).json({ error: 'Only enabled can be changed through this admin endpoint.' });
  }

  const updated = store.updateMonitor(req.params.id, req.user.id, changes, true);
  return res.json({ monitor: updated });
});

router.delete('/admin/:id', requireAdmin, (req, res) => {
  const removed = store.deleteMonitor(req.params.id, req.user.id, true);
  if (!removed) return res.status(404).json({ error: 'Monitor not found.' });
  return res.json({ removed: true, monitor: removed });
});

router.get('/', requireAuth, (req, res) => {
  res.json({
    monitors: store.listByOwner(req.user.id),
    policy: policySummary(),
  });
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const existing = store.listByOwner(req.user.id);
    if (existing.length >= MAX_PER_USER) {
      return res.status(409).json({ error: `Monitor quota reached. Maximum ${MAX_PER_USER} monitors per user.` });
    }

    const normalized = normalizeInput(req.body || {});
    await validateTarget(normalized);
    const monitor = store.createMonitor(req.user, normalized);
    const checked = await runner.runMonitor(monitor.id);
    scheduleDiscovery(checked || monitor, req.user.id);
    return res.status(201).json({ monitor: checked || monitor, discovery: 'scheduled' });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Unable to create monitor.',
    });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const current = store.findById(req.params.id);
    if (!current) return res.status(404).json({ error: 'Monitor not found.' });
    if (current.ownerId !== req.user.id) return res.status(403).json({ error: 'You do not own this monitor.' });

    const onlyEnabled = Object.keys(req.body || {}).every((key) => key === 'enabled');
    let changes;

    if (onlyEnabled && Object.prototype.hasOwnProperty.call(req.body || {}, 'enabled')) {
      changes = { enabled: Boolean(req.body.enabled) };
    } else {
      const merged = {
        name: req.body?.name ?? current.name,
        type: req.body?.type ?? current.type,
        target: req.body?.target ?? current.target,
        port: Object.prototype.hasOwnProperty.call(req.body || {}, 'port') ? req.body.port : current.port,
        intervalSeconds: req.body?.intervalSeconds ?? current.intervalSeconds,
        timeoutSeconds: req.body?.timeoutSeconds ?? current.timeoutSeconds,
        site: req.body?.site ?? current.site,
        notes: req.body?.notes ?? current.notes,
      };
      changes = normalizeInput(merged);
      await validateTarget(changes);
      if (Object.prototype.hasOwnProperty.call(req.body || {}, 'enabled')) changes.enabled = Boolean(req.body.enabled);
    }

    const updated = store.updateMonitor(req.params.id, req.user.id, changes);
    const denied = notFoundOrDenied(updated, res);
    if (denied) return denied;

    if (updated.enabled !== false) {
      const checked = await runner.runMonitor(updated.id);
      if (
        req.body?.target !== undefined ||
        req.body?.type !== undefined ||
        req.body?.name !== undefined
      ) {
        scheduleDiscovery(checked || updated, req.user.id);
      }
      return res.json({ monitor: checked || updated });
    }
    return res.json({ monitor: updated });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Unable to update monitor.',
    });
  }
});

router.delete('/:id', requireAuth, (req, res) => {
  const removed = store.deleteMonitor(req.params.id, req.user.id);
  const denied = notFoundOrDenied(removed, res);
  if (denied) return denied;
  return res.json({ removed: true, monitor: removed });
});

router.post('/:id/discover', discoveryLimiter, requireAuth, async (req, res) => {
  try {
    const current = store.findById(req.params.id);
    if (!current) return res.status(404).json({ error: 'Monitor not found.' });
    if (current.ownerId !== req.user.id) return res.status(403).json({ error: 'You do not own this monitor.' });

    const updated = await discoverAndSave(current, req.user.id);
    return res.json({ monitor: updated });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Unable to discover device.',
    });
  }
});

router.post('/:id/check', manualCheckLimiter, requireAuth, async (req, res) => {
  const current = store.findById(req.params.id);
  if (!current) return res.status(404).json({ error: 'Monitor not found.' });
  if (current.ownerId !== req.user.id) return res.status(403).json({ error: 'You do not own this monitor.' });
  if (current.enabled === false) return res.status(409).json({ error: 'Monitor is paused.' });

  const checked = await runner.runMonitor(current.id);
  return res.json({ monitor: checked || current });
});

module.exports = router;
