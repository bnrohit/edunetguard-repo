function textOf(service = {}) {
  return [
    service.name,
    service.group,
    service.type,
    service.target,
    service.message,
  ].filter(Boolean).join(' ').toLowerCase();
}

function classifyDevice(service = {}) {
  const text = textOf(service);

  const rules = [
    { type: 'vcenter', label: 'VMware vCenter', category: 'Virtualization', priority: 'critical', match: /(vcenter|vcentre|vsphere)/ },
    { type: 'esxi', label: 'VMware ESXi Host', category: 'Virtualization', priority: 'critical', match: /(esxi|vmware host|\bvh\d{2,3}\b)/ },
    { type: 'xcp', label: 'XCP-ng / Xen Host', category: 'Virtualization', priority: 'critical', match: /(xcp-ng|xcpng|xenserver|xen host|xoce)/ },
    { type: 'dell_server', label: 'Dell Server', category: 'Server', priority: 'high', match: /(dell|poweredge|idrac)/ },
    { type: 'storage', label: 'Storage / SAN', category: 'Storage', priority: 'critical', match: /(compellent|iscsi|san\b|truenas|nas\b|storage|powerstore|unity)/ },
    { type: 'firewall', label: 'Firewall / Security Gateway', category: 'Security', priority: 'critical', match: /(firewall|fortigate|fortinet|palo alto|pan-os|\basa\b|meraki mx|security gateway)/ },
    { type: 'router', label: 'Router / WAN Gateway', category: 'Network', priority: 'critical', match: /(router|vyos|gateway|wan\b|edge router|internet circuit)/ },
    { type: 'switch', label: 'Network Switch', category: 'Network', priority: 'high', match: /(switch|nexus|catalyst|meraki ms|extreme|x450|core\d|cores\d)/ },
    { type: 'access_point', label: 'Wireless Access Point', category: 'Wireless', priority: 'medium', match: /(access point|wireless ap|\bwap\b|\bap\d|aerohive|extreme ap|meraki mr)/ },
    { type: 'camera', label: 'Camera / Video Device', category: 'Safety', priority: 'medium', match: /(camera|cam\b|nvr|video surveillance)/ },
    { type: 'dns', label: 'DNS Service', category: 'Network Service', priority: 'critical', match: /(\bdns\b|domain name)/ },
    { type: 'dhcp', label: 'DHCP Service', category: 'Network Service', priority: 'critical', match: /(\bdhcp\b|scope|lease server)/ },
    { type: 'directory', label: 'Active Directory / Domain Controller', category: 'Identity', priority: 'critical', match: /(active directory|domain controller|\badc\d|\bdc\d|ldap|kerberos)/ },
    { type: 'nac', label: 'NAC / RADIUS', category: 'Identity', priority: 'high', match: /(packetfence|radius|nac\b|802\.1x)/ },
    { type: 'voice', label: 'Voice / Unified Communications', category: 'Voice', priority: 'high', match: /(cucm|unity connection|\bcuc\b|\bcer\b|voice|sip\b|phone)/ },
    { type: 'printer', label: 'Printer / Print Service', category: 'Endpoint', priority: 'low', match: /(printer|print server|spooler)/ },
    { type: 'website', label: 'Website / Web Application', category: 'Application', priority: 'medium', match: /(website|web app|http|https|portal|wordpress|reverse proxy)/ },
    { type: 'server', label: 'Server', category: 'Server', priority: 'high', match: /(server|windows|linux|ubuntu|debian|rhel|centos)/ },
  ];

  const matched = rules.find((rule) => rule.match.test(text));
  if (matched) return { ...matched, confidence: 'likely' };

  if (String(service.type || '').toLowerCase() === 'http') {
    return { type: 'website', label: 'Website / Web Application', category: 'Application', priority: 'medium', confidence: 'likely' };
  }
  if (String(service.type || '').toLowerCase() === 'ping') {
    return { type: 'network_device', label: 'Network Device / Host', category: 'Infrastructure', priority: 'medium', confidence: 'possible' };
  }
  if (String(service.type || '').toLowerCase() === 'tcp') {
    return { type: 'network_service', label: 'TCP Service', category: 'Infrastructure', priority: 'medium', confidence: 'possible' };
  }
  if (String(service.type || '').toLowerCase() === 'dns') {
    return { type: 'dns', label: 'DNS Service', category: 'Network Service', priority: 'critical', confidence: 'likely' };
  }

  return { type: 'unknown', label: 'Infrastructure Device / Service', category: 'Infrastructure', priority: 'medium', confidence: 'unknown' };
}

