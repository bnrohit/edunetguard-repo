const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.USER_DATA_DIR || '/app/user-data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ version: 1, users: [] }, null, 2) + '\n', { mode: 0o600 });
  }
}

function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function writeStore(store) {
  ensureStore();
  const temp = USERS_FILE + '.tmp-' + process.pid + '-' + Date.now();
  fs.writeFileSync(temp, JSON.stringify(store, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(temp, USERS_FILE);
}

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function validateUsername(value) {
  const display = String(value || '').trim();
  if (!/^[A-Za-z0-9._-]{3,32}$/.test(display)) {
    return { ok: false, error: 'Username must be 3-32 characters using letters, numbers, dot, underscore, or dash.' };
  }
  return { ok: true, display, key: normalizeUsername(display) };
}

function validatePassword(value) {
  const password = String(value || '');
  if (password.length < 10 || password.length > 200) {
    return { ok: false, error: 'Password must be between 10 and 200 characters.' };
  }
  return { ok: true, password };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { algorithm: 'scrypt', salt, hash };
}

function verifyPassword(password, record) {
  if (!record?.salt || !record?.hash) return false;
  const actual = crypto.scryptSync(String(password || ''), record.salt, 64);
  const expected = Buffer.from(record.hash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function safeSecretEquals(a, b) {
  if (!a || !b) return false;
  const left = crypto.createHash('sha256').update(String(a)).digest();
  const right = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(left, right);
}

function inviteRole(code) {
  const adminCode = process.env.ADMIN_JOIN_CODE;
  const userCode = process.env.USER_JOIN_CODE;

  if (adminCode && safeSecretEquals(code, adminCode)) return 'admin';
  if (userCode && safeSecretEquals(code, userCode)) return 'user';
  return null;
}

function registrationEnabled() {
  return Boolean(process.env.USER_JOIN_CODE || process.env.ADMIN_JOIN_CODE);
}

function createUser({ username, password, inviteCode }) {
  const usernameCheck = validateUsername(username);
  if (!usernameCheck.ok) throw Object.assign(new Error(usernameCheck.error), { statusCode: 400 });

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.ok) throw Object.assign(new Error(passwordCheck.error), { statusCode: 400 });

  const role = inviteRole(inviteCode);
  if (!role) throw Object.assign(new Error('Invalid or expired join code.'), { statusCode: 403 });

  const store = readStore();
  if (store.users.some((user) => user.usernameKey === usernameCheck.key)) {
    throw Object.assign(new Error('That username is already in use.'), { statusCode: 409 });
  }

  const user = {
    id: crypto.randomUUID(),
    username: usernameCheck.display,
    usernameKey: usernameCheck.key,
    role,
    password: hashPassword(passwordCheck.password),
    preferences: {
      favoriteMonitorIds: [],
    },
    createdAt: new Date().toISOString(),
  };

  store.users.push(user);
  writeStore(store);
  return sanitizeUser(user);
}

function authenticate(username, password) {
  const store = readStore();
  const key = normalizeUsername(username);
  const user = store.users.find((candidate) => candidate.usernameKey === key);
  if (!user || !verifyPassword(password, user.password)) return null;
  return sanitizeUser(user);
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    preferences: {
      favoriteMonitorIds: Array.isArray(user.preferences?.favoriteMonitorIds)
        ? user.preferences.favoriteMonitorIds.map(String)
        : [],
    },
    createdAt: user.createdAt,
  };
}

function findUserById(id) {
  const store = readStore();
  return sanitizeUser(store.users.find((user) => user.id === id));
}

function updatePreferences(id, preferences) {
  const store = readStore();
  const user = store.users.find((candidate) => candidate.id === id);
  if (!user) return null;

  const ids = Array.isArray(preferences?.favoriteMonitorIds)
    ? Array.from(new Set(preferences.favoriteMonitorIds.map(String))).slice(0, 250)
    : [];

  user.preferences = { favoriteMonitorIds: ids };
  user.updatedAt = new Date().toISOString();
  writeStore(store);
  return sanitizeUser(user);
}

function listUsers() {
  const store = readStore();
  return store.users.map(sanitizeUser);
}

module.exports = {
  createUser,
  authenticate,
  findUserById,
  updatePreferences,
  listUsers,
  registrationEnabled,
  safeSecretEquals,
};
