# 🛡️ EduNetGuard

**EduNetGuard** is an open-source K-12 network continuity and infrastructure visibility platform for school IT teams.

EduNetGuard presents a district-focused operations console for service health, response time, uptime, incidents, and grouped infrastructure visibility. A separate monitoring engine runs internally and is not exposed as the user-facing product.

> Status: **v0.6.0** — cube-based operations views, automatic device discovery/classification, and device-specific troubleshooting guidance.

---

## Why EduNetGuard exists

Public school districts depend on reliable connectivity for digital learning, online testing, phones, identity, safety systems, staff operations, and student services. Small IT teams often manage many campuses with mixed generations of infrastructure and need a simple way to understand continuity without exposing sensitive network details.

EduNetGuard is designed to help school IT teams:

- See service health across school sites
- Track core network, internet, DNS, DHCP, wireless, servers, learning platforms, and facilities services
- Detect outages and degraded dependencies earlier
- Communicate incidents clearly to leadership and staff
- Keep the monitoring engine separate from the public/internal status presentation
- Build toward deeper K-12 checks for DHCP, DNS, gateways, Meraki, Cisco, SNMP, and configuration risk

---

## v0.6 features

- EduNetGuard-branded continuity and network-operations dashboard
- Invite-only EduNetGuard account creation with a shared user join code
- Admin Console can reveal the normal-user join code only after the current admin re-enters their password
- Revealed join code auto-hides after 60 seconds and supports Copy/Hide
- Admins can rotate the normal-user join code after password re-authentication; existing user accounts remain valid
- Separate administrator join code for role-aware Admin Console access
- Salted scrypt password hashing; plaintext passwords are never stored
- Signed HttpOnly login sessions
- Personal `/me` dashboard with per-user favorite district monitors
- User-owned personal monitors: Website/HTTP(S), Ping/IP, TCP Port, and DNS
- Red/yellow/green site and operational-group cubes for fast outage triage
- Click-through drill-down from group → device/service details
- Automatic reverse-DNS and HTTP/TLS discovery for monitored targets
- Safe single-host Nmap service fingerprinting for administrator-approved private targets
- Device classification for VMware vCenter/ESXi, Dell/iDRAC, switches, routers, firewalls, APs, cameras, printers, Windows/Linux servers, DNS, websites, and generic infrastructure
- Device-specific 3–4 step troubleshooting playbooks when a monitor is down
- Plain-language "what to tell the admin/team" incident text with one-click copy
- Site/organization grouping on user-owned monitors
- Add/Edit/Delete/Pause/Resume/Check-Now controls on My Dashboard
- Per-user monitor status history stored persistently
- Default quota of 20 user-owned monitors per account
- Minimum interval and timeout policy controls
- Admin Console oversight for every user-owned monitor
- Private/internal targets allowed only from administrator-approved CIDRs
- Persistent `edunetguard-user-data` Docker volume for accounts/preferences
- Current Uptime Kuma 2.x monitoring engine behind the EduNetGuard product surface; v2.5.7+ provides SFTP/NTP monitoring, unlimited intervals, expanded notifications, TCP retry fixes, and current Docker security updates
- Integrated EduNetGuard Admin Console with Dashboard/Admin navigation
- One-click Monitor Management from the Admin Console
- Monitoring admin remains loopback-only by default for generic deployments; internal deployments can bind it to a trusted server interface
- Backend API bound to loopback while the frontend proxies API requests internally
- Live operational/degraded/down/maintenance states
- 24-hour uptime summary and response-time display
- Continuity health score, average response time, slowest-service indicator, and telemetry freshness
- Search by service/group/message
- Status and operational-group filters with attention-first sorting
- Live operations queue based only on actual current monitor state
- Published incident banner when the monitoring engine provides one
- Monitor grouping for Core, Network Services, Servers, Schools, Wireless, Learning, Facilities, and other categories
- Node/Express read-only aggregation API
- React/Tailwind frontend
- Docker Compose deployment
- GMCS/EduNetGuard branding through `config/school.json`
- Demo-mode warning when live monitoring is unavailable
- Safer update script and upgrade/rollback documentation

---

## Architecture

```text
                    EduNetGuard
                         │
              Branded Operations UI
                    :3000
                         │
                 EduNetGuard API
                    :4000
                         │
           Uptime Kuma public status API
                         │
          Internal Monitoring Engine
               loopback :3001
                         │
        District monitors + user-owned HTTP / Ping / TCP / DNS checks
```

EduNetGuard does **not** require an administrator password for its read-only monitoring feed. The native monitoring admin remains available only from the server loopback interface by default.

---

## Quick start

### Prerequisites

- Docker
- Docker Compose v2
- About 2 GB RAM
- Node 20+ only if running without Docker

### Install

```bash
git clone https://github.com/bnrohit/edunetguard-repo.git
cd edunetguard-repo
cp .env.example .env
docker compose up -d --build
```

Open:

```text
EduNetGuard Dashboard: http://localhost:3000
My Dashboard:           http://localhost:3000/me
EduNetGuard Admin:      http://localhost:3000/admin
Monitor Management:    configured from the EduNetGuard Admin Console
EduNetGuard API:       http://localhost:4000
```

