# EduNetGuard Smart Operations

EduNetGuard v0.7 turns a monitor list into a simple operator workflow.

## Operator workflow

### 1. Start with cubes

The main dashboard and personal dashboard group monitors into red/yellow/green cubes.

- **Green**: monitored items are responding.
- **Yellow**: checks are pending, paused, or in maintenance.
- **Red**: one or more monitored items are down.

Open the red cube first. Failed items are sorted to the top.

### 2. Add a personal target

Users provide:

- friendly name
- site / organization
- check type
- IP / hostname / URL
- optional TCP port
- interval / timeout
- optional notes

The user does not have to choose a hardware type.

### 3. Automatic identification

After creation, EduNetGuard performs discovery independently from the health check.

For all validated targets:

- forward DNS / target resolution
- reverse DNS when available
- HTTP/TLS title, server-header, and certificate hints when applicable

For administrator-approved **private** targets only:

- one ICMP reachability check and a one-host Nmap TCP connect scan
- `-n -Pn -sT -sV --version-light -T3 --max-retries 1` with XML result parsing
- fixed common infrastructure/service ports only
- a best-effort SSH banner check when TCP/22 is open\n- per-host timeout

EduNetGuard does not run:

- subnet or CIDR scans
- Nmap vulnerability scripts
- OS-aggressive fingerprinting
- credential guessing
- stealth/evasion features
- unrestricted all-port scans

Public targets use DNS and HTTP/TLS discovery only.

## Device classes

Current heuristic classes include:

- VMware vCenter
- VMware ESXi
- Dell server / iDRAC
- network switch
- router
- firewall
- wireless access point
- IP camera
- network printer
- Windows server
- Linux server
- DNS service
- website / web service
- generic infrastructure device

Device classification is best-effort. EduNetGuard displays a confidence level and does not invent a model when discovery evidence does not support one.

## Troubleshooting guidance

When a device is Down, the detail view shows:

- identified device type
- resolved IP / reverse DNS
- open management/service ports
- latest response
- 3–4 simple troubleshooting steps in recommended order
- a short plain-language message that can be copied to another administrator

Examples:

### Switch

1. Ping the management IP and upstream gateway.
2. Check uplink / port-channel state.
3. Check power, stack members, and interface errors.
4. Review recent VLAN/STP/LACP changes before rebooting.

### Dell server / iDRAC

1. Check iDRAC power and hardware health.
2. Check PSU / chassis indicators.
3. Verify NIC and upstream switch-port link.
4. Review Lifecycle/SEL logs before power-cycling.

### Wireless AP

1. Check PoE.
2. Check switchport/native VLAN.
3. Check controller/cloud registration.
4. Reboot only after the current state is captured.

## Discovery security controls

Environment settings:

```env
USER_MONITOR_AUTO_DISCOVERY=true
USER_MONITOR_DISCOVERY_TIMEOUT_SECONDS=20
USER_MONITOR_ALLOWED_CIDRS=
```

The administrator can now update these ranges in the **Admin Console → User-Owned Monitors → Network Discovery Policy** after password verification. The initial env setting is a default only until the first save. The persistent policy is checked on every new probe.\n\nNmap is used only when the target resolves to an explicitly allowed private address. It does not scan the CIDR itself. SSH-only services cannot reliably distinguish routers, switches and Linux servers; confidence is shown accordingly.

Manual **Identify Again** requests are rate-limited.

## Data stored

EduNetGuard stores structured discovery facts in the existing `edunetguard-user-data` volume:

- resolved IP
- reverse DNS names
- detected open ports/services
- limited web/TLS hints, SSH banner, and ICMP result
- device class/vendor/model when supported by evidence
- discovery timestamp

Raw Nmap output is not retained.
