# 🏫 EduNetGuard

**EduNetGuard** is an open-source K-12 network continuity and cybersecurity visibility dashboard for school IT teams.

It provides a clean public/internal status dashboard powered by [Uptime Kuma](https://github.com/louislam/uptime-kuma), with a roadmap for school-specific checks such as DHCP scope utilization, DNS health, gateway reachability, Meraki/Cisco device status, and leadership-ready outage reports.

> Status: **MVP v0.1** — usable as a school service-status dashboard today; K-12 network-specific collectors are planned in the roadmap.

---

## Why this project exists

Public school districts depend on reliable network infrastructure for digital learning, testing, phones, safety systems, staff operations, and student services. Small and rural IT teams often need a simple way to show site/service health without exposing sensitive network details.

EduNetGuard is designed to help school IT teams:

- See service health across school sites
- Track internet, DNS, wireless, LMS, printing, servers, and internal tools
- Communicate outages clearly to leadership and staff
- Keep sensitive network information out of public dashboards
- Build toward DHCP, DNS, Meraki, Cisco, and SNMP visibility in a privacy-first way

---

## Current MVP features

- Public/read-only service-status dashboard
- Uptime Kuma monitoring backend
- React frontend
- Node/Express API proxy
- Docker Compose deployment
- Custom school/district branding through `config/school.json`
- Incident history display
- Mobile-friendly UI

---

## Planned K-12 features

- Multi-school site inventory
- Gateway/VLAN reachability checks
- DNS lookup checks per site
- DHCP scope utilization import
- Meraki API summary integration
- SNMP read-only switch health collector
- PDF outage and leadership reports
- Role-based logins: Admin, Engineer, Viewer
- Microsoft Teams/email alerts

See [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## Quick start

### Prerequisites

- Docker
- Docker Compose
- About 2 GB RAM

### Run locally

```bash
git clone https://github.com/yourusername/edunetguard.git
cd edunetguard
docker compose up -d
```

Open:

```text
Dashboard: http://localhost:3000
Uptime Kuma Admin: http://localhost:3001
Backend API: http://localhost:4000
```

First, open Uptime Kuma and create an admin account. Then add monitors such as:

- Internet gateway ping
- District website
- DNS server check
- LMS or student information system URL
- Printer server or internal application
- Wireless/controller health endpoint

---

## Configuration

Edit:

```text
config/school.json
```

Example:

```json
{
  "school": {
    "name": "EduNetGuard Demo District",
    "logo": null,
    "timezone": "America/Denver",
    "contactEmail": "technology@example.edu"
  },
  "theme": {
    "primaryColor": "#2563eb",
    "darkMode": false
  },
  "display": {
    "showIncidentHistory": true,
    "refreshInterval": 30,
    "showUptimePercentage": true
  }
}
```

---

## Security and privacy

EduNetGuard is designed to avoid collecting student data or sensitive configurations.

Do **not** place the following in GitHub or public dashboards:

- Passwords or API keys
- Internal routing configs
- Sensitive hostnames
- Full IP address plans
- Student/staff personal data
- Firewall rules or VPN details

Use sanitized names and high-level checks. For production, put the dashboard behind HTTPS and only expose public-safe service names.

See [`docs/SECURITY.md`](docs/SECURITY.md).

---

## API endpoints

| Endpoint | Description |
|---|---|
| `GET /api/status` | Current monitor status summary |
| `GET /api/health` | Backend and monitoring health |
| `GET /api/config` | Dashboard configuration |

---

## Project structure

```text
edunetguard/
├── frontend/          # React dashboard
├── backend/           # Node.js API proxy
├── config/            # Public-safe dashboard config
├── nginx/             # Reverse proxy config
├── scripts/           # Setup/update/backup scripts
└── docs/              # Installation, monitoring, roadmap, security docs
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

## Contributing

Contributions are welcome. Good first issues include:

- DHCP CSV import
- DNS health check component
- Meraki API collector
- PDF outage report template
- Site inventory page
- Documentation improvements

See [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md).

---

## License

MIT License. See [`LICENSE`](LICENSE).

---

## Acknowledgments

- [Uptime Kuma](https://github.com/louislam/uptime-kuma)
- School IT teams maintaining critical education infrastructure
