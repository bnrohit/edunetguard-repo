const dns = require('dns').promises;
const net = require('net');

const MAX_PER_USER = Math.max(1, parseInt(process.env.USER_MONITOR_MAX_PER_USER || '20', 10));
const MIN_INTERVAL = Math.max(30, parseInt(process.env.USER_MONITOR_MIN_INTERVAL_SECONDS || '30', 10));
const MAX_INTERVAL = Math.max(MIN_INTERVAL, parseInt(process.env.USER_MONITOR_MAX_INTERVAL_SECONDS || '86400', 10));
const DEFAULT_TIMEOUT = Math.max(2, parseInt(process.env.USER_MONITOR_DEFAULT_TIMEOUT_SECONDS || '10', 10));
const MAX_TIMEOUT = Math.max(DEFAULT_TIMEOUT, parseInt(process.env.USER_MONITOR_MAX_TIMEOUT_SECONDS || '30', 10));
const ALLOW_PUBLIC = process.env.USER_MONITOR_ALLOW_PUBLIC_TARGETS !== 'false';

const ALLOWED_CIDRS = String(process.env.USER_MONITOR_ALLOWED_CIDRS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

function ipv4ToInt(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return (((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0;
}

function ipv4InCidr(ip, cidr) {
  const [network, prefixText] = cidr.split('/');
  const prefix = Number(prefixText);
  const ipInt = ipv4ToInt(ip);
  const networkInt = ipv4ToInt(network);
  if (ipInt === null || networkInt === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (networkInt & mask);
}

function isPrivateIpv4(ip) {
  return ipv4InCidr(ip, '10.0.0.0/8') ||
    ipv4InCidr(ip, '172.16.0.0/12') ||
    ipv4InCidr(ip, '192.168.0.0/16') ||
    ipv4InCidr(ip, '100.64.0.0/10');
}

function isBlockedIpv4(ip) {
  return ipv4InCidr(ip, '0.0.0.0/8') ||
    ipv4InCidr(ip, '127.0.0.0/8') ||
    ipv4InCidr(ip, '169.254.0.0/16') ||
    ipv4InCidr(ip, '224.0.0.0/4') ||
    ipv4InCidr(ip, '240.0.0.0/4');
}

function allowedPrivateIpv4(ip) {
  return ALLOWED_CIDRS.some((cidr) => ipv4InCidr(ip, cidr));
}

function isPrivateAddress(address) {
  const family = net.isIP(address);
  if (family === 4) return isPrivateIpv4(address);
  if (family === 6) {
    const value = address.toLowerCase();
    return value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe80:') || value === '::1';
  }
  return false;
}

function isBlockedIpv6(ip) {
  const value = ip.toLowerCase();
  return value === '::' ||
    value === '::1' ||
    value.startsWith('fe80:') ||
    value.startsWith('ff') ||
    value.startsWith('fc') ||
    value.startsWith('fd');
}

function assertAddressAllowed(address) {
  const family = net.isIP(address);
  if (!family) throw Object.assign(new Error('Target did not resolve to a valid IP address.'), { statusCode: 400 });

  if (family === 4) {
    if (isBlockedIpv4(address)) {
      throw Object.assign(new Error('This target address is blocked by the monitoring policy.'), { statusCode: 403 });
    }
    if (isPrivateIpv4(address) && !allowedPrivateIpv4(address)) {
      throw Object.assign(new Error('This private address is not in USER_MONITOR_ALLOWED_CIDRS.'), { statusCode: 403 });
    }
    if (!isPrivateIpv4(address) && !ALLOW_PUBLIC) {
      throw Object.assign(new Error('Public monitoring targets are disabled by the administrator.'), { statusCode: 403 });
    }
    return true;
  }

  if (isBlockedIpv6(address)) {
    throw Object.assign(new Error('Private, loopback, link-local, and multicast IPv6 targets are blocked.'), { statusCode: 403 });
  }
  if (!ALLOW_PUBLIC) {
    throw Object.assign(new Error('Public monitoring targets are disabled by the administrator.'), { statusCode: 403 });
  }
  return true;
}

async function resolveAllowedTarget(hostname) {
  const host = String(hostname || '').trim();
  if (!host || host.length > 253) throw Object.assign(new Error('A valid target is required.'), { statusCode: 400 });
  if (host.toLowerCase() === 'localhost' || host.toLowerCase().endsWith('.localhost')) {
    throw Object.assign(new Error('localhost targets are not allowed.'), { statusCode: 403 });
  }

  if (net.isIP(host)) {
    assertAddressAllowed(host);
    return { address: host, family: net.isIP(host), hostname: host };
  }

  let records;
  try {
    records = await dns.lookup(host, { all: true, verbatim: true });
  } catch {
    throw Object.assign(new Error('Target hostname could not be resolved.'), { statusCode: 400 });
  }

  if (!records.length) throw Object.assign(new Error('Target hostname did not resolve to any address.'), { statusCode: 400 });
  records.forEach((record) => assertAddressAllowed(record.address));
  return { ...records[0], hostname: host };
}

function normalizeInput(input) {
  const type = String(input?.type || '').toLowerCase();
  if (!['http', 'ping', 'tcp', 'dns'].includes(type)) {
    throw Object.assign(new Error('Monitor type must be http, ping, tcp, or dns.'), { statusCode: 400 });
  }

  const name = String(input?.name || '').trim();
  if (name.length < 2 || name.length > 80) {
    throw Object.assign(new Error('Monitor name must be between 2 and 80 characters.'), { statusCode: 400 });
  }

  let target = String(input?.target || '').trim();
  let port = input?.port === '' || input?.port === null || input?.port === undefined ? null : Number(input.port);

  if (type === 'http') {
    let parsed;
    try {
      parsed = new URL(target);
    } catch {
      throw Object.assign(new Error('HTTP monitor target must be a valid http:// or https:// URL.'), { statusCode: 400 });
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw Object.assign(new Error('Only HTTP and HTTPS URLs are supported.'), { statusCode: 400 });
    }
    if (parsed.username || parsed.password) {
      throw Object.assign(new Error('Credentials in monitor URLs are not allowed.'), { statusCode: 400 });
    }
    target = parsed.toString();
    port = null;
  } else {
    if (!target || target.length > 253 || /[\s/]/.test(target)) {
      throw Object.assign(new Error('Target must be a hostname or IP address.'), { statusCode: 400 });
    }
  }

  if (type === 'tcp') {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw Object.assign(new Error('TCP monitors require a port between 1 and 65535.'), { statusCode: 400 });
    }
  } else {
    port = null;
  }

  const intervalSeconds = Number(input?.intervalSeconds || 60);
  if (!Number.isInteger(intervalSeconds) || intervalSeconds < MIN_INTERVAL || intervalSeconds > MAX_INTERVAL) {
    throw Object.assign(new Error(`Interval must be between ${MIN_INTERVAL} and ${MAX_INTERVAL} seconds.`), { statusCode: 400 });
  }

  const timeoutSeconds = Number(input?.timeoutSeconds || DEFAULT_TIMEOUT);
  if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 2 || timeoutSeconds > MAX_TIMEOUT) {
    throw Object.assign(new Error(`Timeout must be between 2 and ${MAX_TIMEOUT} seconds.`), { statusCode: 400 });
  }

  return { name, type, target, port, intervalSeconds, timeoutSeconds };
}

async function validateTarget(normalized) {
  if (normalized.type === 'http') {
    const parsed = new URL(normalized.target);
    await resolveAllowedTarget(parsed.hostname);
  } else {
    await resolveAllowedTarget(normalized.target);
  }
  return normalized;
}

function policySummary() {
  return {
    allowedTypes: ['http', 'ping', 'tcp', 'dns'],
    maxPerUser: MAX_PER_USER,
    minIntervalSeconds: MIN_INTERVAL,
    maxIntervalSeconds: MAX_INTERVAL,
    defaultTimeoutSeconds: DEFAULT_TIMEOUT,
    maxTimeoutSeconds: MAX_TIMEOUT,
    publicTargetsAllowed: ALLOW_PUBLIC,
    allowedPrivateCidrs: ALLOWED_CIDRS,
  };
}

module.exports = {
  MAX_PER_USER,
  normalizeInput,
  validateTarget,
  resolveAllowedTarget,
  policySummary,
  isPrivateAddress,
};
