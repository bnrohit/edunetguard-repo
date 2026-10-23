function evidenceText(monitor, discovery) {
  const pieces = [
    monitor?.name,
    monitor?.target,
    ...(discovery?.reverseDns || []),
    ...(discovery?.openPorts || []).flatMap((item) => [item.service, item.product]),
    ...(discovery?.web || []).flatMap((item) => [
      item.title,
      item.server,
      item.poweredBy,
      item.certificate?.subject,
      item.certificate?.issuer,
    ]),
  ];
  return pieces.filter(Boolean).join(' ').toLowerCase();
}

function detectedProduct(discovery) {
  const products = (discovery?.openPorts || [])
    .map((item) => item.product)
    .filter(Boolean);

  const generic = /openssh|nginx|apache|microsoft httpapi|lighttpd|dropbear|ssl|httpd/i;
  return products.find((item) => !generic.test(item)) || null;
}

function classifyDevice(monitor, discovery) {
  const text = evidenceText(monitor, discovery);
  const ports = new Set((discovery?.openPorts || []).map((item) => item.port));

  const match = (regex) => regex.test(text);

  if (match(/vcenter|vsphere client|vmware vcenter/)) {
    return { type: 'vcenter', label: 'VMware vCenter', vendor: 'VMware', model: detectedProduct(discovery), confidence: 'high' };
  }
  if (match(/esxi|vmware esx/)) {
    return { type: 'esxi', label: 'VMware ESXi Host', vendor: 'VMware', model: detectedProduct(discovery), confidence: 'high' };
  }
  if (match(/idrac|integrated dell remote access/)) {
    return { type: 'dell-server', label: 'Dell Server / iDRAC', vendor: 'Dell', model: detectedProduct(discovery), confidence: 'high' };
  }
  if (match(/cisco.*(nexus|nx-os|catalyst|ios)|nexus|catalyst/)) {
    return { type: 'switch', label: 'Network Switch', vendor: 'Cisco', model: detectedProduct(discovery), confidence: 'high' };
  }
  if (match(/extreme|exos|xos/) && ports.has(22)) {
    return { type: 'switch', label: 'Network Switch', vendor: 'Extreme Networks', model: detectedProduct(discovery), confidence: 'high' };
  }
  if (match(/meraki.*\\bms\\d*/)) {
    return { type: 'switch', label: 'Meraki Switch', vendor: 'Cisco Meraki', model: detectedProduct(discovery), confidence: 'high' };
  }
  if (match(/meraki.*\\bmr\\d*|wireless access point|\bwap\b|\bap\d*\b/)) {
    return { type: 'access-point', label: 'Wireless Access Point', vendor: match(/meraki/) ? 'Cisco Meraki' : null, model: detectedProduct(discovery), confidence: 'medium' };
  }
  if (match(/vyos|routeros|mikrotik|\brouter\b|\brtr\b/)) {
    return { type: 'router', label: 'Router', vendor: match(/vyos/) ? 'VyOS' : match(/mikrotik|routeros/) ? 'MikroTik' : null, model: detectedProduct(discovery), confidence: 'medium' };
  }
  if (match(/fortigate|palo alto|sonicwall|firewall/)) {
    return { type: 'firewall', label: 'Firewall', vendor: match(/fortigate/) ? 'Fortinet' : match(/palo alto/) ? 'Palo Alto Networks' : null, model: detectedProduct(discovery), confidence: 'high' };
  }
  if (match(/axis|hikvision|dahua|avigilon|onvif|camera/) || ports.has(554)) {
    return { type: 'camera', label: 'IP Camera', vendor: match(/axis/) ? 'Axis' : match(/hikvision/) ? 'Hikvision' : match(/dahua/) ? 'Dahua' : match(/avigilon/) ? 'Avigilon' : null, model: detectedProduct(discovery), confidence: 'medium' };
  }
  if (match(/printer|jetdirect|laserjet|xerox|ricoh|brother/) || ports.has(9100) || ports.has(631)) {
    return { type: 'printer', label: 'Network Printer', vendor: match(/xerox/) ? 'Xerox' : match(/ricoh/) ? 'Ricoh' : match(/brother/) ? 'Brother' : match(/laserjet|jetdirect/) ? 'HP' : null, model: detectedProduct(discovery), confidence: 'medium' };
  }
  if (monitor?.type === 'dns' || ports.has(53)) {
    return { type: 'dns-server', label: 'DNS Service', vendor: null, model: detectedProduct(discovery), confidence: monitor?.type === 'dns' ? 'high' : 'medium' };
  }
  if (match(/windows|microsoft-ds|rdp/) || ports.has(3389) || ports.has(445)) {
    return { type: 'windows-server', label: 'Windows Server', vendor: 'Microsoft', model: detectedProduct(discovery), confidence: 'medium' };
  }
  if (match(/linux|openssh/) && ports.has(22)) {
    return { type: 'linux-server', label: 'Linux Server', vendor: null, model: detectedProduct(discovery), confidence: 'medium' };
  }
  if (monitor?.type === 'http') {
    return { type: 'website', label: 'Website / Web Service', vendor: null, model: detectedProduct(discovery), confidence: 'medium' };
  }
  if (ports.has(22) || ports.has(23) || ports.has(443)) {
    return { type: 'network-device', label: 'Network / Infrastructure Device', vendor: null, model: detectedProduct(discovery), confidence: 'low' };
  }

  return { type: 'generic-device', label: 'Monitored Device', vendor: null, model: detectedProduct(discovery), confidence: 'low' };
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
