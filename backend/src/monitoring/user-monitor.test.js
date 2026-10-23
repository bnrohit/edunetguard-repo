const fs = require('fs');
const os = require('os');
const path = require('path');

describe('EduNetGuard user-owned monitoring', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edunetguard-monitors-'));
    process.env.USER_DATA_DIR = tempDir;
    process.env.USER_MONITOR_MAX_PER_USER = '20';
    process.env.USER_MONITOR_MIN_INTERVAL_SECONDS = '30';
    process.env.USER_MONITOR_MAX_INTERVAL_SECONDS = '86400';
    process.env.USER_MONITOR_ALLOWED_CIDRS = '10.128.0.0/16,10.250.0.0/16';
    process.env.USER_MONITOR_ALLOW_PUBLIC_TARGETS = 'true';
    jest.resetModules();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    for (const key of [
      'USER_DATA_DIR',
      'USER_MONITOR_MAX_PER_USER',
      'USER_MONITOR_MIN_INTERVAL_SECONDS',
      'USER_MONITOR_MAX_INTERVAL_SECONDS',
      'USER_MONITOR_ALLOWED_CIDRS',
      'USER_MONITOR_ALLOW_PUBLIC_TARGETS',
    ]) delete process.env[key];
    jest.resetModules();
  });

  test('normalizes supported monitor inputs and enforces interval policy', () => {
    const policy = require('./user-monitor-policy');

    expect(policy.normalizeInput({
      name: 'Website',
      type: 'http',
      target: 'https://example.org',
      intervalSeconds: 60,
      timeoutSeconds: 10,
    })).toMatchObject({
      name: 'Website',
      type: 'http',
      target: 'https://example.org/',
      port: null,
      intervalSeconds: 60,
    });

    expect(() => policy.normalizeInput({
      name: 'Too Fast',
      type: 'ping',
      target: '10.128.10.10',
      intervalSeconds: 5,
      timeoutSeconds: 5,
    })).toThrow('Interval must be between 30 and 86400 seconds.');
  });

  test('allows configured private ranges and blocks unapproved private/loopback targets', async () => {
    const policy = require('./user-monitor-policy');

    await expect(policy.resolveAllowedTarget('10.128.10.10')).resolves.toMatchObject({
      address: '10.128.10.10',
    });

    await expect(policy.resolveAllowedTarget('10.250.25.61')).resolves.toMatchObject({
      address: '10.250.25.61',
    });

    await expect(policy.resolveAllowedTarget('10.64.1.1')).rejects.toThrow('not in the administrator-approved CIDRs');
    await expect(policy.resolveAllowedTarget('127.0.0.1')).rejects.toThrow('blocked by the monitoring policy');
  });

  test('stores monitors by owner and prevents cross-user mutation', () => {
    const store = require('./user-monitor-store');

    const owner = { id: 'user-a', username: 'alice' };
    const monitor = store.createMonitor(owner, {
      name: 'Alice Website',
      type: 'http',
      target: 'https://example.org/',
      port: null,
      intervalSeconds: 60,
      timeoutSeconds: 10,
    });

    expect(store.listByOwner('user-a')).toHaveLength(1);
    expect(store.listByOwner('user-b')).toHaveLength(0);
    expect(store.updateMonitor(monitor.id, 'user-b', { enabled: false })).toBe(false);

    const paused = store.updateMonitor(monitor.id, 'user-a', { enabled: false });
    expect(paused.enabled).toBe(false);

    const removed = store.deleteMonitor(monitor.id, 'user-a');
    expect(removed.id).toBe(monitor.id);
    expect(store.listAll()).toHaveLength(0);
  });

  test('records bounded status history and next-check scheduling', () => {
    const store = require('./user-monitor-store');
    const monitor = store.createMonitor({ id: 'user-a', username: 'alice' }, {
      name: 'Ping Test',
      type: 'ping',
      target: '10.128.10.10',
      port: null,
      intervalSeconds: 60,
      timeoutSeconds: 5,
    });

    const checked = store.recordResult(monitor.id, {
      status: 'up',
      responseTimeMs: 12,
      message: 'ICMP reply received',
    }, new Date('2026-10-23T18:00:00Z'));

    expect(checked.status).toBe('up');
    expect(checked.lastResult.responseTimeMs).toBe(12);
    expect(checked.history).toHaveLength(1);
    expect(checked.nextCheckAt).toBe('2026-10-23T18:01:00.000Z');
  });
});
