const { parseGreppable, parseNmapXml } = require('./device-discovery');
const { classifyDevice, guidanceFor } = require('./device-guidance');

describe('EduNetGuard smart device discovery', () => {
  test('parses XML service versions from one private host', () => {
    const xml = `<nmaprun><host><ports>
      <port protocol="tcp" portid="22"><state state="open" reason="syn-ack"/><service name="ssh" product="Cisco SSH" version="1.25"/></port>
      <port protocol="tcp" portid="443"><state state="open"/><service name="https" product="Cisco IOS XE" version="17.9"/></port>
      <port protocol="tcp" portid="80"><state state="closed"/></port>
    </ports></host></nmaprun>`;
    expect(parseNmapXml(xml)).toEqual([
      { port: 22, protocol: 'tcp', service: 'ssh', product: 'Cisco SSH 1.25' },
      { port: 443, protocol: 'tcp', service: 'https', product: 'Cisco IOS XE 17.9' },
    ]);
  });

  test('identifies Catalyst from an observed SSH banner', () => {
    const profile = classifyDevice({ name: 'SSC device', target: '10.128.10.20', type: 'ping' }, {
      reverseDns: [], sshBanner: 'SSH-2.0-Cisco-Catalyst',
      openPorts: [{ port: 22, protocol: 'tcp', service: 'ssh', product: null }], web: [],
    });
    expect(profile.type).toBe('switch');
    expect(profile.vendor).toBe('Cisco');
    expect(profile.confidence).toBe('high');
  });

  test('switch label alone is low confidence and does not invent a Cisco model', () => {
    const profile = classifyDevice({ name: 'GPHS Catalyst C9200 Switch', target: '10.128.10.90', type: 'ping' }, {
      reverseDns: [], sshBanner: 'SSH-2.0-OpenSSH_8.0',
      openPorts: [{ port: 22, protocol: 'tcp', service: 'ssh', product: 'OpenSSH 8' }], web: [],
    });
    expect(profile.type).toBe('switch');
    expect(profile.confidence).toBe('low');
    expect(profile.model).toBeNull();
    expect(profile.vendor).toBeNull();
  });

  test('SSH alone is not enough to declare a Linux server', () => {
    const profile = classifyDevice({ name: 'Unknown host', target: '10.128.10.20', type: 'ping' }, {
      reverseDns: [], sshBanner: 'SSH-2.0-OpenSSH_8.4',
      openPorts: [{ port: 22, protocol: 'tcp', service: 'ssh', product: 'OpenSSH 8.4' }], web: [],
    });
    expect(profile.type).toBe('network-device');
  });

  test('parses Nmap greppable service output', () => {
    const sample = 'Host: 10.128.10.20 ()\tStatus: Up\nHost: 10.128.10.20 ()\tPorts: 22/open/tcp//ssh//OpenSSH 9.2/, 443/open/tcp//https//VMware vCenter Server 8.0/\tIgnored State: closed (23)';
    const ports = parseGreppable(sample);

    expect(ports).toEqual([
      { port: 22, protocol: 'tcp', service: 'ssh', product: 'OpenSSH 9.2' },
      { port: 443, protocol: 'tcp', service: 'https', product: 'VMware vCenter Server 8.0' },
    ]);
  });

  test('identifies vCenter and provides virtualization guidance', () => {
    const monitor = {
      name: 'vcenter',
      target: 'vcenter.example.org',
      type: 'ping',
      status: 'down',
    };
    const discovery = {
      reverseDns: ['vcenter.example.org'],
      openPorts: [
        { port: 443, protocol: 'tcp', service: 'https', product: 'VMware vCenter Server 8.0' },
        { port: 5480, protocol: 'tcp', service: 'https', product: null },
      ],
      web: [],
    };

    const profile = classifyDevice(monitor, discovery);
    const guidance = guidanceFor(profile, monitor);

    expect(profile.type).toBe('vcenter');
    expect(profile.vendor).toBe('VMware');
    expect(guidance.state).toBe('action-required');
    expect(guidance.suggestions).toHaveLength(4);
    expect(guidance.adminMessage).toMatch(/vCenter/i);
  });

  test('identifies a camera from RTSP without guessing a vendor', () => {
    const monitor = {
      name: 'Parking Lot Camera',
      target: '10.128.20.50',
      type: 'ping',
      status: 'up',
    };
    const discovery = {
      reverseDns: [],
      openPorts: [
        { port: 554, protocol: 'tcp', service: 'rtsp', product: null },
      ],
      web: [],
    };

    const profile = classifyDevice(monitor, discovery);
    expect(profile.type).toBe('camera');
    expect(profile.label).toBe('IP Camera');
    expect(profile.vendor).toBeNull();
  });

  test('does not present generic OpenSSH as a hardware model', () => {
    const monitor = {
      name: 'Linux utility host',
      target: '10.128.10.30',
      type: 'ping',
      status: 'up',
    };
    const discovery = {
      reverseDns: [],
      openPorts: [
        { port: 22, protocol: 'tcp', service: 'ssh', product: 'OpenSSH 9.2' },
      ],
      web: [],
    };

    const profile = classifyDevice(monitor, discovery);
    expect(profile.type).toBe('linux-server');
    expect(profile.model).toBeNull();
  });
});
