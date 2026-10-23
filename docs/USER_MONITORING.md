# User-Owned Monitoring

EduNetGuard v0.5 gives each authenticated user a private set of personal monitors in **My Dashboard**.

## Supported types

### Website / HTTP(S)

Checks an `http://` or `https://` URL.

- HTTP 2xx/3xx is Up.
- HTTP 4xx/5xx is Down.
- Redirects are disabled.
- Embedded URL credentials are rejected.
- The resolved destination is validated by the target policy before the request.

### Ping / IP

Sends one ICMP ping to the validated target.

### TCP Port

Tests whether a TCP connection can be established to the selected host and port.

### DNS

Checks whether the selected hostname resolves and records response time.

## Ownership

A monitor created by one user cannot be edited, paused, manually checked, or deleted by another normal user.

Administrators can view all personal monitors from the Admin Console.

## Quotas and intervals

Defaults:

- 20 personal monitors per user
- 30-second minimum interval
- 24-hour maximum interval
- 10-second default timeout
- 30-second maximum timeout
- 120 recent results retained per monitor

These values are server-side environment settings.

## Target policy

Public targets are allowed by default.

Private IPv4 targets require explicit administrator approval through:

```env
USER_MONITOR_ALLOWED_CIDRS=10.128.0.0/16,10.250.0.0/16
```

If a user tries to create a target outside policy, the API rejects the monitor.

Blocked by default regardless of user authentication:

- localhost
- IPv4 loopback
- link-local addresses
- multicast addresses
- unspecified/reserved addresses
- private IPv6/ULA/link-local addresses

## Admin guidance

Do not configure `10.0.0.0/8`, `172.16.0.0/12`, or `192.168.0.0/16` broadly unless every EduNetGuard user is authorized to probe the entire corresponding space.

Use narrower school/site/NOC ranges whenever possible.
