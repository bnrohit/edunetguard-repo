const axios = require('axios');
const dns = require('dns').promises;
const http = require('http');
const https = require('https');
const net = require('net');
const { spawn } = require('child_process');
const store = require('./user-monitor-store');
const { resolveAllowedTarget } = require('./user-monitor-policy');

const running = new Set();
let scheduler = null;

function elapsedMs(start) {
  return Math.max(0, Math.round(Number(process.hrtime.bigint() - start) / 1e6));
}

async function checkHttp(monitor) {
  const parsed = new URL(monitor.target);
  const resolved = await resolveAllowedTarget(parsed.hostname);
  const lookup = (hostname, options, callback) => callback(null, resolved.address, resolved.family);
  const httpAgent = new http.Agent({ lookup });
  const httpsAgent = new https.Agent({ lookup });

  const start = process.hrtime.bigint();
  const response = await axios.get(monitor.target, {
    timeout: monitor.timeoutSeconds * 1000,
    maxRedirects: 0,
    proxy: false, // Do not let HTTP(S)_PROXY bypass the target's validated and pinned DNS address.
    responseType: 'stream', // A status check must not download unbounded website content.
    validateStatus: () => true,
    httpAgent,
    httpsAgent,
    headers: {
      'User-Agent': 'EduNetGuard-UserMonitor/0.6',
      Accept: '*/*',
    },
  });
  const ms = elapsedMs(start);
  response.data?.destroy?.();
  const ok = response.status >= 200 && response.status < 400;
  return {
    status: ok ? 'up' : 'down',
    responseTimeMs: ms,
    message: `HTTP ${response.status}`,
  };
}

async function checkTcp(monitor) {
  const resolved = await resolveAllowedTarget(monitor.target);
  const start = process.hrtime.bigint();

  return new Promise((resolve) => {
    const socket = net.createConnection({
      host: resolved.address,
      port: monitor.port,
      timeout: monitor.timeoutSeconds * 1000,
    });

    const finish = (result) => {
      socket.destroy();
      resolve(result);
    };

    socket.once('connect', () => finish({
      status: 'up',
      responseTimeMs: elapsedMs(start),
      message: `TCP ${monitor.port} accepted connection`,
    }));
    socket.once('timeout', () => finish({
      status: 'down',
      responseTimeMs: elapsedMs(start),
      message: `TCP ${monitor.port} timed out`,
    }));
    socket.once('error', (error) => finish({
      status: 'down',
      responseTimeMs: elapsedMs(start),
      message: error.code || error.message,
    }));
  });
}

async function checkPing(monitor) {
  const resolved = await resolveAllowedTarget(monitor.target);
  const timeout = Math.max(1, Math.ceil(monitor.timeoutSeconds));
  const start = process.hrtime.bigint();

  return new Promise((resolve) => {
    const child = spawn('ping', ['-n', '-c', '1', '-W', String(timeout), resolved.address], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    const killTimer = setTimeout(() => child.kill('SIGKILL'), (monitor.timeoutSeconds + 2) * 1000);

    child.once('error', (error) => {
      clearTimeout(killTimer);
      resolve({ status: 'down', responseTimeMs: elapsedMs(start), message: error.message });
    });

    child.once('close', (code) => {
      clearTimeout(killTimer);
      resolve({
        status: code === 0 ? 'up' : 'down',
        responseTimeMs: elapsedMs(start),
        message: code === 0 ? 'ICMP reply received' : (stderr.trim() || 'No ICMP reply'),
      });
    });
  });
}

async function checkDns(monitor) {
  await resolveAllowedTarget(monitor.target);
  const start = process.hrtime.bigint();

  try {
    const result = await Promise.race([
      dns.resolveAny(monitor.target),
      new Promise((_, reject) => setTimeout(
        () => reject(new Error('DNS query timed out')),
        monitor.timeoutSeconds * 1000
      )),
    ]);
    return {
      status: result.length ? 'up' : 'down',
      responseTimeMs: elapsedMs(start),
      message: result.length ? `Resolved ${result.length} record(s)` : 'No DNS records returned',
    };
  } catch (error) {
    return {
      status: 'down',
      responseTimeMs: elapsedMs(start),
      message: error.code || error.message,
    };
  }
}

async function performCheck(monitor) {
  if (monitor.type === 'http') return checkHttp(monitor);
  if (monitor.type === 'tcp') return checkTcp(monitor);
  if (monitor.type === 'ping') return checkPing(monitor);
  if (monitor.type === 'dns') return checkDns(monitor);
  return { status: 'down', responseTimeMs: null, message: 'Unsupported monitor type' };
}

async function runMonitor(id) {
  if (running.has(id)) return store.findById(id);
  const monitor = store.findById(id);
  if (!monitor || monitor.enabled === false) return monitor;

  running.add(id);
  try {
    let result;
    try {
      result = await performCheck(monitor);
    } catch (error) {
      result = {
        status: 'down',
        responseTimeMs: null,
        message: error.message || 'Monitor check failed',
      };
    }
    return store.recordResult(id, result);
  } finally {
    running.delete(id);
  }
}

async function tick() {
  const due = store.dueMonitors();
  await Promise.allSettled(due.map((monitor) => runMonitor(monitor.id)));
}

function startScheduler() {
  if (scheduler) return;
  setTimeout(() => tick().catch((error) => console.error('User monitor initial tick failed:', error)), 1500);
  scheduler = setInterval(() => {
    tick().catch((error) => console.error('User monitor scheduler failed:', error));
  }, 5000);
  scheduler.unref?.();
}

module.exports = {
  runMonitor,
  startScheduler,
};
