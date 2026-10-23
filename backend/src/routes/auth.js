const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const {
  createUser,
  authenticate,
  findUserById,
  updatePreferences,
  listUsers,
  registrationEnabled,
} = require('../auth/store');
const {
  COOKIE_NAME,
  createSession,
  verifySession,
  parseCookies,
  cookieHeader,
  clearCookieHeader,
} = require('../auth/session');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Try again later.' },
});

function currentUser(req) {
  try {
    const token = parseCookies(req)[COOKIE_NAME];
    const session = verifySession(token);
    if (!session) return null;
    return findUserById(session.sub);
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Administrator access required.' });
  req.user = user;
  next();
}

router.get('/config', (req, res) => {
  res.json({
    registration_enabled: registrationEnabled(),
    password_min_length: 10,
    username_pattern: 'letters, numbers, dot, underscore, dash',
  });
});

router.post('/register', authLimiter, (req, res) => {
  try {
    const user = createUser({
      username: req.body?.username,
      password: req.body?.password,
      inviteCode: req.body?.join_code,
    });
    res.setHeader('Set-Cookie', cookieHeader(createSession(user)));
    return res.status(201).json({ user });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Unable to create account.',
    });
  }
});

router.post('/login', authLimiter, (req, res) => {
  try {
    const user = authenticate(req.body?.username, req.body?.password);
    if (!user) return res.status(401).json({ error: 'Invalid username or password.' });
    res.setHeader('Set-Cookie', cookieHeader(createSession(user)));
    return res.json({ user });
  } catch {
    return res.status(503).json({ error: 'Authentication is not configured correctly.' });
  }
});

router.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', clearCookieHeader());
  res.json({ status: 'signed_out' });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.patch('/preferences', requireAuth, (req, res) => {
  const user = updatePreferences(req.user.id, req.body || {});
  if (!user) return res.status(404).json({ error: 'User not found.' });
  return res.json({ user });
});

router.get('/users', requireAdmin, (req, res) => {
  const users = listUsers().map((user) => ({
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
  }));
  res.json({ users });
});

module.exports = {
  router,
  requireAuth,
  requireAdmin,
};
