# EduNetGuard v0.7.1 — Upgrade and device identification

v0.7 adds administrator-editable and persistent private IPv4 CIDR approvals, ICMP
reachability, Nmap XML service fingerprints, SSH server-banner hints, and stronger
switch/router/device classification with confidence and evidence.

## Before updating

Run on the existing EduNetGuard Linux Docker server. Verify the current project
directory; do not clone a second installation over a working one.

```bash
cd ~/edunetguard-repo
git status --short
docker compose ps
```

Record or safely back up your existing `.env`, the backend's persistent
`edunetguard-user-data` volume, and the Uptime Kuma data. Do not upload them
to GitHub. If you have uncommitted repository changes, resolve them before
pulling; `git pull --ff-only` deliberately refuses merges.

```bash
mkdir -p backups
cp -p .env "backups/.env.$(date +%Y%m%d-%H%M%S)"
docker compose exec -T backend sh -c 'cd /app/user-data && tar -czf - .' \
  > "backups/user-data.$(date +%Y%m%d-%H%M%S).tar.gz"
```

For a consistent Uptime Kuma SQLite backup, use its built-in backup/export or
stop the engine and snapshot its Docker volume before upgrading. Do not run
`docker compose down -v` or remove any volumes.

## Install approved release (after merging PR)

```bash
git checkout main
git fetch origin
git pull --ff-only origin main
docker compose config -q
docker compose build --pull frontend backend
docker compose up -d --no-deps backend frontend
docker compose ps
```

This upgrade does **not** require rebuilding or pulling Uptime Kuma.

## Enable internal networks without an immediate admin dashboard session

The legacy `.env` setting remains a first-boot default:

```env
USER_MONITOR_ALLOWED_CIDRS=10.128.0.0/16,10.250.0.0/16
USER_MONITOR_AUTO_DISCOVERY=true
USER_MONITOR_DISCOVERY_TIMEOUT_SECONDS=20
```

Only add private subnets that you are authorized to monitor. Do not blindly copy
example networks to a production deployment. Once an administrator clicks
**Save Approved CIDRs**, the saved policy in `/app/user-data/monitor-allowlist.json`
becomes authoritative. Later `.env` changes will not overwrite dashboard
policy. Admin may clear all CIDRs to deny internal monitoring.

If you change `.env` before dashboard management is enabled, restart only the
backend: `docker compose up -d --no-deps --force-recreate backend`.

## Dashboard CIDR management

1. Open `http://SERVER:3000/admin` (or your HTTPS reverse proxy).
2. Go to **User-Owned Monitors → Network Discovery Policy**.
3. Enter one permitted private IPv4 subnet per line, e.g.
   `10.128.0.0/16` and `10.250.0.0/16`. Smaller allocations are safer.
4. Enter your EduNetGuard admin account password and save.
5. Open a personal monitor's detail view and choose **Identify Again**.
6. Check ICMP result, open TCP service ports, SSH banner, device type,
   classification confidence, and any Nmap error messages.

Passwords are used to authenticate the policy update; they are not saved in the
CIDR policy file. Only administrators can edit these ranges.

## Verify after deploy

```bash
docker compose ps
docker compose exec -T backend nmap --version | head -2
docker compose exec -T backend ping -c 1 -W 2 10.128.10.151 || true
curl -fsS http://127.0.0.1:4000/health && echo
docker compose logs --tail=80 backend
```

For an approved private IP, run a complete one-host diagnosis from the container:

```bash
bash scripts/diagnose-device.sh 10.128.10.151
```

This prints CIDR validation, ICMP, Nmap open ports, SSH banner, web/TLS hints,
classification and confidence. It does not scan any subnet. An unapproved
target is rejected before sending probes.

The sample ping is **only** a connectivity test from the container to a
management address you own; replace `10.128.10.151` with your actual target.
A failed ping does not necessarily mean the device is down (ICMP may be blocked).
Use **Identify Again** to test Nmap. Exact switch model identification requires
a model-specific management banner or an authenticated inventory source.
An OpenSSH banner alone cannot prove the device is a Linux server.

## Rollback

Restore the earlier checked-out Git commit and rebuild only frontend/backend.
Retain the same Docker volumes and `.env`. The new
`monitor-allowlist.json` is additive; v0.6 ignores it. If rolling back to a
version without dashboard CIDR management, make sure the correct authorized
ranges are set in `.env`. Never run `docker compose down -v`.


## v0.7.1 Nmap NSE fix and version check

The original Alpine backend Dockerfile installed `nmap` alone, so `-sV` failed
with `could not locate nse_main.lua`. Version 0.7.1 installs
`nmap-nselibs` and `nmap-scripts` and smoke-tests the engine during build.

Use `bash scripts/verify-discovery.sh` after the backend rebuild.
The diagnostic tests Nmap's real `-sV` mode as the non-root backend user,
without scanning any external machine. Then try your authorized device:

```bash
bash scripts/diagnose-device.sh 10.250.252.1
```

The API health endpoint now separately exposes `device_discovery` status.
The `version` in `/health` is read from `/app/package.json` inside the
running backend container; it is not hard-coded to 0.6.0.
If the health response still reports 0.6.0 after this upgrade, compare the
checked-out and container package versions:

```bash
git rev-parse --short HEAD
grep -m1 '"version"' backend/package.json
docker compose exec -T backend node -p "require('/app/package.json').version"
```

CIDR examples: `10.7.252.1/32` authorizes precisely one IP; `10.7.252.0/24`
authorizes all 256 addresses in that subnet. Approve only ranges you manage.
A saved dashboard CIDR policy overrides `.env` defaults.
