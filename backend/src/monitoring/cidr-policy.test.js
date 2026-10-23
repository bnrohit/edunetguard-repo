const fs = require('fs');
const os = require('os');
const path = require('path');

describe('administrator private CIDR policy', () => {
  let dir;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'edunetguard-cidr-'));
    process.env.USER_DATA_DIR = dir;
    process.env.USER_MONITOR_ALLOWED_CIDRS = '10.128.0.0/16';
    jest.resetModules();
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    delete process.env.USER_DATA_DIR;
    delete process.env.USER_MONITOR_ALLOWED_CIDRS;
    jest.resetModules();
  });
  test('reads .env defaults until the admin saves a policy', () => {
    const cidr = require('./cidr-policy');
    expect(cidr.policySource()).toBe('environment');
    expect(cidr.isApprovedPrivateIp('10.128.10.151')).toBe(true);
    expect(cidr.isApprovedPrivateIp('10.250.25.61')).toBe(false);
  });
  test('persists changed allowlist across module reload and supports revocation', () => {
    let cidr = require('./cidr-policy');
    expect(cidr.saveAllowedCidrs(['10.250.32.0/24', '10.250.32.70'], 'test-admin')).toEqual([
      '10.250.32.0/24', '10.250.32.70/32',
    ]);
    jest.resetModules();
    cidr = require('./cidr-policy');
    expect(cidr.policySource()).toBe('admin-dashboard');
    expect(cidr.isApprovedPrivateIp('10.128.10.151')).toBe(false);
    expect(cidr.isApprovedPrivateIp('10.250.32.70')).toBe(true);
    cidr.saveAllowedCidrs([], 'test-admin');
    expect(cidr.isApprovedPrivateIp('10.250.32.70')).toBe(false);
    expect(cidr.getAllowedCidrs()).toEqual([]);
  });
  test('rejects CIDRs that could authorize public or loopback addresses', () => {
    const cidr = require('./cidr-policy');
    for (const value of [
      '0.0.0.0/0', '10.0.0.0/7', '11.1.0.0/16',
      '127.0.0.0/8', '169.254.0.0/16', '192.168.0.0/15', 'not-an-ip',
    ]) {
      expect(() => cidr.saveAllowedCidrs([value], 'admin')).toThrow();
    }
  });
  test('normalizes host CIDRs and rejects invalid IPv4 and oversized policies', () => {
    const cidr = require('./cidr-policy');
    expect(cidr.validateCidrs(['10.250.32.70', '10.250.32.70/32'])).toEqual(['10.250.32.70/32']);
    expect(() => cidr.validateCidrs(['10.999.1.1/24'])).toThrow();
    expect(() => cidr.validateCidrs(Array(65).fill('10.0.0.0/8'))).toThrow();
  });
  test('runtime resolver honors latest saved policy', async () => {
    const cidr = require('./cidr-policy');
    const policy = require('./user-monitor-policy');
    await expect(policy.resolveAllowedTarget('10.128.10.100')).resolves.toMatchObject({ family: 4 });
    cidr.saveAllowedCidrs(['10.250.32.0/24'], 'admin');
    await expect(policy.resolveAllowedTarget('10.128.10.100')).rejects.toThrow('administrator-approved CIDRs');
    await expect(policy.resolveAllowedTarget('10.250.32.70')).resolves.toMatchObject({ family: 4 });
    await expect(policy.resolveAllowedTarget('127.0.0.1')).rejects.toThrow('blocked');
    await expect(policy.resolveAllowedTarget('::ffff:127.0.0.1')).rejects.toThrow();
  });
  test('corrupt saved policies fail closed, not open to environment defaults', () => {
    const cidr = require('./cidr-policy');
    fs.writeFileSync(path.join(dir, 'monitor-allowlist.json'), '{broken');
    expect(() => cidr.getAllowedCidrs()).toThrow();
  });
});