const PLAYBOOKS = {
  vcenter: [
    'Confirm the vCenter VM or appliance responds to ping and TCP 443.',
    'Open an ESXi host directly to see whether hosts are healthy even if vCenter is down.',
    'Check vCenter services, DNS resolution, and datastore free space.',
    'If hosts are healthy but vCenter is not, treat this as a management-plane outage before changing workloads.',
  ],
  esxi: [
    'Check the host management IP and physical NIC/uplink state.',
    'Verify the management VLAN, switch port, and upstream path.',
    'Confirm storage paths/datastores are reachable before rebooting anything.',
    'Check iDRAC or hardware console for power, memory, disk, or NIC alerts.',
  ],
  xcp: [
    'Check the XCP-ng management IP and bond/uplink state.',
    'Verify storage VLANs and iSCSI sessions before restarting the host.',
    'Check pool master reachability and whether other pool members are healthy.',
    'Use the host console only after confirming the issue is not an upstream switch or storage problem.',
  ],
  dell_server: [
    'Check iDRAC first for power, hardware, PSU, disk, memory, and NIC alerts.',
    'Verify the server management IP and switch port are reachable.',
    'Check bonded/uplink NIC state and the correct VLAN on the switch.',
    'If hardware is healthy, check the operating system or hypervisor service next.',
  ],
  storage: [
    'Verify storage controller/management IPs and array health.',
    'Check iSCSI/storage VLAN reachability and switch ports on both paths.',
    'Confirm host sessions or multipath paths are still logged in.',
    'Check MTU and recent switch/storage changes before restarting hosts.',
  ],
  firewall: [
    'Confirm power/HA state and management reachability.',
    'Check WAN and LAN interface state before changing policy.',
    'Verify routes, NAT, and default gateway health.',
    'If multiple sites are affected, check firewall/ISP status before troubleshooting individual endpoints.',
  ],
  router: [
    'Confirm the router management IP and its upstream/downstream interfaces are reachable.',
    'Check WAN link state and the ISP handoff if internet or multiple services are affected.',
    'Verify routing neighbors/routes such as OSPF and the default route.',
    'Check gateway redundancy state such as VRRP/HSRP before rebooting the router.',
  ],
  switch: [
    'Check switch power and management reachability.',
    'Verify the upstream uplink/port-channel, VLAN, and STP state.',
    'Check whether only one device is down or many downstream devices are affected.',
    'Review interface errors/flaps before rebooting or replacing the switch.',
  ],
  access_point: [
    'Check PoE and the AP switch port first.',
    'Verify the AP management VLAN and gateway reachability.',
    'Check controller/cloud adoption and tunnel status.',
    'Reboot the AP only after confirming the switch port and upstream network are healthy.',
  ],
  camera: [
    'Check PoE and the camera switch port.',
    'Verify the camera VLAN/IP and ping reachability.',
    'Check the camera web interface or NVR registration.',
    'If many cameras fail together, troubleshoot the switch/VLAN/NVR before individual cameras.',
  ],
  dns: [
    'Confirm the DNS server IP responds on the network.',
    'Test TCP/UDP port 53 and a known lookup.',
    'Check the DNS service and server resource health.',
    'If only some names fail, inspect forwarders, zones, and replication before restarting the service.',
  ],
  dhcp: [
    'Confirm the DHCP server is reachable and the service is running.',
    'Check scope utilization and whether free leases remain.',
    'Verify DHCP relay/IP helper configuration between the client VLAN and server.',
    'If one site is affected, check that site gateway/VLAN path before changing the central DHCP server.',
  ],
  directory: [
    'Confirm the domain controller is reachable and DNS is healthy first.',
    'Test LDAP/Kerberos authentication from a known client or service.',
    'Check AD/DNS service health and replication.',
    'If one application is failing, verify its credentials/certificate/trust path before changing the domain controller.',
  ],
  nac: [
    'Check the NAC/RADIUS service and server reachability.',
    'Verify RADIUS ports 1812/1813 and the network path from the access device.',
    'Check AD/domain trust and authentication backend status.',
    'Review recent certificate, LDAP, NTLM, or policy changes before restarting services.',
  ],
  voice: [
    'Confirm CUCM/CUC/CER or the voice server is reachable.',
    'Check voice VLAN DHCP, gateway, and phone registration.',
    'Verify SIP/SCCP/TFTP service reachability as appropriate.',
    'If many phones fail together, check the voice VLAN/uplink before individual phones.',
  ],
  printer: [
    'Ping the printer and check its switch port/VLAN.',
    'Open the printer web page and check paper/toner/error state.',
    'Verify the print queue/spooler only if the printer itself is reachable.',
    'If multiple printers fail, check the print server or VLAN before visiting each printer.',
  ],
  website: [
    'Check DNS resolution for the site name.',
    'Test HTTP/HTTPS directly and note the returned status code.',
    'Check the reverse proxy/web server and TLS certificate if HTTPS fails.',
    'If the web server is up, check the application/backend/database before changing network equipment.',
  ],
  server: [
    'Ping the server and verify its management/network interface.',
    'Check the switch port/VLAN and gateway path.',
    'Check the operating system, service state, CPU/memory/disk usage, and recent changes.',
    'Use hardware management or hypervisor console if the network path is healthy but the server is unresponsive.',
  ],
  network_device: [
    'Confirm the target IP responds from the monitoring network.',
    'Check the switch/router path and management VLAN.',
    'Look for a wider outage affecting nearby devices before touching this device.',
    'Check power and physical connectivity if the network path is otherwise healthy.',
  ],
  network_service: [
    'Confirm the host is reachable first.',
    'Test the monitored TCP port from another trusted system.',
    'Check the application/service process and local firewall.',
    'Review recent configuration or certificate changes if the host is reachable but the port is closed.',
  ],
  unknown: [
    'Confirm basic reachability to the device or service.',
    'Check whether related devices in the same group are also down.',
    'Verify power, uplink/VLAN, DNS, and gateway path as applicable.',
    'Review recent changes and device logs before rebooting or replacing anything.',
  ],
};

