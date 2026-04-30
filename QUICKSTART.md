# 🚀 Quick Start Guide

## 1-Minute Setup

```bash
# 1. Clone or extract the project
cd edunetguard

# 2. Start everything
docker compose up -d

# 3. Configure Uptime Kuma (visit http://localhost:3001)
#    - Create admin account
#    - Add your monitors
#    - Create a public status page

# 4. View your dashboard at http://localhost:3000
```

## What's Running?

| Service | Port | Description |
|---------|------|-------------|
| Status Dashboard | 3000 | Public-facing status page |
| Uptime Kuma Admin | 3001 | Monitoring configuration |
| Backend API | 4000 | Data aggregation API |
| Nginx | 80 | Reverse proxy |

## Customization

Edit `config/school.json` to change:
- School name & logo
- Primary color theme
- Contact information
- Display options

## Need Help?

- 📖 Full docs: `docs/INSTALLATION.md`
- 🔧 Monitoring guide: `docs/MONITORING.md`
- 🤝 Contributing: `docs/CONTRIBUTING.md`
