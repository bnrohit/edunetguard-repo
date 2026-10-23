#!/usr/bin/env bash
# Safe, one-host discovery diagnostic inside the running EduNetGuard backend.
set -euo pipefail
if [[ $# -ne 1 || -z "${1:-}" ]]; then
  echo "Usage: bash scripts/diagnose-device.sh <approved-IP-or-hostname>" >&2
  exit 2
fi
target="$1"
docker compose exec -T -e "TARGET=$target" backend node - <<'NODE'
const { resolveAllowedTarget } = require('/app/src/monitoring/user-monitor-policy');
const { discoverMonitor } = require('/app/src/monitoring/device-discovery');
const { classifyDevice } = require('/app/src/monitoring/device-guidance');
(async () => {
  const target = process.env.TARGET;
  const resolved = await resolveAllowedTarget(target);
  const monitor = { name: 'CLI diagnostic', type: 'ping', target, status: 'pending' };
  const discovery = await discoverMonitor(monitor);
  const profile = classifyDevice(monitor, discovery);
  console.log(JSON.stringify({
    target, resolvedIp: resolved.address,
    approved: true, profile,
    icmpReachable: discovery.icmpReachable,
    sshBanner: discovery.sshBanner,
    openPorts: discovery.openPorts,
    web: discovery.web,
    nmapNote: discovery.nmapNote,
    discoveredAt: discovery.discoveredAt,
  }, null, 2));
})().catch((error) => {
  console.error('Diagnosis blocked or failed:', error.message);
  process.exitCode = 1;
});
NODE
