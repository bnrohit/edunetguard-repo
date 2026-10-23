const dns = require('dns').promises;
const http = require('http');
const https = require('https');
const net = require('net');
const { spawn } = require('child_process');
const { resolveAllowedTarget, isPrivateAddress, assertAddressAllowed } = require('./user-monitor-policy');
const { readSnmpIdentity } = require('./switch-port-trace');

// Discovery is strictly single-host; no user-controlled Nmap arguments or CIDR scans.
const DISCOVERY_PORTS = '21,22,23,53,80,135,139,161,389,443,445,515,548,554,631,636,902,3389,5480,5900,8000,8006,8080,8291,8443,9100,9443';
const NMAP_TIMEOUT_SECONDS = Math.max(8, Math.min(60, parseInt(process.env.USER_MONITOR_DISCOVERY_TIMEOUT_SECONDS || '20', 10)));

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
  // Compatibility helper for legacy reports/tests. New Nmap runs use structured XML.
  const hostLine = String(output || '').split('\n').find((line) => line.startsWith('Host:') && line.includes('Ports:'));
  if (!hostLine) return [];
  const portsPart = hostLine.split('Ports:')[1]?.split('Ignored State:')[0] || '';
  return portsPart.split(',').map((entry) => {
    const f = entry.trim().split('/');
    if (f.length < 5 || f[1] !== 'open') return null;
    return { port: Number(f[0]), protocol: f[2] || 'tcp', service: f[4] || 'unknown', product: (f[6] || '').trim() || null };
  }).filter(Boolean);
}
function xmlAttr(attrs, key) {
  const hit = new RegExp('\\b' + key + '\\s*=\\s*"([^"]*)"').exec(attrs || '');
  return hit ? hit[1].replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') : null;
}
function parseNmapXml(xml) {
  const ports = [];
  const portPattern = /<port\s+([^>]*?)>([\s\S]*?)<\/port>/g;
  let match;
  while ((match = portPattern.exec(String(xml || ''))) !== null) {
    const state = /<state\s+([^>]*?)\s*\/>/.exec(match[2]);
    if (xmlAttr(state?.[1], 'state') !== 'open') continue;
    const service = /<service\s+([^>]*?)\s*\/>/.exec(match[2]);
    const attrs = service?.[1] || '';
    const product = [xmlAttr(attrs, 'product'), xmlAttr(attrs, 'version'), xmlAttr(attrs, 'extrainfo')].filter(Boolean).join(' ');
    const number = Number(xmlAttr(match[1], 'portid'));
    if (!Number.isInteger(number) || number < 1 || number > 65535) continue;
    ports.push({
      port: number,
      protocol: xmlAttr(match[1], 'protocol') || 'tcp',
      service: xmlAttr(attrs, 'name') || 'unknown',
      product: product || null,
    });
  }
  return ports;
}
async function icmpReachability(address) {
  assertAddressAllowed(address);
  return new Promise((resolve) => {
    const child = spawn('ping', ['-n', '-c', '1', '-W', '2', address], { stdio: 'ignore' });
    let finished = false;
    const finish = (state) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(state);
    };
    const timer = setTimeout(() => { child.kill('SIGKILL'); finish(null); }, 3500);
    timer.unref?.();
    child.once('error', () => finish(null));
    child.once('close', (code) => finish(code === 0));
  });
}
function nmapErrorMessage(stderr, exitCode) {
  const raw = String(stderr || '').trim();
  if (/could not locate nse_main\\.lua|failed to initialize the script engine/i.test(raw)) {
    return 'Nmap service discovery unavailable: NSE runtime missing. Rebuild the backend with nmap-nselibs and nmap-scripts.';
  }
  if (/permission denied|operation not permitted/i.test(raw)) {
    return 'Nmap service discovery was denied permission: check backend container privileges and connectivity.';
  }
  return (raw ? raw.slice(0, 500) : 'Nmap exited with code ' + exitCode);
}

