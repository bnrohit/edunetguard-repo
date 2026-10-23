// Administrator-owned, persistent IPv4 scan allowlist. No range scans are performed.
const fs = require('fs');
const path = require('path');
const net = require('net');
const DATA_DIR = process.env.USER_DATA_DIR || '/app/user-data';
const FILE = path.join(DATA_DIR, 'monitor-allowlist.json');
const MAX_CIDRS = 64;

function ipNumber(ip) {
  if (net.isIP(ip) !== 4) return null;
  return ip.split('.').reduce((sum, octet) => ((sum * 256) + Number(octet)) >>> 0, 0);
}
function ipString(value) {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join('.');
}
function cidrParts(entry) {
  const raw = String(entry || '').trim();
  const match = /^(\d{1,3}(?:\.\d{1,3}){3})(?:\/(\d{1,2}))?$/.exec(raw);
  if (!match || net.isIP(match[1]) !== 4) return null;
  const prefix = match[2] === undefined ? 32 : Number(match[2]);
  if (prefix < 0 || prefix > 32) return null;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const start = (ipNumber(match[1]) & mask) >>> 0;
  const end = (start | (~mask >>> 0)) >>> 0;
  return { start, end, mask, prefix, cidr: ipString(start) + '/' + prefix };
}
function inPrivateRanges(number) {
  return [
    ['10.0.0.0', 8],
    ['172.16.0.0', 12],
    ['192.168.0.0', 16],
    ['100.64.0.0', 10],
  ].some(([ip, prefix]) => {
    const mask = (0xffffffff << (32 - prefix)) >>> 0;
    return ((number & mask) >>> 0) === ((ipNumber(ip) & mask) >>> 0);
  });
}
function validateCidrs(input) {
  if (!Array.isArray(input) || input.length > MAX_CIDRS) {
    throw Object.assign(new Error('Provide an array of no more than 64 IPv4 CIDRs.'), { statusCode: 400 });
  }
  const result = [];
  for (const entry of input) {
    const parsed = cidrParts(entry);
    if (!parsed || !inPrivateRanges(parsed.start) || !inPrivateRanges(parsed.end)) {
      throw Object.assign(new Error('Only explicitly scoped private IPv4 CIDRs are permitted (10/8, 172.16/12, 192.168/16, 100.64/10). Invalid: ' + String(entry).slice(0, 60)), { statusCode: 400 });
    }
    if (!result.includes(parsed.cidr)) result.push(parsed.cidr);
  }
  return result;
}
function policySource() {
  return fs.existsSync(FILE) ? 'admin-dashboard' : 'environment';
}
function getAllowedCidrs() {
  if (fs.existsSync(FILE)) {
    // Corrupt policies fail closed rather than silently reverting to a broader .env list.
    const saved = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return validateCidrs(saved.allowedPrivateCidrs);
  }
  const fallback = String(process.env.USER_MONITOR_ALLOWED_CIDRS || '')
    .split(',').map((item) => item.trim()).filter(Boolean);
  return validateCidrs(fallback);
}
function saveAllowedCidrs(input, actor) {
  const allowedPrivateCidrs = validateCidrs(input);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temp = FILE + '.tmp-' + process.pid;
  fs.writeFileSync(temp, JSON.stringify({
    version: 1, allowedPrivateCidrs,
    updatedAt: new Date().toISOString(),
    updatedBy: String(actor || 'admin').slice(0, 80),
  }, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(temp, FILE);
  return allowedPrivateCidrs;
}
function isApprovedPrivateIp(ip) {
  const number = ipNumber(ip);
  if (number === null) return false;
  return getAllowedCidrs().some((entry) => {
    const range = cidrParts(entry);
    return number >= range.start && number <= range.end;
  });
}
module.exports = { getAllowedCidrs, saveAllowedCidrs, isApprovedPrivateIp, policySource, validateCidrs };