---

## Connect the internal monitoring engine

1. On the server, open the monitoring admin on `127.0.0.1:3001` (or use the SSH tunnel documented below) and create the administrator account if this is a new installation.
2. Add the monitors you want to track.
3. Open the monitoring engine's **Status Pages**.
4. Create a published status page with slug `edunetguard`.
5. Add the monitors and organize them into groups.
6. Confirm `.env` contains:

```env
UPTIME_KUMA_STATUS_PAGE=edunetguard
```

7. Restart the backend if you changed `.env`:

```bash
docker compose up -d backend
```

EduNetGuard internally reads:

```text
/api/status-page/edunetguard
/api/status-page/heartbeat/edunetguard
```

If the page is missing or unpublished and `ALLOW_DEMO_FALLBACK=true`, EduNetGuard displays clearly marked demo data instead.

For production, after live monitoring is working, use:

```env
ALLOW_DEMO_FALLBACK=false
```

---

### Admin Console

Open:

```text
http://<edunetguard-server>:3000/admin
```

The Admin Console shows platform health, monitor counts, active alerts, maintenance state and response-time telemetry.

For generic deployments, monitor management remains loopback-only by default. To make the protected monitor editor reachable on a trusted internal server interface, set:

```env
KUMA_BIND_IP=<trusted-server-ip>
KUMA_ADMIN_PORT=3001
```

Then the Admin Console's **Open Monitor Management** button opens the monitoring engine's authenticated editor on that same server.

---

## Invite-only user accounts

EduNetGuard accounts are separate from the monitoring engine administrator account.

Configure three secrets in `.env`:

```env
AUTH_SECRET=<64+ hex characters>
USER_JOIN_CODE=<secret code you give normal users>
ADMIN_JOIN_CODE=<different secret code for EduNetGuard administrators>
```

Generate an application session secret with:

```bash
openssl rand -hex 32
```

A normal user chooses **Sign In → Create Account**, enters a username/password plus `USER_JOIN_CODE`, and receives a personal dashboard at `/me`. An account created with `ADMIN_JOIN_CODE` receives the `admin` role and can open `/admin`.

The shared join codes are reusable until you rotate or remove them from `.env`. Existing user accounts continue working after a join code is rotated.

See [`docs/ACCOUNTS.md`](docs/ACCOUNTS.md).

---

## User-owned personal monitoring

Signed-in users can open `/me` and create their own monitors without receiving access to the native monitoring-engine administrator account.

Supported personal monitor types in v0.5:

- Website / HTTP(S)
- Ping / IPv4/hostname
- TCP Port
- DNS Resolution

Each monitor belongs to its creator. Users can edit, pause/resume, manually check, or delete only their own monitors. Administrators can view, pause/resume, or delete any personal monitor from `/admin`.

Default safety policy:

```env
USER_MONITOR_MAX_PER_USER=20
USER_MONITOR_MIN_INTERVAL_SECONDS=30
USER_MONITOR_MAX_INTERVAL_SECONDS=86400
USER_MONITOR_DEFAULT_TIMEOUT_SECONDS=10
USER_MONITOR_MAX_TIMEOUT_SECONDS=30
USER_MONITOR_HISTORY_LIMIT=120
USER_MONITOR_ALLOW_PUBLIC_TARGETS=true
USER_MONITOR_ALLOWED_CIDRS=
USER_MONITOR_AUTO_DISCOVERY=true
USER_MONITOR_DISCOVERY_TIMEOUT_SECONDS=20
```

Private/internal IP monitoring is blocked until an administrator explicitly adds allowed CIDRs. Loopback, link-local, multicast, and other unsafe target ranges remain blocked.

See [`docs/USER_MONITORING.md`](docs/USER_MONITORING.md).

---

## Smart operations and device discovery

EduNetGuard v0.6 is designed to reduce operator stress during an outage.

A user adds a target with a friendly name and **Site / Organization**. EduNetGuard then:

1. runs the normal health check
2. resolves the target and reverse DNS
3. for approved private IPs only, runs a small single-host Nmap TCP service fingerprint
4. inspects safe HTTP/TLS hints when present
5. classifies the likely device/service type
6. shows a short troubleshooting playbook when that monitor is down

The built-in Nmap discovery is intentionally limited to one validated target and a fixed set of common infrastructure ports. It does not perform subnet sweeps, vulnerability scripts, credential guessing, stealth/evasion options, or broad port scans.

Public targets do **not** receive Nmap probing; they use DNS and HTTP/TLS discovery only.

See [`docs/SMART_OPERATIONS.md`](docs/SMART_OPERATIONS.md).

---

## Branding

Edit:

```text
config/school.json
```

Example:

```json
{
  "brand": {
    "productName": "EduNetGuard",
    "tagline": "K-12 Network Continuity & Infrastructure Monitoring",
    "repositoryUrl": "https://github.com/bnrohit/edunetguard-repo"
  },
  "school": {
    "name": "Example School District",
    "timezone": "America/Denver",
    "contactEmail": "technology@example.edu"
  },
  "theme": {
    "primaryColor": "#2563eb",
    "darkMode": false
  }
}
```

