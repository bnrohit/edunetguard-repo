// Optional read-only switch-port candidates from gateway ARP and switch FDB tables.
// All devices are explicitly configured by the administrator and must be in the
// existing approved CIDR policy. Never claim an FDB entry proves a direct cable.
const net = require('net');
const { spawn } = require('child_process');
const { assertAddressAllowed, isPrivateAddress } = require('./user-monitor-policy');

const OIDS = Object.freeze({
  arp: '1.3.6.1.2.1.4.22.1.2',
  physical: '1.3.6.1.2.1.4.35.1.4',
  qbridge: '1.3.6.1.2.1.17.7.1.2.2.1.2',
  bridge: '1.3.6.1.2.1.17.4.3.1.2',
  bridgeIf: '1.3.6.1.2.1.17.1.4.1.2',
  ifName: '1.3.6.1.2.1.31.1.1.1.1',
  ifDescr: '1.3.6.1.2.1.2.2.1.2',
});
const TIMEOUT_MS = 5000;
function targets(key, max) {
  return [...new Set(String(process.env[key] || '').split(',').map(s => s.trim()).filter(Boolean))]
    .filter(ip => net.isIP(ip) === 4 && isPrivateAddress(ip)).slice(0, max);
}
function configured() {
  return Boolean(
    process.env.USER_MONITOR_SNMPV3_USER &&
    process.env.USER_MONITOR_SNMPV3_AUTH_PASS &&
    process.env.USER_MONITOR_SNMPV3_PRIV_PASS &&
    targets('USER_MONITOR_TOPOLOGY_GATEWAYS', 4).length &&
    targets('USER_MONITOR_TOPOLOGY_SWITCHES', 12).length
  );
}
function parseRows(output) {
  return String(output || '').split(/\r?\n/).map(line => {
    const match = /^\.?([\d.]+)\s*=\s*(.*)$/.exec(line.trim());
    return match ? { oid: match[1], value: match[2] } : null;
  }).filter(Boolean);
}
function macFromValue(value) {
  const hexString = /(?:Hex-STRING|OCTET STRING):\s*([a-f\d\s:]+)/i.exec(String(value));
  const hexLiteral = /(?:STRING|OCTET STRING):\s*0x([a-f\d]{12})/i.exec(String(value));
  const hex = hexString ? hexString[1].replace(/[^a-f\d]/ig, '') : hexLiteral?.[1];
  return hex && hex.length === 12 ? hex.toLowerCase().match(/.{2}/g).join(':') : null;
}
function macFromOid(oid) {
  const octets = String(oid).split('.').slice(-6).map(Number);
  return octets.length === 6 && octets.every(n => Number.isInteger(n) && n >= 0 && n <= 255)
    ? octets.map(n => n.toString(16).padStart(2, '0')).join(':') : null;
}
function numberFromValue(value) {
  const match = /(?:INTEGER|Gauge32|Counter32|Unsigned32):\s*(?:[^\d\n]*\()?(-?\d+)\)?/i.exec(String(value));
  return match ? Number(match[1]) : null;
}
function stringFromValue(value) {
  return String(value || '').replace(/^\w+(?:-\w+)?(?:32)?:\s*/, '').replace(/^"|"$/g, '').slice(0, 120);
}
function snmpArgs(host, oid) {
  const authProto = ['SHA', 'SHA-256'].includes(process.env.USER_MONITOR_SNMPV3_AUTH_PROTO) ?
    process.env.USER_MONITOR_SNMPV3_AUTH_PROTO : 'SHA';
  return ['-v3', '-l', 'authPriv', '-u', process.env.USER_MONITOR_SNMPV3_USER,
    '-a', authProto, '-A', process.env.USER_MONITOR_SNMPV3_AUTH_PASS,
    '-x', 'AES', '-X', process.env.USER_MONITOR_SNMPV3_PRIV_PASS,
    '-On', '-t', '1', '-r', '0', host, oid];
}
function snmp(command, host, oid) {
  assertAddressAllowed(host);
  return new Promise(resolve => {
    const child = spawn(command, snmpArgs(host, oid), { stdio: ['ignore', 'pipe', 'ignore'] });
    let data = '', finished = false;
    const finish = output => { if (finished) return; finished = true; clearTimeout(timer); resolve(output); };
    child.stdout?.on('data', chunk => {
      if (data.length < 1024 * 1024) data += chunk.toString().slice(0, 1024 * 1024 - data.length);
    });
    child.once('error', () => finish(''));
    child.once('close', code => finish(code === 0 ? data : ''));
    const timer = setTimeout(() => { child.kill('SIGKILL'); finish(''); }, TIMEOUT_MS);
    timer.unref?.();
  });
}
async function readMac(ip, gateways) {
  const found = await Promise.all(gateways.map(async gateway => {
    for (const oid of [OIDS.physical, OIDS.arp]) {
      const rows = parseRows(await snmp('snmpbulkwalk', gateway, oid));
      const record = rows.find(row => row.oid.startsWith(oid + '.') &&
        row.oid.endsWith('.' + ip) && macFromValue(row.value));
      if (record) return { mac: macFromValue(record.value), gateway };
    }
    return null;
  }));
  return found.find(Boolean) || null;
}
async function candidateOnSwitch(address, mac) {
  const macSuffix = mac.split(':').map(part => parseInt(part, 16)).join('.');
  for (const oid of [OIDS.qbridge, OIDS.bridge]) {
    const records = parseRows(await snmp('snmpbulkwalk', address, oid));
    const matching = records.filter(row => row.oid.startsWith(oid + '.') &&
      row.oid.endsWith('.' + macSuffix) && numberFromValue(row.value) > 0);
    if (!matching.length) continue;
    const matches = [];
    for (const record of matching.slice(0, 3)) {
      const bridgePort = numberFromValue(record.value);
      const mapped = parseRows(await snmp('snmpget', address, OIDS.bridgeIf + '.' + bridgePort));
      const ifIndex = mapped.length ? numberFromValue(mapped[0].value) : null;
      if (!Number.isInteger(ifIndex) || ifIndex < 1) continue;
      const names = parseRows(await snmp('snmpget', address, OIDS.ifName + '.' + ifIndex));
      const desc = names.length && !/No Such/i.test(names[0].value) ? names :
        parseRows(await snmp('snmpget', address, OIDS.ifDescr + '.' + ifIndex));
      const interfaceName = desc.length && !/No Such/i.test(desc[0].value)
        ? stringFromValue(desc[0].value) : 'ifIndex ' + ifIndex;
      if (matches.some(item => item.port === interfaceName)) continue;
      matches.push({ switchIp: address, port: interfaceName, ifIndex, source: oid === OIDS.qbridge ? 'Q-BRIDGE-MIB' : 'BRIDGE-MIB' });
    }
    if (matches.length) return matches;
  }
  return [];
}
// Identify explicitly enrolled switches/gateways using their own read-only sysDescr.
async function readSnmpIdentity(ip) {
  if (net.isIP(ip) !== 4 || !isPrivateAddress(ip) || !configured()) return null;
  const enrolled = [
    ...targets('USER_MONITOR_TOPOLOGY_GATEWAYS', 4),
    ...targets('USER_MONITOR_TOPOLOGY_SWITCHES', 12),
  ];
  if (!enrolled.includes(ip)) return null;
  assertAddressAllowed(ip);
  const [sysDescr, sysName] = await Promise.all([
    snmp('snmpget', ip, '1.3.6.1.2.1.1.1.0'),
    snmp('snmpget', ip, '1.3.6.1.2.1.1.5.0'),
  ]);
  const descriptions = parseRows(sysDescr);
  const names = parseRows(sysName);
  if (!descriptions.length || /No Such/i.test(descriptions[0].value)) return null;
  return {
    sysDescr: stringFromValue(descriptions[0].value).slice(0, 120),
    sysName: names.length && !/No Such/i.test(names[0].value) ? stringFromValue(names[0].value) : null,
    role: targets('USER_MONITOR_TOPOLOGY_SWITCHES', 12).includes(ip) ? 'switch' : 'gateway',
    source: 'SNMPv3 sysDescr/sysName',
  };
}

