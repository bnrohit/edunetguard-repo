#!/usr/bin/env bash
# Non-destructive check: validates a built backend can execute Nmap service fingerprinting.
set -euo pipefail
echo "== EduNetGuard backend package version =="
docker compose exec -T backend node -p "require('/app/package.json').version"
echo "== NSE engine and signatures =="
docker compose exec -T backend sh -c 'test -r /usr/share/nmap/nse_main.lua && test -r /usr/share/nmap/nmap-service-probes && echo "Nmap runtime data: OK"'
echo "== Nmap execution test as actual runtime user =="
docker compose exec -T backend sh -c '
  test "$(id -u)" = "1001" || { echo "Unexpected backend runtime UID"; exit 1; }
  nmap -n -Pn -sT -sV --version-light -p 1 --host-timeout 10s -oX - 127.0.0.1 > /tmp/edunetguard-nmap-test.xml
  grep -q "<nmaprun" /tmp/edunetguard-nmap-test.xml
  rm -f /tmp/edunetguard-nmap-test.xml
  echo "Nmap -sV single-host fingerprint: OK"
'
echo "== API and discovery readiness =="
API_PORT="${API_PORT:-4000}"
curl -fsS "http://127.0.0.1:${API_PORT}/health"
printf '\n'
