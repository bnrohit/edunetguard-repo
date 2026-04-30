# Monitoring Guide

## Recommended Monitors for Schools

### Internet & Connectivity
| Service | Type | URL/IP | Why Monitor |
|---------|------|--------|-------------|
| Internet Gateway | Ping | 8.8.8.8 | Verify external connectivity |
| School Website | HTTP(s) | https://yourschool.edu | Public-facing site |
| DNS | DNS | yourschool.edu | Domain resolution |

### Internal Services
| Service | Type | URL/IP | Why Monitor |
|---------|------|--------|-------------|
| WiFi Controller | HTTP | http://wifi-controller | Network management |
| Print Server | Ping | print-server.local | Printing services |
| File Server | Ping | files.local | Shared drives |

### Learning Management
| Service | Type | URL/IP | Why Monitor |
|---------|------|--------|-------------|
| LMS (Canvas/Blackboard) | HTTP(s) | https://lms.yourschool.edu | Critical for classes |
| Google Workspace | HTTP | https://workspace.google.com | Email, Docs |
| Microsoft 365 | HTTP | https://portal.office.com | Teams, Outlook |

### Facilities
| Service | Type | URL/IP | Why Monitor |
|---------|------|--------|-------------|
| HVAC System | Ping | hvac.local | Climate control |
| Security Cameras | Ping | cameras.local | Safety |
| Bell System | Ping | bells.local | Schedules |

## Setting Up Notifications

In Uptime Kuma:
1. Go to Settings → Notifications
2. Add notification channels:
   - **Email**: IT team distribution list
   - **Slack/Teams**: #it-alerts channel
   - **SMS**: Critical outages only

## Best Practices

- **Monitor from outside**: Use external monitor for internet checks
- **Redundant checks**: Monitor critical services from multiple locations
- **Maintenance windows**: Schedule maintenance to avoid false alerts
- **Escalation**: Set up escalation for prolonged outages
