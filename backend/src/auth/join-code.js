const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.USER_DATA_DIR || '/app/user-data';
const FILE = path.join(DATA_DIR, 'invite-secrets.json');

function encryptionKey() {
  const secret = process.env.AUTH_SECRET || '';
  if (secret.length < 32) {
    throw new Error('AUTH_SECRET must be configured before join-code management can be used.');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify({ version: 1, userJoinCode: null }, null, 2) + '\n', { mode: 0o600 });
  }
}

function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

function writeStore(store) {
  ensureStore();
  const temp = FILE + '.tmp-' + process.pid + '-' + Date.now();
  fs.writeFileSync(temp, JSON.stringify(store, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(temp, FILE);
}

function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

function decrypt(record) {
  if (!record?.iv || !record?.tag || !record?.ciphertext) return null;
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(record.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(record.tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(record.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

function safeEquals(a, b) {
  if (!a || !b) return false;
  const left = crypto.createHash('sha256').update(String(a)).digest();
  const right = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(left, right);
}

function ensureLegacyUserJoinCodeMigrated() {
  const store = readStore();
  if (store.userJoinCode) return store;

  const legacy = process.env.USER_JOIN_CODE;
  if (!legacy) return store;

  store.userJoinCode = {
    ...encrypt(legacy),
    updatedAt: new Date().toISOString(),
    source: 'legacy-env-migration',
  };
  writeStore(store);
  return store;
}

function getUserJoinCodeStatus() {
  const store = ensureLegacyUserJoinCodeMigrated();
  return {
    configured: Boolean(store.userJoinCode),
    updatedAt: store.userJoinCode?.updatedAt || null,
  };
}

function revealUserJoinCode() {
  const store = ensureLegacyUserJoinCodeMigrated();
  return decrypt(store.userJoinCode);
}

function matchesUserJoinCode(candidate) {
  const current = revealUserJoinCode();
  return safeEquals(candidate, current);
}

function rotateUserJoinCode() {
  const code = 'EDU-' + crypto.randomBytes(15).toString('base64url');
  const store = readStore();
  store.userJoinCode = {
    ...encrypt(code),
    updatedAt: new Date().toISOString(),
    source: 'admin-rotation',
  };
  writeStore(store);
  return {
    code,
    updatedAt: store.userJoinCode.updatedAt,
  };
}

module.exports = {
  getUserJoinCodeStatus,
  revealUserJoinCode,
  matchesUserJoinCode,
  rotateUserJoinCode,
};
