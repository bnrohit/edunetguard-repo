# Security Policy

EduNetGuard is built for school infrastructure visibility and should be deployed with a privacy-first mindset.

## Do not store sensitive data

Do not store or publish:

- Student data
- Staff personal data
- Passwords
- API keys
- Firewall configs
- VPN configs
- Full IP address plans
- Internal routing configs
- Sensitive hostnames

## Recommended deployment

- Use HTTPS in production
- Keep Uptime Kuma admin private
- Expose only the read-only dashboard if public access is required
- Use generic display names for sensitive services
- Use read-only API/SNMP credentials when collectors are added
- Rotate credentials regularly

## Docker socket

The default compose file does **not** mount `/var/run/docker.sock`. Avoid mounting the Docker socket unless you fully understand the security risk.

## Reporting vulnerabilities

Please open a private security advisory or contact the maintainer if you find a security issue.
