const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.USER_DATA_DIR || '/app/user-data';
const FILE = path.join(DATA_DIR, 'user-monitors.json');
const HISTORY_LIMIT = Math.max(20, parseInt(process.env.USER_MONITOR_HISTORY_LIMIT || '120', 10));

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify({ version: 1, monitors: [] }, null, 2) + '\n', { mode: 0o600 });
  }
}

function readStore() {
  ensureStore();
  const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  if (!Array.isArray(parsed.monitors)) parsed.monitors = [];
  return parsed;
}

function writeStore(store) {
  ensureStore();
  const temp = FILE + '.tmp-' + process.pid + '-' + Date.now();
  fs.writeFileSync(temp, JSON.stringify(store, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(temp, FILE);
}

function sanitizeMonitor(monitor) {
  return {
    id: monitor.id,
    ownerId: monitor.ownerId,
    ownerUsername: monitor.ownerUsername,
    name: monitor.name,
    type: monitor.type,
    target: monitor.target,
    port: monitor.port ?? null,
    intervalSeconds: monitor.intervalSeconds,
    timeoutSeconds: monitor.timeoutSeconds,
    enabled: monitor.enabled !== false,
    createdAt: monitor.createdAt,
    updatedAt: monitor.updatedAt,
    lastCheckAt: monitor.lastCheckAt || null,
    nextCheckAt: monitor.nextCheckAt || null,
    status: monitor.status || 'pending',
    lastResult: monitor.lastResult || null,
    history: Array.isArray(monitor.history) ? monitor.history : [],
  };
}

function listByOwner(ownerId) {
  return readStore().monitors
    .filter((monitor) => monitor.ownerId === ownerId)
    .map(sanitizeMonitor);
}

function listAll() {
  return readStore().monitors.map(sanitizeMonitor);
}

function findById(id) {
  const monitor = readStore().monitors.find((candidate) => candidate.id === id);
  return monitor ? sanitizeMonitor(monitor) : null;
}

function createMonitor(owner, input) {
  const store = readStore();
  const now = new Date().toISOString();
  const monitor = {
    id: crypto.randomUUID(),
    ownerId: owner.id,
    ownerUsername: owner.username,
    name: input.name,
    type: input.type,
    target: input.target,
    port: input.port ?? null,
    intervalSeconds: input.intervalSeconds,
    timeoutSeconds: input.timeoutSeconds,
    enabled: true,
    createdAt: now,
    updatedAt: now,
    lastCheckAt: null,
    nextCheckAt: now,
    status: 'pending',
    lastResult: null,
    history: [],
  };
  store.monitors.push(monitor);
  writeStore(store);
  return sanitizeMonitor(monitor);
}

function updateMonitor(id, ownerId, changes, allowAdmin = false) {
  const store = readStore();
  const monitor = store.monitors.find((candidate) => candidate.id === id);
  if (!monitor) return null;
  if (!allowAdmin && monitor.ownerId !== ownerId) return false;

  for (const key of ['name', 'type', 'target', 'port', 'intervalSeconds', 'timeoutSeconds', 'enabled']) {
    if (Object.prototype.hasOwnProperty.call(changes, key)) monitor[key] = changes[key];
  }

  monitor.updatedAt = new Date().toISOString();
  monitor.nextCheckAt = monitor.enabled === false ? null : new Date().toISOString();
  if (monitor.enabled !== false && changes.enabled === true) monitor.status = 'pending';
  writeStore(store);
  return sanitizeMonitor(monitor);
}

function deleteMonitor(id, ownerId, allowAdmin = false) {
  const store = readStore();
  const index = store.monitors.findIndex((candidate) => candidate.id === id);
  if (index === -1) return null;
  if (!allowAdmin && store.monitors[index].ownerId !== ownerId) return false;

  const [removed] = store.monitors.splice(index, 1);
  writeStore(store);
  return sanitizeMonitor(removed);
}

function recordResult(id, result, completedAt = new Date()) {
  const store = readStore();
  const monitor = store.monitors.find((candidate) => candidate.id === id);
  if (!monitor) return null;

  const completedIso = completedAt.toISOString();
  const compact = {
    status: result.status,
    responseTimeMs: result.responseTimeMs ?? null,
    message: result.message || null,
    checkedAt: completedIso,
  };

  monitor.status = result.status;
  monitor.lastResult = compact;
  monitor.lastCheckAt = completedIso;
  monitor.nextCheckAt = monitor.enabled === false
    ? null
    : new Date(completedAt.getTime() + (monitor.intervalSeconds * 1000)).toISOString();
  monitor.history = Array.isArray(monitor.history) ? monitor.history : [];
  monitor.history.push(compact);
  if (monitor.history.length > HISTORY_LIMIT) {
    monitor.history = monitor.history.slice(-HISTORY_LIMIT);
  }

  writeStore(store);
  return sanitizeMonitor(monitor);
}

function dueMonitors(now = new Date()) {
  const timestamp = now.getTime();
  return readStore().monitors
    .filter((monitor) => monitor.enabled !== false)
    .filter((monitor) => {
      if (!monitor.nextCheckAt) return true;
      const next = Date.parse(monitor.nextCheckAt);
      return !Number.isFinite(next) || next <= timestamp;
    })
    .map(sanitizeMonitor);
}

module.exports = {
  listByOwner,
  listAll,
  findById,
  createMonitor,
  updateMonitor,
  deleteMonitor,
  recordResult,
  dueMonitors,
};