function guidanceFor(service = {}) {
  const device = classifyDevice(service);
  const steps = PLAYBOOKS[device.type] || PLAYBOOKS.unknown;
  const name = service.name || 'This monitor';
  const state = service.status || 'unknown';

  const impact = state === 'down'
    ? `${name} is not responding to its configured monitor. Check dependencies before assuming the device itself failed.`
    : state === 'pending'
      ? `${name} has not produced a confirmed healthy check yet. Verify reachability and monitor configuration.`
      : state === 'maintenance'
        ? `${name} is in maintenance. No outage action is required unless the maintenance window is unexpected.`
        : `${name} is currently healthy.`;

  const adminNote = state === 'down'
    ? `${name} is DOWN. Likely type: ${device.label}. Start with reachability/power, then check the device-specific uplink or service path. Avoid rebooting until upstream dependencies are verified.`
    : state === 'pending'
      ? `${name} needs verification. Likely type: ${device.label}. Confirm the monitor target and basic reachability first.`
      : `${name} is ${state.toUpperCase()} and currently does not need outage action.`;

  return {
    device,
    impact,
    steps: state === 'up' ? [] : steps.slice(0, 4),
    admin_note: adminNote,
  };
}

function enrichService(service = {}) {
  return {
    ...service,
    advisor: guidanceFor(service),
  };
}

module.exports = {
  classifyDevice,
  guidanceFor,
  enrichService,
};
