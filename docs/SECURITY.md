# Security Policy

EduNetGuard is built for school infrastructure visibility and should be deployed with a privacy-first mindset.

## Account security

EduNetGuard v0.4 uses invite-only application accounts.

- User passwords are never stored in plaintext.
- Passwords are salted and hashed with Node.js scrypt.
- Login sessions use signed HttpOnly cookies with SameSite=Lax.
- `AUTH_SECRET`, `USER_JOIN_CODE`, and `ADMIN_JOIN_CODE` belong only in the server-side `.env`.
- Normal-user and administrator join codes should be different.
- Join codes are reusable invitations until rotated; rotate them after disclosure or when a registration window ends.
- Standard users cannot access the EduNetGuard Admin Console.
- The Admin Console lists usernames/roles only; it never returns password hashes or join codes.

## Do not store sensitive operational data

Do not publish:

- Student data
- Staff personal data
- Passwords or join codes
- API keys
- Firewall configs
- VPN configs
- Full IP address plans
- Internal routing configs
- Sensitive hostnames on a public dashboard

## Recommended deployment

- Use HTTPS in production and set `COOKIE_SECURE=true`.
- Keep the monitor-management interface private to trusted administrators.
- Keep the EduNetGuard backend port loopback-only.
- Expose only the branded dashboard if broader access is required.
- Use generic display names for sensitive services.
- Use read-only API/SNMP credentials when collectors are added.
- Rotate credentials regularly.

## Persistent volumes

- `uptime-kuma-data` contains monitoring data.
- `edunetguard-user-data` contains account records and personal preferences.

Back up both volumes. Never use `docker compose down -v` during a routine update.

## Docker socket

The default compose file does **not** mount `/var/run/docker.sock`. Avoid mounting the Docker socket unless you fully understand the security risk.

## Reporting vulnerabilities

Please open a private security advisory or contact the maintainer if you find a security issue.
