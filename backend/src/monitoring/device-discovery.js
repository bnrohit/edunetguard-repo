const dns = require('dns').promises;
const http = require('http');
const https = require('https');
const net = require('net');
const { spawn } = require('child_process');
const { resolveAllowedTarget, isPrivateAddress } = require('./user-monitor-policy');

const DISCOVERY_PORTS = '22,23,53,80,135,139,389,443,445,515,548,554,631,636,902,3389,5480,5900,8000,8006,8080,8291,8443,9100,9443';
const NMAP_TIMEOUT_SECONDS = Math.max(8, parseInt(process.env.USER_MONITOR_DISCOVERY_TIMEOUT_SECONDS || '20', 10));

function targetHost(monitor) {
  if (monitor.type === 'http') return new URL(monitor.target).hostname;
  return monitor.target;
}

async function reverseDns(address) {
  try {
    const names = await dns.reverse(address);
    return names.slice(0, 5);
  } catch {
    return [];
  }
}

function parseGreppable(output) {
  const hostLine = String(output || '').split('\n').find((line) => line.startsWith('Host:') && line.includes('Ports:'));
  if (!hostLine) return [];

  const portsPart = hostLine.split('Ports:')[1]?.split('Ignored State:')[0] || '';
  return portsPart.split(',')
    .map((entry) => entry.trim())
    .map((entry) => {
      const fields = entry.split('/');
      if (fields.length < 5 || fields[1] !== 'open') return null;
      return {
        port: Number(fields[0]),
        protocol: fields[2] || 'tcp',
        service: fields[4] || 'unknown',
        product: (fields[6] || '').trim() || null,
      };
    })
    .filter(Boolean);
}

async function nmapFingerprint(address) {
  if (!isPrivateAddress(address)) {
    return { skipped: true, reason: 'Public targets use passive DNS/HTTP/TLS discovery only.', ports: [] };
  }

  return new Promise((resolve) => {
    const args = [
      '-Pn',
      '-sT',
      '-sV',
      '--version-light',
      '-T3',
      '-p', DISCOVERY_PORTS,
      '--host-timeout', NMAP_TIMEOUT_SECONDS + 's',
      '-oG', '-',
      address,
    ];

    const child = spawn('nmap', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, LANG: 'C', LC_ALL: 'C' },
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    let killTimer = null;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      if (killTimer) clearTimeout(killTimer);
      resolve(value);
    };

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      if (stdout.length > 128 * 1024) stdout = stdout.slice(-128 * 1024);
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 16 * 1024) stderr = stderr.slice(-16 * 1024);
    });
    child.once('error', (error) => finish({ skipped: true, reason: error.message, ports: [] }));
    child.once('close', () => finish({
      skipped: false,
      reason: stderr.trim() || null,
      ports: parseGreppable(stdout),
    }));

    killTimer = setTimeout(() => {
      child.kill('SIGKILL');
      finish({ skipped: true, reason: 'Discovery timed out.', ports: parseGreppable(stdout) });
    }, (NMAP_TIMEOUT_SECONDS + 3) * 1000);
    killTimer.unref?.();
  });
}

function requestFingerprint({ address, family, hostname, port, secure }) {
  return new Promise((resolve) => {
    const transport = secure ? https : http;
    const options = {
      host: address,
      family,
      port,
      method: 'GET',
      path: '/',
      timeout: 4000,
      headers: {
        Host: hostname,
        'User-Agent': 'EduNetGuard-Discovery/0.6',
        Accept: 'text/html,*/*;q=0.8',
        Connection: 'close',
      },
    };

    if (secure) {
      options.servername = net.isIP(hostname) ? undefined : hostname;
      options.rejectUnauthorized = false;
    }

    const req = transport.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        if (body.length < 65536) body += chunk.toString();
      });
      res.on('end', () => {
        const titleMatch = body.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
        const socket = res.socket;
        let certificate = null;
        if (secure && socket?.getPeerCertificate) {
          const cert = socket.getPeerCertificate();
          if (cert && Object.keys(cert).length) {
            certificate = {
              subject: cert.subject?.CN || null,
              issuer: cert.issuer?.CN || null,
              validTo: cert.valid_to || null,
            };
          }
        }
        resolve({
          port,
          secure,
          statusCode: res.statusCode || null,
          server: res.headers.server || null,
          poweredBy: res.headers['x-powered-by'] || null,
          title: titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : null,
          certificate,
        });
      });
    });

    req.once('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.once('error', () => resolve(null));
    req.end();
  });
}

async function webFingerprints(resolved, hostname, openPorts, privateTarget) {
  const ports = new Set(openPorts.map((item) => item.port));
  const candidates = [
    { port: 80, secure: false },
    { port: 443, secure: true },
    { port: 5480, secure: true },
    { port: 8006, secure: true },
    { port: 8080, secure: false },
    { port: 8443, secure: true },
    { port: 9443, secure: true },
  ].filter((item) => privateTarget ? (ports.size === 0 || ports.has(item.port)) : [80, 443].includes(item.port));

  const results = await Promise.all(
    candidates.slice(0, 4).map((item) => requestFingerprint({
      address: resolved.address,
      family: resolved.family,
      hostname,
      ...item,
    }))
  );
  return results.filter(Boolean);
}

async function discoverMonitor(monitor) {
  const host = targetHost(monitor);
  const resolved = await resolveAllowedTarget(host);
  const privateTarget = isPrivateAddress(resolved.address);
  const [reverseNames, nmap] = await Promise.all([
    reverseDns(resolved.address),
    nmapFingerprint(resolved.address),
  ]);

  const httpHints = await webFingerprints(
    resolved,
    host,
    nmap.ports || [],
    privateTarget
  );

  return {
    method: privateTarget
      ? 'reverse-dns+nmap-service-fingerprint+http-tls'
      : 'reverse-dns+http-tls',
    resolvedIp: resolved.address,
    addressFamily: resolved.family,
    originalHost: host,
    reverseDns: reverseNames,
    openPorts: nmap.ports || [],
    nmapSkipped: Boolean(nmap.skipped),
    nmapNote: nmap.reason || null,
    web: httpHints,
    discoveredAt: new Date().toISOString(),
  };
}

module.exports = {
  discoverMonitor,
  parseGreppable,
};
