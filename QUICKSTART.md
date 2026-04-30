# EduNetGuard Quick Start

EduNetGuard is designed to run with one command using Docker Compose. It includes a small embedded demo dataset, so the dashboard works even before you configure live monitors.

## Requirements

- Docker Desktop or Docker Engine
- Docker Compose v2 (`docker compose version`)
- 2 GB RAM minimum

## Start

```bash
git clone https://github.com/YOURUSERNAME/edunetguard.git
cd edunetguard
cp .env.example .env
docker compose up -d --build
```

## Open

| Service | URL | Purpose |
|---|---|---|
| EduNetGuard Dashboard | http://localhost:3000 | Main dashboard |
| Uptime Kuma Admin | http://localhost:3001 | Create monitors |
| Backend API | http://localhost:4000/health | API health check |

## First setup in Uptime Kuma

1. Open http://localhost:3001
2. Create the first admin user.
3. Add monitors such as gateway ping, DNS checks, website checks, LMS/SIS checks, printer server checks, and wireless/controller checks.
4. Create a public status page named `default`.
5. Refresh http://localhost:3000.

## Demo fallback

If Uptime Kuma is not configured yet, EduNetGuard shows safe demo data from:

```text
data/demo_status.json
```

This prevents a blank dashboard during first install.

## Stop

```bash
docker compose down
```

## Update

```bash
git pull
docker compose pull
docker compose up -d --build
```
