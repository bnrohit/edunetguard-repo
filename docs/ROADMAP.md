# EduNetGuard Roadmap

## v0.1 — Current MVP

- Public/read-only dashboard
- Uptime Kuma integration
- Basic API proxy
- Custom district branding
- Docker Compose deployment

## v0.2 — School/site inventory

- Add school/site records
- Add device records
- Add site type, ISP, backup internet, notes
- Import sites from CSV

## v0.3 — Network health checks

- Gateway ping checks
- DNS lookup checks
- HTTP/TCP service checks
- Site status rollup: online, warning, down

## v0.4 — DHCP visibility

- Manual DHCP utilization entry
- CSV import for Windows DHCP exports
- Critical/warning thresholds
- Scope exhaustion alerts

## v0.5 — Network device collectors

- Meraki API summary collector
- SNMP read-only switch health collector
- Cisco/Extreme interface status summaries
- AP online/offline counts

## v0.6 — Reporting

- PDF outage reports
- Weekly uptime reports
- Leadership summary reports
- Export to CSV/PDF

## v0.7 — Users and roles

- Admin, Engineer, Viewer roles
- Audit logs
- Optional MFA
- Teams/email alerts

## Design principle

EduNetGuard should collect only the minimum information required for operational visibility. It should not store passwords, student data, full configs, or sensitive network diagrams.
