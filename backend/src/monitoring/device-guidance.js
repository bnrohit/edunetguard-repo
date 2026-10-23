function evidenceText(monitor, discovery) {
  const pieces = [
    monitor?.name, monitor?.target,
    ...(discovery?.reverseDns || []),
    discovery?.sshBanner,
    ...(discovery?.openPorts || []).flatMap((item) => [item.service, item.product]),
    ...(discovery?.web || []).flatMap((item) => [
      item.title, item.server, item.poweredBy,
      item.certificate?.subject, item.certificate?.issuer,
    ]),
  ];
  return pieces.filter(Boolean).join(' ').toLowerCase();
}
function detectedProduct(discovery) {
  const products = (discovery?.openPorts || []).map((item) => item.product).filter(Boolean);
  const generic = /^(openssh|nginx|apache|microsoft httpapi|lighttpd|dropbear|ssl|httpd)(?:\s|\/|$)/i;
  return products.find((item) => !generic.test(item)) || null;
}
function classifyDevice(monitor, discovery) {
  const nameText = [monitor?.name, monitor?.target].filter(Boolean).join(' ').toLowerCase();
  const dnsText = (discovery?.reverseDns || []).join(' ').toLowerCase();
  const observed = [
    discovery?.sshBanner,
    ...(discovery?.openPorts || []).flatMap((p) => [p.product, p.service]),
    ...(discovery?.web || []).flatMap((w) => [w.title, w.server, w.poweredBy, w.certificate?.subject]),
  ].filter(Boolean).join(' ').toLowerCase();
  const evidence = (text, condition) => ({ text, condition });
  const ports = new Set((discovery?.openPorts || []).map((p) => p.port));
  const matches = (re) => re.test(observed);
  const named = (re) => re.test(nameText + ' ' + dnsText);
  const model = detectedProduct(discovery);
  const result = (type, label, vendor, confidence, why) => ({
    type, label, vendor, model, confidence, evidence: why,
  });
  if (matches(/vmware vcenter|vsphere client|vcenter server/) || named(/\bvcenter\b/)) {
    return result('vcenter', 'VMware vCenter', 'VMware', matches(/vcenter|vsphere/) ? 'high' : 'low', ['vCenter service or name']);
  }
  if (matches(/vmware esxi|vmware esx/) || named(/\besxi\b/)) {
    return result('esxi', 'VMware ESXi Host', 'VMware', matches(/esxi|vmware esx/) ? 'high' : 'low', ['ESXi service or name']);
  }
  if (matches(/idrac|integrated dell remote access/) || named(/\bidrac\b/)) {
    return result('dell-server', 'Dell Server / iDRAC', 'Dell', matches(/idrac/) ? 'high' : 'low', ['iDRAC management signature or name']);
  }

  // Network hardware requires special treatment: SSH alone does not imply Linux.
  const switchSignature = /cisco.*(catalyst|nx-?os|nexus)|\bcatalyst\b|\bnexus\b|extreme(?:xos| networks)?|\bexos\b|meraki\s+ms\d+|aruba.*switch|procurve|juniper.*ex\d{3,4}/i;
  const switchName = /\b(?:switch|sw(?:itch)?[-_ ]?\d+|catalyst|nexus|c9\d{3}|ms2\d{2}|ms3\d{2}|x450|x460)\b/i;
  if (switchSignature.test(observed) || named(switchName)) {
    const vendor = matches(/cisco|catalyst|nexus|nx-?os/) ? 'Cisco'
      : matches(/meraki/) ? 'Cisco Meraki'
      : matches(/extreme|exos|xos/) ? 'Extreme Networks'
      : matches(/aruba|procurve/) ? 'Aruba/HPE'
      : matches(/juniper/) ? 'Juniper Networks' : null;
    return result('switch', 'Network Switch', vendor,
      switchSignature.test(observed) ? 'high' : 'low',
      [switchSignature.test(observed) ? 'Switch-specific service/management signature' : 'Switch suggested by hostname or label; verification recommended']);
  }
  if (matches(/meraki.*\bmr\d+|wireless access point|ubiquiti.*\bunifi\b/) || named(/\b(?:wap|wireless ap|access point|mr\d{2,3})\b/)) {
    return result('access-point', 'Wireless Access Point', matches(/meraki/) ? 'Cisco Meraki' : null,
      matches(/meraki|unifi|access point/) ? 'high' : 'low', ['Wireless signature or label']);
  }
  if (matches(/vyos|routeros|mikrotik|junos|ios[ -]xe|\brouter\b/) || named(/\b(?:router|rtr|vyos|mikrotik)\b/)) {
    const vendor = matches(/vyos/) ? 'VyOS' : matches(/mikrotik|routeros/) ? 'MikroTik'
      : matches(/cisco|ios[ -]xe/) ? 'Cisco' : matches(/junos/) ? 'Juniper Networks' : null;
    return result('router', 'Router', vendor, matches(/vyos|routeros|mikrotik|junos|ios[ -]xe/) ? 'high' : 'low', ['Routing service or label']);
  }
  if (matches(/fortigate|palo alto|sonicwall|firewall/) || named(/\bfirewall\b/)) {
    return result('firewall', 'Firewall',
      matches(/fortigate/) ? 'Fortinet' : matches(/palo alto/) ? 'Palo Alto Networks' : null,
      matches(/fortigate|palo alto|sonicwall/) ? 'high' : 'low', ['Security appliance signature or label']);
  }
  if (matches(/axis|hikvision|dahua|avigilon|onvif/) || named(/\bcamera\b/) || ports.has(554)) {
    return result('camera', 'IP Camera',
      matches(/axis/) ? 'Axis' : matches(/hikvision/) ? 'Hikvision' : matches(/dahua/) ? 'Dahua' : null,
      matches(/axis|hikvision|dahua|avigilon/) ? 'high' : 'medium',
      ['Video service or camera name']);
  }
  if (matches(/jetdirect|laserjet|xerox|ricoh|printer/) || ports.has(9100) || ports.has(631)) {
    return result('printer', 'Network Printer', matches(/xerox/) ? 'Xerox' : matches(/ricoh/) ? 'Ricoh'
      : matches(/laserjet|jetdirect/) ? 'HP' : null, 'medium', ['Printing protocol or signature']);
  }
  if (monitor?.type === 'dns' || ports.has(53)) {
    return result('dns-server', 'DNS Service', null, monitor?.type === 'dns' ? 'high' : 'medium', ['DNS monitor/port']);
  }
  if (matches(/windows|microsoft-ds|rdp/) || ports.has(3389) || ports.has(445)) {
    return result('windows-server', 'Windows Server', 'Microsoft', 'medium', ['Windows-related service or port']);
  }
  if (matches(/linux|ubuntu|debian|red hat|centos/) || named(/\blinux\b/)) {
    return result('linux-server', 'Linux Server', null, matches(/linux|ubuntu|debian|red hat|centos/) ? 'medium' : 'low', ['Linux service or hostname']);
  }
  if (monitor?.type === 'http') {
    return result('website', 'Website / Web Service', null, 'medium', ['HTTP health-check type']);
  }
  if (ports.has(22) || ports.has(23) || ports.has(443)) {
    return result('network-device', 'Network / Infrastructure Device', null, 'low', ['Management ports open; hardware type not yet verified']);
  }
  return result('generic-device', 'Monitored Device', null, 'low', ['Insufficient device-specific evidence']);
}

