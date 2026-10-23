# EduNetGuard v0.7.2 — Type-specific troubleshooting and switch-port lookup

This release keeps the existing ping/Nmap discovery and gives every monitor a simple
**Recommended Checks** area, including when it is healthy. Steps and read-only
command examples vary by inferred device type (switch/router/AP/camera/printer,
VMware, Dell iDRAC, Windows/Linux, DNS, websites, and generic endpoints).
Classification confidence remains visible; low-confidence guesses are not
verified asset inventory.

## Optional: Find Switch Port (SNMPv3, read-only)

Ping and Nmap cannot reveal the physical switchport that a device plugs into.
**Find Switch Port** can display *candidate learned ports* if admins configure
SNMPv3 access to both the L3 gateway ARP tables and managed switches' MAC
forwarding databases (Q-BRIDGE-MIB or BRIDGE-MIB). MAC table results can be
stale or reflect upstream trunks; the UI intentionally says **candidate**, never
**confirmed direct connection**.

The lookup is **on demand**, rate-limited (three times in ten minutes),
restricted to authenticated users' own monitors or admins, and limited to
explicitly listed and approved private IPv4 targets. SNMP requests are GET/WALK
only; this does not enable switch configuration changes. It performs **no
subnet sweep** or unauthorized discovery.

### 1. Before configuring

- Confirm the admin dashboard's approved CIDRs cover the monitored endpoint,
  L3 gateway(s), and the switches. Approval is a permission boundary, not
  a request to scan every IP.
- Enable SNMPv3 **authPriv/read-only** on your authorized gateway/switches,
  with SHA authentication and AES privacy, subject to vendor support.
- Restrict those devices' SNMPv3 management ACLs to the EduNetGuard Docker
  host egress IP. Do **not** use your SNMP write-capable account. Verify
  forwarding database views include your monitored VLANs.
- The initial version uses a **single SNMPv3 credential set** for all listed
  network devices. Other credential sets require a future enhancement.
- Store SNMP passphrases only in server-side `.env` (chmod 600; do not commit).
  Because Net-SNMP command-line utilities receive credentials as process
  arguments, host administrators with process-inspection access may see them.
  Use an appropriately scoped read-only account.

### 2. Add server-side `.env` settings

```bash
cd ~/edunetguard-repo
chmod 600 .env
nano .env
```

Add these lines after **replacing placeholders** with your actual management
IPs and SNMPv3 read-only credentials:

```dotenv
USER_MONITOR_TOPOLOGY_GATEWAYS=YOUR_LAYER3_GATEWAY_IP
USER_MONITOR_TOPOLOGY_SWITCHES=SWITCH_MGMT_IP_1,SWITCH_MGMT_IP_2
USER_MONITOR_SNMPV3_USER=YOUR_READONLY_V3_USERNAME
USER_MONITOR_SNMPV3_AUTH_PROTO=SHA
USER_MONITOR_SNMPV3_AUTH_PASS=YOUR_AUTH_PASSPHRASE
USER_MONITOR_SNMPV3_PRIV_PASS=YOUR_PRIVACY_PASSPHRASE
```

You may list up to four gateway IPs and twelve switch IPs per lookup; the
lists are *not* CIDRs. Only use IPs you administer. On Cisco IOS XE/NX-OS,
ExtremeXOS, and Meraki, confirm that SNMPv3 and MAC table MIB access are
supported/configured for your hardware and license tier. A vendor without
the relevant bridge MIBs will return **unknown**, not a fabricated port.

### 3. Deploy

```bash
cd ~/edunetguard-repo
git status --short
git checkout main
git pull --ff-only origin main
docker compose config -q
docker compose build --pull backend frontend
docker compose up -d --no-deps backend frontend
docker compose ps
curl -fsS http://127.0.0.1:4000/health
```

**Do not** run `docker compose down -v`; user monitors and Uptime Kuma
volumes remain intact. Back up your `.env` and volumes per
[UPGRADE.md](UPGRADE.md) first.

### 4. Use from My Dashboard

1. Open your EduNetGuard website (typically `http://SERVER:3000/me`).
2. Click a site cube; click the monitored device inside it.
3. Read the **recommended checks** and optionally expand **Read-only checks /
   commands**. These are platform examples, not unattended repair actions.
4. If you want connectivity evidence: use **Identify Again** first.
5. Click **Find Switch Port**. It uses current resolved IP, approved networks,
   the gateway ARP table (IP-to-MAC), and the configured switches' FDB entries
   (MAC-to-port). A found port is shown as a **candidate**.
6. Confirm candidate ports against live switch MAC tables, LLDP/CDP,
   allowed VLANs, uplinks, and your change-control process before troubleshooting
   power, cabling, or port configuration.

Even without SNMPv3 configuration, device type-based guidance works normally;
the switch-port panel explains that topology data is unavailable. Switch
management interfaces may not be learned in the same way as wired endpoints;
use upstream LLDP/CDP for those.

## Troubleshooting examples

| Device | First check | Next read-only check |
|---|---|---|
| Cisco/Extreme/Meraki switch | Switch management IP and upstream reachability | Interfaces, LACP/STP, LLDP/CDP, recent link errors |
| Wireless AP | Switchport link and PoE | VLAN/native VLAN, controller registration |
| Camera | PoE and access-switch port | RTSP/web management, NVR, camera VLAN |
| Printer | Power/network link | TCP 9100/631, reservation, print queue |
| VMware ESXi | Management NIC/uplink | iSCSI/storage path and vCenter host alarms |
| Dell/iDRAC | Controller reachability | Power, hardware events, SEL/iDRAC |
| DNS | Name resolution at expected server | Zone, forwarding and AD-integrated DNS |
| Generic/unknown | Ping/gateway/DNS | Management page and upstream switch |

No remote power cycles, configuration writes, or unverified repairs occur.

## Optional CLI port diagnosis

After adding the SNMPv3 environment settings and restarting the backend, an
administrator can request the same learned-port evidence directly on the
Docker host without entering a password into the browser:

```bash
cd ~/edunetguard-repo
bash scripts/trace-switch-port.sh YOUR_APPROVED_DEVICE_IP
```

This returns a JSON `status` of `candidates`, `unknown`, or
`not-configured`. For `candidates`, verify the candidate interface on the
listed switch before handling cables/PoE. Exit status 2 means no candidate
was found; that is **not** proof that the device is disconnected.
