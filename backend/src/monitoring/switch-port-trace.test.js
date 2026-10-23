const {
  parseRows, macFromValue, macFromOid, numberFromValue, configured, traceSwitchPort,
} = require('./switch-port-trace');
const { classifyDevice, guidanceFor } = require('./device-guidance');

describe('read-only switch port location and operator guidance', () => {
  test('decodes numeric SNMP OIDs, bridge FDB MAC, and gateway ARP hex strings', () => {
    const rows = parseRows(
      '.1.3.6.1.2.1.4.22.1.2.17.10.250.252.1 = Hex-STRING: 00 11 22 A3 4B C5\n' +
      '.1.3.6.1.2.1.17.4.3.1.2.0.17.34.163.75.197 = INTEGER: 12\n'
    );
    expect(rows).toHaveLength(2);
    expect(macFromValue(rows[0].value)).toBe('00:11:22:a3:4b:c5');
    expect(macFromOid(rows[1].oid)).toBe('00:11:22:a3:4b:c5');
    expect(numberFromValue(rows[1].value)).toBe(12);
  });

  test('tracing does not run until gateway, switches, and SNMPv3 are configured', async () => {
    const vars = ['USER_MONITOR_TOPOLOGY_GATEWAYS', 'USER_MONITOR_TOPOLOGY_SWITCHES',
      'USER_MONITOR_SNMPV3_USER', 'USER_MONITOR_SNMPV3_AUTH_PASS', 'USER_MONITOR_SNMPV3_PRIV_PASS'];
    const original = Object.fromEntries(vars.map(k => [k, process.env[k]]));
    try {
      vars.forEach(k => { delete process.env[k]; });
      process.env.USER_MONITOR_ALLOWED_CIDRS = '10.250.0.0/16';
      expect(configured()).toBe(false);
      await expect(traceSwitchPort('10.250.252.1')).resolves.toMatchObject({ status: 'not-configured' });
    } finally {
      vars.forEach(k => {
        if (original[k] === undefined) delete process.env[k];
        else process.env[k] = original[k];
      });
      delete process.env.USER_MONITOR_ALLOWED_CIDRS;
    }
  });

  test('a live SNMP switch description improves classification without inventing a connected port', () => {
    const monitor = { name: 'OCS01', target: '10.250.252.1', type: 'ping', status: 'down',
      lastResult: { message: 'No ICMP reply' } };
    const discovery = { reverseDns: [], openPorts: [], web: [], snmp: {
      sysName: 'OCS01', sysDescr: 'Cisco Catalyst C9200L-48P-4X IOS XE Software', role: 'switch',
    }, topology: { status: 'candidates', mac: '00:11:22:a3:4b:c5',
      matches: [{ switchIp: '10.250.252.2', port: 'Gi1/0/24', source: 'BRIDGE-MIB' }] } };
    const profile = classifyDevice(monitor, discovery);
    expect(profile.type).toBe('switch');
    expect(profile.vendor).toBe('Cisco');
    expect(profile.confidence).toBe('high');
    expect(profile.model).toContain('C9200L');
    const guide = guidanceFor(profile, { ...monitor, discovery });
    expect(guide.suggestions.join(' ')).toMatch(/Possible learned port/);
    expect(guide.adminMessage).toMatch(/not verified/);
    expect(guide.readOnlyCommands.join(' ')).toMatch(/show lldp neighbors/);
  });
});
