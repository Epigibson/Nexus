#!/usr/bin/env bash
# Genera el Caddyfile (reemplazo de API Gateway + Amplify) a partir de /etc/nexus/domains.
# Uso: gen-caddyfile.sh [/etc/nexus/domains] > /etc/caddy/Caddyfile
set -euo pipefail
# shellcheck disable=SC1090
source "${1:-/etc/nexus/domains}"
: "${API_DOMAIN:?falta API_DOMAIN}" "${APP_DOMAIN:?falta APP_DOMAIN}"

cat <<EOF
$API_DOMAIN {
    encode zstd gzip
    reverse_proxy 127.0.0.1:8100
}

$APP_DOMAIN {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3100
}
EOF

if [ -n "${LANDING_DOMAIN:-}" ]; then
cat <<EOF

$LANDING_DOMAIN {
    encode zstd gzip
    root * /opt/nexus/landing
    try_files {path} {path}/ {path}.html
    file_server
    @assets path /_astro/*
    header @assets Cache-Control "public, max-age=31536000, immutable"
}
EOF
fi
