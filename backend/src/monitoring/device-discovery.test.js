const { parseGreppable } = require('./device-discovery');
const { classifyDevice, guidanceFor } = require('./device-guidance');

describe('EduNetGuard smart device discovery', () => {
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
