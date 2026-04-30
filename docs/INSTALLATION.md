# Installation

## Production-style Docker install

```bash
cp .env.example .env
docker compose up -d --build
```

Open:

- Dashboard: http://localhost:3000
- Uptime Kuma Admin: http://localhost:3001
- Backend health: http://localhost:4000/health

## Local development

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

## Node version

The project is tested for Node 20+ and includes `.nvmrc` set to Node 22.

```bash
nvm use
```

## Embedded demo data

EduNetGuard includes small JSON demo files under `data/`:

- `demo_status.json`
- `sites.sample.json`
- `dhcp_scopes.sample.json`

These are safe examples and do not contain real school IPs, credentials, hostnames, or student data.

## Production notes

Before exposing the dashboard publicly:

- Use HTTPS.
- Keep Uptime Kuma admin behind VPN or SSO where possible.
- Do not commit real IP plans, configs, API keys, or credentials.
- Use sanitized service names for public dashboards.
