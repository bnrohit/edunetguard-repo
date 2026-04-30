# Installation Guide

## System Requirements

- Linux/macOS/Windows with WSL2
- Docker Engine 20.10+ and Docker Compose 2.0+
- 2GB RAM minimum (4GB recommended)
- 10GB free disk space

## Standard Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/edunetguard.git
cd edunetguard
```

### 2. Configure Your School

Edit `config/school.json`:

```json
{
  "school": {
    "name": "Your School Name",
    "logo": "/assets/logo.png",
    "timezone": "America/New_York",
    "contactEmail": "tech@yourschool.edu"
  }
}
```

### 3. Start Services

```bash
# Make setup script executable and run it
chmod +x scripts/setup.sh
./scripts/setup.sh

# Start all services
docker compose up -d
```

### 4. Configure Uptime Kuma

1. Visit `http://your-server:3001`
2. Create admin account
3. Add monitors:
   - **HTTP(s)**: School website, LMS, email
   - **Ping**: WiFi access points, printers
   - **Keyword**: Check specific page content
4. Create a public status page in Uptime Kuma settings

### 5. Access Dashboard

- **Public Status Page**: `http://your-server:3000`
- **Admin Panel**: `http://your-server:3001`

## SSL/HTTPS Setup

### Using Let's Encrypt

1. Edit `nginx/ssl.conf` with your domain
2. Place certificates in `nginx/certs/`
3. Update `docker-compose.yml` to use SSL config

### Using Reverse Proxy (Recommended)

If you already have Traefik, Nginx Proxy Manager, or similar:

```yaml
# Add labels to services in docker-compose.yml
services:
  nginx:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.edunetguard.rule=Host(`status.yourschool.edu`)"
      - "traefik.http.routers.edunetguard.tls.certresolver=letsencrypt"
```

## Troubleshooting

### Services won't start

```bash
# Check logs
docker compose logs

# Check specific service
docker compose logs backend
docker compose logs uptime-kuma
```

### Can't access Uptime Kuma

Ensure port 3001 is open in your firewall:
```bash
sudo ufw allow 3001/tcp
```

### Status page shows "Unable to Connect"

1. Check backend is running: `docker compose ps`
2. Verify Uptime Kuma has a public status page configured
3. Check backend logs: `docker compose logs backend`

## Updating

```bash
./scripts/update.sh
```

## Backing Up

```bash
./scripts/backup.sh
```

Backups are saved to `./backups/`.
