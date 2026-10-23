# EduNetGuard v0.4 Upgrade Guide

v0.4 adds invite-only EduNetGuard user accounts, personal dashboards, role-aware administration, and current Uptime Kuma 2.x monitoring capabilities.

## Data preserved

Two Docker volumes are persistent:

- `uptime-kuma-data` — monitoring configuration and history
- `edunetguard-user-data` — EduNetGuard usernames, salted password hashes, roles, and personal dashboard preferences

Never run:

```bash
docker compose down -v
```

## 1. Update the repository

```bash
cd ~/edunetguard-repo
git checkout main
git fetch origin
git pull --ff-only origin main
```

## 2. Configure account secrets

Make sure `.env` exists:

```bash
test -f .env || cp .env.example .env
```

Generate a session signing secret if one is not configured:

```bash
AUTH=$(openssl rand -hex 32)

grep -q '^AUTH_SECRET=' .env \
  && sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=$AUTH|" .env \
  || echo "AUTH_SECRET=$AUTH" >> .env
```

Choose a normal-user join code and a **different** administrator join code:

```bash
USER_CODE='CHANGE-THIS-USER-CODE'
ADMIN_CODE='CHANGE-THIS-ADMIN-CODE'

grep -q '^USER_JOIN_CODE=' .env \
  && sed -i "s|^USER_JOIN_CODE=.*|USER_JOIN_CODE=$USER_CODE|" .env \
  || echo "USER_JOIN_CODE=$USER_CODE" >> .env

grep -q '^ADMIN_JOIN_CODE=' .env \
  && sed -i "s|^ADMIN_JOIN_CODE=.*|ADMIN_JOIN_CODE=$ADMIN_CODE|" .env \
  || echo "ADMIN_JOIN_CODE=$ADMIN_CODE" >> .env
```

Do not commit `.env`.

For the existing GMCS server, if Monitor Management should remain directly reachable from the trusted internal network:

```bash
grep -q '^KUMA_BIND_IP=' .env \
  && sed -i 's/^KUMA_BIND_IP=.*/KUMA_BIND_IP=10.250.31.192/' .env \
  || echo 'KUMA_BIND_IP=10.250.31.192' >> .env
```

## 3. Pull and rebuild

```bash
docker compose config >/dev/null && echo "Compose OK"

docker compose pull uptime-kuma
docker compose build --pull frontend backend
docker compose up -d
```

The official Uptime Kuma `:2` tag tracks current stable 2.x releases. Verify the actual engine version after the pull:

```bash
docker exec edunetguard-kuma node -p "require('./package.json').version"
```

v2.5.7 or later includes the recent SFTP/NTP-era feature set and latest TCP/Docker security fixes.

## 4. Verify EduNetGuard

```bash
docker compose ps

curl -fsS http://127.0.0.1:4000/health
echo

curl -fsS http://127.0.0.1:4000/auth/config
echo

curl -fsSI http://127.0.0.1:3000 | head

docker volume ls | grep -E 'uptime-kuma|edunetguard-user'
```

Expected EduNetGuard version: `0.4.0`.

## 5. Create your EduNetGuard administrator account

Open:

```text
http://10.250.31.192:3000
```

Choose **Sign In → Create Account**.

Use:

- your chosen username
- a password of at least 10 characters
- the value of `ADMIN_JOIN_CODE`

That account receives the `admin` role. After your administrator exists, you may blank or rotate `ADMIN_JOIN_CODE` to prevent additional administrator registrations.

## 6. Give users the normal join code

Give approved users only the `USER_JOIN_CODE`.

They create their own username/password from the same **Create Account** form. Their account receives the normal `user` role and gets:

```text
http://10.250.31.192:3000/me
```

Each user can pin a different set of monitors to their personal dashboard.

## 7. Admin Console

Administrators see:

```text
http://10.250.31.192:3000/admin
```

The console includes the current EduNetGuard user list but never exposes password hashes or join codes.

## Security notes

- The join code is an invitation secret, not the user's password.
- Passwords are salted and hashed with scrypt.
- Sessions use signed HttpOnly cookies.
- Rotate `USER_JOIN_CODE` if it is shared outside the intended group.
- Keep `ADMIN_JOIN_CODE` separate and more restrictive.
- When HTTPS is enabled end-to-end, set `COOKIE_SECURE=true`.