const PLAYBOOKS = {
  vcenter: {
    suggestions: [
      'Open the vCenter management page and confirm the appliance services are running.',
      'Verify DNS and ping reachability from the management network.',
      'Check ESXi hosts and datastores separately; running VMs may still be healthy even if vCenter is down.',
      'Check appliance disk space, CPU/memory pressure, certificates, and recent service alarms.',
    ],
    report: 'vCenter management is unavailable. VM workloads may still be running; verify ESXi hosts before declaring a virtualization outage.',
  },
  esxi: {
    suggestions: [
      'Check the ESXi management IP and physical NIC/uplink state.',
      'Verify the host is reachable in vCenter and check host alarms.',
      'Check storage/iSCSI paths and datastore availability.',
      'Use the server management controller to confirm power and hardware health if the host is unreachable.',
    ],
    report: 'An ESXi host is not responding. Check host management, uplinks, storage paths, and hardware health.',
  },
  'dell-server': {
    suggestions: [
      'Open iDRAC and check power state, hardware health, and Lifecycle/SEL logs.',
      'Check server power supplies and front-panel health LEDs.',
      'Verify the connected switch port and server NIC link state.',
      'If the OS is down but iDRAC is reachable, troubleshoot the host/OS before power-cycling.',
    ],
    report: 'A Dell server is unreachable. Check iDRAC, power/hardware health, and its switch/NIC connection before rebooting.',
  },
  switch: {
    suggestions: [
      'Ping the switch management IP and its upstream gateway.',
      'Check the uplink/port-channel and physical link state on the upstream switch.',
      'Verify power, stack members, and recent interface errors.',
      'Review recent VLAN, STP, LACP, or configuration changes before rebooting.',
    ],
    report: 'A network switch is unreachable or degraded. Check power and upstream links first, then VLAN/STP/LACP state.',
  },
  router: {
    suggestions: [
      'Check the router management IP and WAN/uplink interface state.',
      'Verify the default route and routing-neighbor status.',
      'Check the upstream ISP/firewall path before restarting the router.',
      'Review recent routing, NAT, VPN, or interface changes.',
    ],
    report: 'A router is unreachable or degraded. Verify uplinks and routing before restarting it.',
  },
  firewall: {
    suggestions: [
      'Check management reachability and upstream/downstream interface status.',
      'Verify the default route, WAN link, and HA peer status if applicable.',
      'Check policy/NAT changes and resource utilization.',
      'Confirm the outage is not limited to one service before failing over or rebooting.',
    ],
    report: 'The firewall path appears degraded. Check interfaces, routing, HA, policy/NAT, and resource health.',
  },
  'access-point': {
    suggestions: [
      'Check whether the AP still has PoE power on its switch port.',
      'Verify the AP switchport VLAN/native VLAN configuration.',
      'Check controller/cloud registration and AP heartbeat status.',
      'If power and network are good, reboot the AP only after capturing its current state.',
    ],
    report: 'A wireless AP is offline. Check PoE, switchport VLANs, and controller registration before rebooting.',
  },
  camera: {
    suggestions: [
      'Check PoE power and the camera switch port.',
      'Ping the camera and try its HTTPS/RTSP service.',
      'Verify the camera VLAN and gateway path to the NVR/VMS.',
      'Check the NVR/VMS for authentication, stream, or recording errors.',
    ],
    report: 'An IP camera is offline. Check PoE and switch connectivity first, then camera/VMS reachability.',
  },
  printer: {
    suggestions: [
      'Check printer power, display errors, and Ethernet/Wi-Fi link.',
      'Ping the printer and open its web management page.',
      'Verify its IP/DHCP reservation and gateway.',
      'Check the print server queue only after network reachability is confirmed.',
    ],
    report: 'A network printer is unreachable. Check power/link and IP reachability before troubleshooting the print queue.',
  },
  'dns-server': {
    suggestions: [
      'Check whether DNS answers from another client or resolver.',
      'Verify the DNS service is running and port 53 is reachable.',
      'Check zone health, forwarders, and upstream DNS reachability.',
      'Confirm the server itself still has network connectivity and correct time.',
    ],
    report: 'DNS resolution is failing or slow. Verify the DNS service, zones/forwarders, and server network connectivity.',
  },
  'windows-server': {
    suggestions: [
      'Ping the server and test its expected application port.',
      'Check the server console or remote-management interface for OS/service health.',
      'Verify NIC, gateway, DNS, and recent Windows/service events.',
      'Check CPU, memory, disk space, and dependent services before rebooting.',
    ],
    report: 'A Windows server/service is unavailable. Check network reachability, service state, system resources, and recent events.',
  },
  'linux-server': {
    suggestions: [
      'Ping the server and test SSH or the expected application port.',
      'Check the host console/management interface if SSH is unavailable.',
      'Verify interface, route, DNS, disk space, and service status.',
      'Review recent logs and changes before restarting the service or host.',
    ],
    report: 'A Linux server/service is unavailable. Check network reachability, service state, resources, and recent logs.',
  },
  website: {
    suggestions: [
      'Check DNS resolution for the website name.',
      'Verify the web server or reverse proxy is reachable on HTTP/HTTPS.',
      'Check TLS certificate validity and recent proxy/application changes.',
      'If the server is reachable, check the application/service behind the web endpoint.',
    ],
    report: 'The website is unavailable or returning an error. Check DNS, HTTPS/reverse proxy, certificate, and application health.',
  },
  'network-device': {
    suggestions: [
      'Ping the management IP from the same management network.',
      'Check power and the upstream switch/router link.',
      'Verify the management VLAN, gateway, and expected management port.',
      'Review recent configuration changes before rebooting the device.',
    ],
    report: 'An infrastructure device is unreachable. Check power, upstream connectivity, and management VLAN/routing.',
  },
  'generic-device': {
    suggestions: [
      'Confirm the device has power and a physical network link.',
      'Ping the target and verify its IP address has not changed.',
      'Check the upstream switch port, VLAN, and gateway.',
      'Use the device management page or console to check its service status.',
    ],
    report: 'A monitored device is unavailable. Start with power, IP reachability, switch connectivity, and its management service.',
  },
};

function guidanceFor(profile, monitor) {
  const playbook = PLAYBOOKS[profile?.type] || PLAYBOOKS['generic-device'];
  const status = monitor?.status || 'pending';
  return {
    state: status === 'down' ? 'action-required' : status === 'up' ? 'healthy' : 'checking',
    headline: status === 'down'
      ? profile.label + ' needs attention'
      : status === 'up'
        ? profile.label + ' is responding'
        : 'Checking ' + profile.label,
    suggestions: playbook.suggestions.slice(0, 4),
    adminMessage: playbook.report,
  };
}

module.exports = {
  classifyDevice,
  guidanceFor,
};
