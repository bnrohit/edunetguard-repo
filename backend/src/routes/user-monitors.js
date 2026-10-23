const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const { requireAuth, requireAdmin } = require('./auth');
const store = require('../monitoring/user-monitor-store');
const runner = require('../monitoring/user-monitor-runner');
const {
  MAX_PER_USER,
  normalizeInput,
  validateTarget,
  policySummary,
} = require('../monitoring/user-monitor-policy');

const manualCheckLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many manual monitor checks. Try again shortly.' },
});

function notFoundOrDenied(result, res) {
  if (result === false) return res.status(403).json({ error: 'You do not own this monitor.' });
  if (result === null) return res.status(404).json({ error: 'Monitor not found.' });
  return null;
}

router.get('/policy', requireAuth, (req, res) => {
  res.json(policySummary());
});

router.get('/admin/all', requireAdmin, (req, res) => {
  res.json({ monitors: store.listAll(), policy: policySummary() });
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
    return res.status(201).json({ monitor: checked || monitor });
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

router.post('/:id/check', manualCheckLimiter, requireAuth, async (req, res) => {
  const current = store.findById(req.params.id);
  if (!current) return res.status(404).json({ error: 'Monitor not found.' });
  if (current.ownerId !== req.user.id) return res.status(403).json({ error: 'You do not own this monitor.' });
  if (current.enabled === false) return res.status(409).json({ error: 'Monitor is paused.' });

  const checked = await runner.runMonitor(current.id);
  return res.json({ monitor: checked || current });
});

module.exports = router;
