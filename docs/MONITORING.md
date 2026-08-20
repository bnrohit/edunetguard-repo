# Monitoring Guide

EduNetGuard v0.2 uses Uptime Kuma as its monitoring engine and reads monitor state from a published Uptime Kuma status page. This keeps the EduNetGuard dashboard read-only and avoids storing Uptime Kuma administrator credentials in the application.

## Connect Uptime Kuma to EduNetGuard

1. Open Uptime Kuma on port `3001`.
2. Create the monitors you need.
3. Open **Status Pages** and create a page with slug `edunetguard`.
4. Add the monitors EduNetGuard should display.
5. Group the monitors by operational purpose.
6. Publish/save the status page.
7. Set the same slug in `.env`:

```env
UPTIME_KUMA_STATUS_PAGE=edunetguard
```

EduNetGuard reads both of these Uptime Kuma v2 endpoints:

```text
/api/status-page/edunetguard
/api/status-page/heartbeat/edunetguard
```

The first supplies the published monitor groups and active incident. The heartbeat endpoint supplies current monitor state, response time, and 24-hour uptime.

## Recommended Monitor Groups for Schools

### Core Infrastructure

| Service | Type | Why Monitor |
|---|---|---|
| Core switch | Ping | Detect core or management reachability loss |
| Internet edge | Ping/HTTP | Confirm district internet path health |
| WAN handoff | Ping | Identify site/WAN reachability failures |

### Network Services

| Service | Type | Why Monitor |
|---|---|---|
| Primary DNS | DNS/Ping | Verify name-resolution dependency |
| Secondary DNS | DNS/Ping | Confirm resolver redundancy |
| DHCP service | TCP/Ping/custom | Detect address-assignment dependency failures |
| Wireless controller/cloud endpoint | HTTP(s) | Confirm wireless management availability |

### Servers & Virtualization

| Service | Type | Why Monitor |
|---|---|---|
| vCenter or hypervisor management | HTTP(s) | Virtual infrastructure visibility |
| Domain services | Ping/TCP | Authentication and directory dependency |
| Backup platform | HTTP(s) | Backup-management availability |
| File/print services | Ping/TCP | Staff operational services |

### Learning Platforms

| Service | Type | Why Monitor |
|---|---|---|
| LMS | HTTP(s) | Classroom continuity |
| Google Workspace | HTTP(s) | Productivity and communication |
| Microsoft 365 | HTTP(s) | Teams, Outlook, and cloud productivity |
| Student information system | HTTP(s) | Instructional and administrative continuity |

### Facilities & Safety

| Service | Type | Why Monitor |
|---|---|---|
| HVAC management | Ping/HTTP | Facilities operations |
| Camera management | Ping/HTTP | Safety-system visibility |
| Bell/intercom | Ping | School communication dependency |

## Multi-site Naming

Use names that are useful to IT staff but do not expose unnecessary sensitive details on a public status page. Examples:

```text
Core Infrastructure
  NOC Core 01
  NOC Core 02

Network Services
  Primary DNS
  Secondary DNS
  District DHCP

Schools
  High School A WAN
  Elementary School B WAN
```

If the dashboard is publicly reachable, avoid publishing internal IP addresses, credentials, detailed topology information, or sensitive hostnames.

## Notifications

Notifications remain configured in Uptime Kuma:

1. Go to **Settings → Notifications**.
2. Configure email, Teams/Slack/webhook, or another supported channel.
3. Attach notification channels to the appropriate monitors.
4. Reserve high-noise channels such as SMS for genuinely critical monitors.

## Maintenance

Use Uptime Kuma maintenance windows for planned changes. EduNetGuard understands the Uptime Kuma maintenance state and displays it separately from a true outage.

## Best Practices

- Monitor critical dependencies separately instead of using only one generic internet check.
- Use redundant checks for high-impact services.
- Group monitors by operational purpose so EduNetGuard remains readable across many campuses.
- Keep the Uptime Kuma admin interface restricted to authorized IT staff.
- Use HTTPS/reverse proxy protection when exposing the dashboard beyond the management network.
- Set `ALLOW_DEMO_FALLBACK=false` in production after live monitoring is verified so a monitoring failure cannot be mistaken for real status data.

See `UPGRADE.md` for deployment and migration steps.
