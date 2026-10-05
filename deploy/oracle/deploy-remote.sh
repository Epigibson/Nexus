#!/usr/bin/env bash
# Corre EN la VM (como usuario nexus) después de que GitHub Actions sincroniza el código.
# Uso: deploy-remote.sh api|dashboard [...]
set -euo pipefail
BASE=/opt/nexus
PYBIN="$(cat "$BASE/python-bin" 2>/dev/null || echo python3)"

wait_http() {  # wait_http <url> <intentos>
  for _ in $(seq 1 "$2"); do
    curl -fsS -o /dev/null "$1" 2>/dev/null && return 0
    sleep 2
  done
  return 1
}

deploy_api() {
  local venv="$BASE/venv" hash
  [ -d "$venv" ] || "$PYBIN" -m venv "$venv"
  hash="$(sha256sum "$BASE/api/requirements.txt" | cut -d' ' -f1)"
  if [ "$(cat "$venv/.req-hash" 2>/dev/null || true)" != "$hash" ]; then
    echo "== api: instalando dependencias"
    "$venv/bin/pip" install -q --upgrade pip
    "$venv/bin/pip" install -q -r "$BASE/api/requirements.txt"
    echo "$hash" > "$venv/.req-hash"
  fi
  sudo systemctl enable nexus-api >/dev/null 2>&1
  sudo systemctl restart nexus-api
  if wait_http http://127.0.0.1:8100/api/v1/health 20; then echo "OK   api"; else
    echo "FAIL api -- últimas líneas del log:"; journalctl -u nexus-api --no-pager -n 20 || true
    return 1
  fi
}

deploy_dashboard() {
  local src="$BASE/dashboard-src" releases="$BASE/dashboard/releases" rel prev hash
  cd "$src"
  set -a; source /etc/nexus/dashboard.env; set +a
  hash="$(sha256sum package-lock.json | cut -d' ' -f1)"
  if [ ! -d node_modules ] || [ "$(cat node_modules/.lock-hash 2>/dev/null || true)" != "$hash" ]; then
    echo "== dashboard: npm ci"
    npm ci --no-audit --no-fund
    echo "$hash" > node_modules/.lock-hash
  fi
  echo "== dashboard: next build"
  NEXT_TELEMETRY_DISABLED=1 npm run build

  rel="$releases/$(date +%Y%m%d%H%M%S)"
  mkdir -p "$rel"
  cp -a .next/standalone/. "$rel/"
  cp -a .next/static "$rel/.next/static"
  [ -d public ] && cp -a public "$rel/public"

  prev="$(readlink -f "$BASE/dashboard/current" 2>/dev/null || true)"
  ln -sfn "$rel" "$BASE/dashboard/current"
  sudo systemctl enable nexus-dashboard >/dev/null 2>&1
  sudo systemctl restart nexus-dashboard
  if wait_http http://127.0.0.1:3100/ 20; then echo "OK   dashboard ($(basename "$rel"))"; else
    echo "FAIL dashboard -- últimas líneas del log:"; journalctl -u nexus-dashboard --no-pager -n 20 || true
    if [ -n "$prev" ] && [ -d "$prev" ]; then
      echo "== rollback a $(basename "$prev")"
      ln -sfn "$prev" "$BASE/dashboard/current"
      sudo systemctl restart nexus-dashboard
    fi
    return 1
  fi
  # conservar las últimas 3 releases
  ls -1dt "$releases"/*/ | tail -n +4 | xargs -r rm -rf
}

[ "$#" -gt 0 ] || { echo "uso: deploy-remote.sh api|dashboard [...]" >&2; exit 2; }
for component in "$@"; do
  case "$component" in
    api) deploy_api ;;
    dashboard) deploy_dashboard ;;
    *) echo "componente desconocido: $component" >&2; exit 2 ;;
  esac
done
