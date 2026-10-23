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


## Join-code reveal controls

The normal-user join code is encrypted at rest in the EduNetGuard user-data volume after first migration from `USER_JOIN_CODE`.

- Only an authenticated EduNetGuard administrator can request reveal or rotation.
- The administrator must re-enter their current EduNetGuard password for each reveal or rotation.
- Reveal/rotation requests are rate-limited.
- Sensitive responses use `Cache-Control: no-store`.
- The Admin UI automatically hides the revealed code after 60 seconds.
- The separate administrator-registration code is never displayed by the Admin Console.
- Changing `AUTH_SECRET` after the join code has been migrated will make the encrypted user join code unreadable; preserve `AUTH_SECRET` across upgrades.


## User-owned monitoring security

EduNetGuard v0.5 allows authenticated users to create personal Website, Ping/IP, TCP, and DNS monitors. This capability is intentionally constrained.

- Every monitor has an immutable owner ID.
- Normal users can list/change/delete only monitors they own.
- Admins can review and disable or remove all personal monitors.
- Default quota: 20 monitors per user.
- Default minimum interval: 30 seconds.
- Manual checks are rate-limited.
- Public targets can be disabled globally.
- Private IPv4 targets are denied unless they match `USER_MONITOR_ALLOWED_CIDRS`.
- Loopback, link-local, multicast, unspecified, and reserved target ranges are blocked.
- Private IPv6/ULA/link-local targets are blocked in v0.5.
- HTTP monitors allow only `http://` and `https://`, reject embedded credentials, disable redirects, and pin the validated DNS address for the outbound request.
- Monitor history is stored inside `edunetguard-user-data`; do not use it for student or staff personal data.

Keep `USER_MONITOR_ALLOWED_CIDRS` limited to networks users are authorized to monitor. A broad RFC1918 allowlist can effectively give every authenticated user a network-probing capability from the EduNetGuard server.


## Smart discovery security

EduNetGuard v0.6 adds automatic device identification for personal monitors.

- Discovery always starts with the existing validated monitor target.
- Public targets do not receive Nmap service scans.
- Nmap runs only against approved private targets in `USER_MONITOR_ALLOWED_CIDRS`.
- The command is invoked with an argument array, not a shell command.
- Only one resolved host is scanned.
- Only a fixed list of common infrastructure TCP ports is scanned.
- `-sT` TCP connect scanning is used; raw-packet/privileged scan types are not required.
- `--version-light` limits service-version probing.
- `--host-timeout` bounds discovery duration.
- No NSE scripts, vulnerability tests, password guessing, evasion, spoofing, OS-aggressive detection, or subnet sweeps are used.
- Manual re-discovery is rate-limited.
- Raw scan output is not stored.
- Discovery failure does not disable the normal uptime monitor.

Administrators should keep `USER_MONITOR_ALLOWED_CIDRS` narrow. Smart discovery does not change the authorization boundary established by the monitor target policy.