async function traceSwitchPort(ip) {
  if (!isPrivateAddress(ip) || net.isIP(ip) !== 4) return { status: 'unavailable', note: 'Switch-port lookup supports only approved private IPv4 addresses.' };
  assertAddressAllowed(ip);
  if (!configured()) return { status: 'not-configured', note: 'Admin: configure read-only SNMPv3 gateway ARP and switch inventory to look up candidate ports.' };
  const gateways = targets('USER_MONITOR_TOPOLOGY_GATEWAYS', 4).filter(ip => {
    try { assertAddressAllowed(ip); return true; } catch { return false; }
  });
  const switches = targets('USER_MONITOR_TOPOLOGY_SWITCHES', 12).filter(ip => {
    try { assertAddressAllowed(ip); return true; } catch { return false; }
  });
  if (!gateways.length || !switches.length) {
    return { status: 'unavailable', note: 'Gateway and switch SNMP targets must also be inside approved private CIDRs.' };
  }
  const resolved = await readMac(ip, gateways);
  if (!resolved) return { status: 'unknown', note: 'No IP-to-MAC mapping was returned by configured gateways. Check ARP visibility, SNMPv3 access and VLAN.' };
  // Maximum 12 explicitly configured switches. Lookups do not alter configurations.
  const scans = await Promise.all(switches.map(switchIp => candidateOnSwitch(switchIp, resolved.mac)));
  const matches = scans.flat().slice(0, 20);
  return {
    status: matches.length ? 'candidates' : 'unknown',
    mac: resolved.mac,
    arpGateway: resolved.gateway,
    matches,
    checkedAt: new Date().toISOString(),
    note: matches.length
      ? 'Possible learned switch ports, not guaranteed direct connections. Uplinks and stale FDB entries can also match; verify LLDP/CDP, VLAN, and current MAC table.'
      : 'MAC was found on the gateway, but no listed switch FDB contained it. Add the appropriate access switches or check SNMP/VLAN FDB visibility.',
  };
}
module.exports = { traceSwitchPort, readSnmpIdentity, parseRows, macFromValue, macFromOid, numberFromValue, configured };