---

## Recommended monitor groups

Examples:

```text
Core Infrastructure
Network Services
Servers & Virtualization
Schools
Wireless
Voice
Learning Platforms
Facilities & Safety
```

See [`docs/MONITORING.md`](docs/MONITORING.md) for recommended K-12 monitors and naming guidance.

---

## Upgrade

The persistent monitoring-data volume remains unchanged, so existing monitors are preserved while the EduNetGuard frontend/backend are upgraded.

Read the full procedure before upgrading:

**[`docs/UPGRADE.md`](docs/UPGRADE.md)**

The most important rule is:

```text
Do not run docker compose down -v during an upgrade.
```

The `-v` flag can remove the persistent Uptime Kuma volume.

---

## API endpoints

| Endpoint | Description |
|---|---|
| `GET /api/status` | Current grouped monitor status, response time, uptime, incident, and source metadata |
| `GET /api/status/:id` | One monitor from the configured public status page |
| `GET /api/health` | Backend and monitoring health |
| `GET /api/config` | Dashboard configuration |
| `GET /api/sites` | Embedded site inventory sample |
| `GET /api/dhcp` | Embedded DHCP scope sample |
| `POST /api/auth/register` | Create an invite-only EduNetGuard account |
| `POST /api/auth/login` | Sign in |
| `POST /api/auth/logout` | Sign out |
| `GET /api/auth/me` | Current signed-in user |
| `PATCH /api/auth/preferences` | Save personal dashboard favorites |
| `GET /api/auth/users` | Admin-only account list |
| `GET /api/user-monitors` | Signed-in user's personal monitors and policy |
| `POST /api/user-monitors` | Create a personal monitor |
| `PATCH /api/user-monitors/:id` | Edit or pause/resume an owned monitor |
| `DELETE /api/user-monitors/:id` | Delete an owned monitor |
| `POST /api/user-monitors/:id/check` | Run an owned monitor immediately |
| `GET /api/user-monitors/admin/all` | Admin-only list of all personal monitors |

---

## Security and privacy

EduNetGuard is designed to avoid collecting student data or exposing sensitive configurations.

Do **not** publish:

- Passwords or API keys
- Internal routing configurations
- Sensitive hostnames or detailed IP plans on public dashboards
- Student/staff personal data
- Firewall rules or VPN secrets

For production:

- Keep the monitor-management port restricted to a trusted internal interface or management network
- Put externally reachable services behind HTTPS
- Keep `AUTH_SECRET`, `USER_JOIN_CODE`, and `ADMIN_JOIN_CODE` only in the server-side `.env`; never commit them
- Use different normal-user and administrator join codes
- Rotate a join code immediately if it is disclosed
- Keep port `4000` loopback-only; expose port `3001` only on a trusted internal interface when one-click monitor administration is required
- Publish only monitor names appropriate for the dashboard audience
- Keep `USER_MONITOR_ALLOWED_CIDRS` as narrow as practical; do not grant users arbitrary internal network reachability
- Personal HTTP monitors disable redirects to reduce server-side request forgery risk
- Loopback/link-local/multicast targets are blocked even for authenticated users
- Set `ALLOW_DEMO_FALLBACK=false` after validating live monitoring

See [`docs/SECURITY.md`](docs/SECURITY.md).

---

## Project structure

```text
edunetguard-repo/
├── frontend/          # React/Tailwind operations dashboard
├── backend/           # Node.js read-only API/aggregation layer
├── config/            # Public-safe dashboard branding/config
├── data/              # Demo/sample data
├── /app/user-data     # Persistent account/preferences data inside backend volume
├── docs/              # Installation, monitoring, upgrade, roadmap, security
└── docker-compose.yml # Frontend + backend + Uptime Kuma
```

---

## Development

```bash
docker compose -f docker-compose.dev.yml up -d
```

Frontend: `http://localhost:3000`  
Backend: `http://127.0.0.1:4000`  
Monitoring admin: `http://127.0.0.1:3001`

---

## ❤️ Support Open Source

EduNetGuard is intended to remain **free and open source**. If it helps your team monitor infrastructure, communicate outages, or reduce troubleshooting time, optional community support can help fund maintenance, testing, documentation, hosting, security hardening, and new capabilities.

See [`SUPPORT.md`](SUPPORT.md) for the support policy and Stripe checkout status. Donations never unlock hidden features or privileged access.

---

## Roadmap

Planned K-12 capabilities include:

- Multi-school site inventory
- Gateway/VLAN reachability checks
- DNS lookup checks per site
- DHCP scope utilization import
- Meraki API summaries
- Cisco/SNMP read-only switch health
- Configuration risk validation integration
- PDF outage and leadership reports
- Additional role and group-scoped monitor visibility
- Teams/email alerts

See [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## License

MIT License. See [`LICENSE`](LICENSE).

---

## Acknowledgments

- Uptime Kuma for the internal monitoring engine; its native UI is intentionally not the EduNetGuard user-facing experience
- School IT teams maintaining critical educational infrastructure
