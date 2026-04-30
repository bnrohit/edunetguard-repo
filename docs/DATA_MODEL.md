# Embedded Data Model

EduNetGuard v0.1 uses small JSON files for demo and future import examples.

## Site record

```json
{
  "name": "Demo High School",
  "siteType": "High School",
  "status": "online",
  "internetProvider": "Fiber",
  "backupInternet": "LTE/Starlink optional",
  "gateway": "10.x.x.1",
  "dns": ["10.x.x.x"],
  "dhcpScopes": ["10.x.x.0/24"],
  "notes": "Use sanitized values only."
}
```

## DHCP scope record

```json
{
  "site": "Demo High School",
  "scope": "10.x.x.0/24",
  "vlan": "Staff",
  "used": 180,
  "free": 40,
  "percentUsed": 82
}
```

## API endpoints

- `GET /api/status`
- `GET /api/config`
- `GET /api/sites`
- `GET /api/dhcp`
- `GET /api/health`