function nmapFingerprint(address) {
  assertAddressAllowed(address);
  if (!isPrivateAddress(address)) {
    return Promise.resolve({ skipped: true, reason: 'Public targets are never Nmap scanned.', ports: [] });
  }
  return new Promise((resolve) => {
    const args = [
      '-n', '-Pn', '-sT', '-sV', '--version-light', '-T3',
      '--max-retries', '1', '-p', DISCOVERY_PORTS,
      '--host-timeout', NMAP_TIMEOUT_SECONDS + 's', '-oX', '-', address,
    ];
    const child = spawn('nmap', args, { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, LANG: 'C', LC_ALL: 'C' } });
    let stdout = '', stderr = '', settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
      if (stdout.length > 256 * 1024) stdout = stdout.slice(-256 * 1024);
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 4096) stderr = stderr.slice(-4096);
    });
    child.once('error', (error) => finish({ skipped: true, reason: error.message, ports: [] }));
    child.once('close', (code) => finish({
      skipped: code !== 0 && !parseNmapXml(stdout).length,
      reason: code === 0 ? null : nmapErrorMessage(stderr, code),
      ports: parseNmapXml(stdout),
    }));
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish({ skipped: true, reason: 'Nmap timed out; partial ports may be available.', ports: parseNmapXml(stdout) });
    }, (NMAP_TIMEOUT_SECONDS + 3) * 1000);
    timer.unref?.();
  });
}
function sshBanner(address) {
  assertAddressAllowed(address);
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: address, port: 22, timeout: 2500 });
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(value);
    };
    socket.once('data', (data) => {
      const firstLine = String(data).split(/[\r\n]/)[0].slice(0, 160);
      finish(firstLine.startsWith('SSH-') ? firstLine : null);
    });
    socket.once('timeout', () => finish(null));
    socket.once('error', () => finish(null));
    socket.once('close', () => finish(null));
  });
}
function requestFingerprint({ address, family, hostname, port, secure }) {
  assertAddressAllowed(address);
  return new Promise((resolve) => {
    const transport = secure ? https : http;
    const options = {
      host: address, family, port, method: 'GET', path: '/', timeout: 3500,
      headers: { Host: hostname, 'User-Agent': 'EduNetGuard-Discovery/0.7', Accept: 'text/html,*/*;q=0.8', Connection: 'close' },
    };
    if (secure) {
      options.servername = net.isIP(hostname) ? undefined : hostname;
      // Discovery only: collect even a self-signed management certificate.
      options.rejectUnauthorized = false;
    }
    const req = transport.request(options, (res) => {
      let body = '';
      const socket = res.socket;
      let certificate = null;
      if (secure && socket?.getPeerCertificate) {
        const cert = socket.getPeerCertificate();
        if (cert && Object.keys(cert).length) {
          certificate = { subject: cert.subject?.CN || null, issuer: cert.issuer?.CN || null, validTo: cert.valid_to || null };
        }
      }
      res.on('data', (chunk) => { if (body.length < 32768) body += chunk.toString().slice(0, 32768 - body.length); });
      res.on('end', () => {
        const title = /<title[^>]*>([^<]{1,200})<\/title>/i.exec(body);
        resolve({
          port, secure, statusCode: res.statusCode || null,
          server: String(res.headers.server || '').slice(0, 160) || null,
          poweredBy: String(res.headers['x-powered-by'] || '').slice(0, 160) || null,
          title: title ? title[1].replace(/\s+/g, ' ').trim() : null,
          certificate,
        });
      });
      res.once('error', () => resolve(null));
    });
    req.once('timeout', () => { req.destroy(); resolve(null); });
    req.once('error', () => resolve(null));
    req.end();
  });
}
async function webFingerprints(resolved, hostname, openPorts, privateTarget) {
  const ports = new Set(openPorts.map((item) => item.port));
  const candidates = [
    { port: 80, secure: false }, { port: 443, secure: true }, { port: 5480, secure: true },
    { port: 8006, secure: true }, { port: 8080, secure: false },
    { port: 8443, secure: true }, { port: 9443, secure: true },
  ].filter((item) => privateTarget
    ? (ports.size === 0 || ports.has(item.port))
    : [80, 443].includes(item.port));
  return (await Promise.all(candidates.slice(0, 4).map((item) =>
    requestFingerprint({ address: resolved.address, family: resolved.family, hostname, ...item })
  ))).filter(Boolean);
}
async function discoverMonitor(monitor) {
  const host = targetHost(monitor);
  const resolved = await resolveAllowedTarget(host);
  const privateTarget = isPrivateAddress(resolved.address);
  const [reverseNames, nmap, icmp, snmp] = await Promise.all([
    reverseDns(resolved.address),
    nmapFingerprint(resolved.address),
    privateTarget ? icmpReachability(resolved.address) : Promise.resolve(null),
    privateTarget ? readSnmpIdentity(resolved.address).catch(() => null) : Promise.resolve(null),
  ]);
  // Reauthorize immediately before secondary probes, including after an admin revokes a subnet.
  assertAddressAllowed(resolved.address);
  const [httpHints, ssh] = await Promise.all([
    webFingerprints(resolved, host, nmap.ports || [], privateTarget),
    privateTarget && (nmap.ports || []).some((p) => p.port === 22)
      ? sshBanner(resolved.address) : Promise.resolve(null),
  ]);
  return {
    method: privateTarget ? 'icmp+reverse-dns+nmap-xml+ssh-banner+http-tls' : 'reverse-dns+http-tls',
    resolvedIp: resolved.address, addressFamily: resolved.family, originalHost: host,
    reverseDns: reverseNames,
    icmpReachable: icmp,
    sshBanner: ssh,
    snmp,
    openPorts: nmap.ports || [], nmapSkipped: Boolean(nmap.skipped),
    nmapNote: nmap.reason || null,
    web: httpHints, discoveredAt: new Date().toISOString(),
  };
}
module.exports = { discoverMonitor, parseGreppable, parseNmapXml, nmapErrorMessage };
