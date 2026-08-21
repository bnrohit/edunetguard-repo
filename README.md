# 🛡️ EduNetGuard

**EduNetGuard** is an open-source K-12 network continuity and infrastructure visibility platform for school IT teams.

It uses **Uptime Kuma** as the monitoring engine and adds a district-focused EduNetGuard operations layer for service health, response time, uptime, incidents, and grouped infrastructure visibility.

> Status: **v0.2** — branded operations dashboard with live Uptime Kuma v2 status-page integration.

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

## v0.2 features

- EduNetGuard-branded K-12 operations dashboard
- Uptime Kuma v2 monitoring engine
- Correct public status-page and heartbeat API integration
- Current operational/degraded/down/maintenance states
- 24-hour uptime summary
- Response-time display when available
- Active incident display from Uptime Kuma
- Monitor grouping for Core, Network Services, Servers, Schools, Wireless, Learning, Facilities, and other categories
- Node/Express read-only API layer
- React/Tailwind frontend
- Docker Compose deployment
- Configurable district branding through `config/school.json`
- Demo-mode warning when live monitoring is unavailable
- Upgrade and rollback documentation

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
                  Uptime Kuma
                    :3001
                         │
        HTTP / Ping / TCP / DNS / other monitors
```

EduNetGuard does **not** require the Uptime Kuma administrator password. It reads a published Uptime Kuma status page and its heartbeat data.

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
Uptime Kuma Admin:     http://localhost:3001
EduNetGuard API:       http://localhost:4000
```

---

## Connect live Uptime Kuma monitoring

1. Open Uptime Kuma on port `3001` and create the administrator account if this is a new installation.
2. Add the monitors you want to track.
3. Open **Status Pages**.
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

EduNetGuard reads:

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

## Upgrade from v0.1

The Uptime Kuma persistent volume remains unchanged, so existing monitors can be preserved while the EduNetGuard frontend/backend are upgraded.

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

- Keep Uptime Kuma admin access restricted to authorized IT staff
- Put externally reachable services behind HTTPS
- Restrict ports `3001` and `4000` where direct access is unnecessary
- Publish only monitor names appropriate for the dashboard audience
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
├── docs/              # Installation, monitoring, upgrade, roadmap, security
└── docker-compose.yml # Frontend + backend + Uptime Kuma
```

---

## Development

```bash
docker compose -f docker-compose.dev.yml up -d
```

Frontend: `http://localhost:3000`  
Backend: `http://localhost:4000`  
Uptime Kuma: `http://localhost:3001`

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
- Role-based access
- Teams/email alerts

See [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## License

MIT License. See [`LICENSE`](LICENSE).

---

## Acknowledgments

- [Uptime Kuma](https://github.com/louislam/uptime-kuma) for the monitoring engine
- School IT teams maintaining critical educational infrastructure
