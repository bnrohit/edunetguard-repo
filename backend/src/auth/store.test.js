const fs = require('fs');
const os = require('os');
const path = require('path');

describe('EduNetGuard invite accounts', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edunetguard-auth-'));
    process.env.USER_DATA_DIR = tempDir;
    process.env.USER_JOIN_CODE = 'viewer-secret-code';
    process.env.ADMIN_JOIN_CODE = 'admin-secret-code';
    process.env.AUTH_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    jest.resetModules();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    delete process.env.USER_DATA_DIR;
    delete process.env.USER_JOIN_CODE;
    delete process.env.ADMIN_JOIN_CODE;
    delete process.env.AUTH_SECRET;
    jest.resetModules();
  });

  test('creates viewer and admin accounts from separate join codes', () => {
    const store = require('./store');

    const viewer = store.createUser({
      username: 'teacher.one',
      password: 'Correct-Horse-123',
      inviteCode: 'viewer-secret-code',
    });

    const admin = store.createUser({
      username: 'network.admin',
      password: 'Admin-Pass-456',
      inviteCode: 'admin-secret-code',
    });

    expect(viewer.role).toBe('user');
    expect(admin.role).toBe('admin');
    expect(viewer.password).toBeUndefined();
    expect(store.authenticate('TEACHER.ONE', 'Correct-Horse-123').username).toBe('teacher.one');
    expect(store.authenticate('teacher.one', 'wrong-password')).toBeNull();
  });

  test('rejects an invalid join code and duplicate usernames', () => {
    const store = require('./store');

    expect(() => store.createUser({
      username: 'guest.user',
      password: 'Long-Password-123',
      inviteCode: 'wrong-code',
    })).toThrow('Invalid or expired join code.');

    store.createUser({
      username: 'guest.user',
      password: 'Long-Password-123',
      inviteCode: 'viewer-secret-code',
    });

    expect(() => store.createUser({
      username: 'GUEST.USER',
      password: 'Another-Password-456',
      inviteCode: 'viewer-secret-code',
    })).toThrow('already in use');
  });

  test('persists personal dashboard favorites', () => {
    const store = require('./store');
    const user = store.createUser({
      username: 'operator.user',
      password: 'Operator-Password-123',
      inviteCode: 'viewer-secret-code',
    });

    const updated = store.updatePreferences(user.id, {
      favoriteMonitorIds: [1, '2', 2, '3'],
    });

    expect(updated.preferences.favoriteMonitorIds).toEqual(['1', '2', '3']);
    expect(store.findUserById(user.id).preferences.favoriteMonitorIds).toEqual(['1', '2', '3']);
  });

  test('signs and verifies HttpOnly session tokens', () => {
    const session = require('./session');
    const token = session.createSession({
      id: 'user-1',
      username: 'viewer',
      role: 'user',
    });

    const decoded = session.verifySession(token);

    expect(decoded.sub).toBe('user-1');
    expect(decoded.username).toBe('viewer');
    expect(decoded.role).toBe('user');
    expect(session.cookieHeader(token)).toContain('HttpOnly');
    expect(session.cookieHeader(token)).toContain('SameSite=Lax');
  });
});
