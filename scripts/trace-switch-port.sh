#!/usr/bin/env bash
# Lookup learned switchport candidates from admin-approved SNMPv3 inventories.
# Never changes switch configuration or runs scans across an entire subnet.
set -euo pipefail
cd "$(dirname "$0")/.."
TARGET="${1:?Usage: bash scripts/trace-switch-port.sh APPROVED_PRIVATE_IPV4}"
docker compose exec -T -e "TARGET=$TARGET" backend node - <<'NODE'
const { traceSwitchPort } = require('./src/monitoring/switch-port-trace');
(async () => {
  const result = await traceSwitchPort(process.env.TARGET);
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== 'candidates') process.exitCode = 2;
})().catch(error => {
  console.error('Lookup failed:', error.message);
  process.exitCode = 1;
});
NODE
