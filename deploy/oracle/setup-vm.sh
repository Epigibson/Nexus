#!/usr/bin/env bash
# Prepara una VM de Oracle Cloud (Oracle Linux 9 o Ubuntu 24.04; ARM o x86) para Nexus:
# API (FastAPI/uvicorn, :8100) + dashboard (Next.js standalone, :3100) + landing (estática) detrás de Caddy.
# Puede convivir con otros proyectos en la misma VM (p. ej. michicondrias, puertos 8000-8016):
# Caddy se comparte y Nexus solo agrega /etc/caddy/sites/nexus.caddy.
# Ejecutar como root, con el repo clonado en la VM:
#   sudo bash deploy/oracle/setup-vm.sh api.nexusproject.pro nexusproject.pro "ssh-ed25519 AAAA... deploy" [www.nexusproject.pro]
# Idempotente: se puede volver a correr (p. ej. para cambiar dominios).
set -euo pipefail
API_DOMAIN="${1:?uso: setup-vm.sh <dominio-api> <dominio-dashboard> \"<llave publica ssh>\" [dominio-landing]}"
APP_DOMAIN="${2:?falta el dominio del dashboard}"
PUBKEY="${3:?falta la llave pública SSH para el usuario nexus}"
LANDING_DOMAIN="${4:-}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
BASE=/opt/nexus

PYBIN=python3
if command -v dnf >/dev/null; then
  # Oracle Linux / RHEL 9: el python3 del sistema es 3.9 y la API necesita >= 3.11
  dnf install -y rsync curl tar gcc gcc-c++ make libpq-devel firewalld policycoreutils
  if dnf install -y python3.12 python3.12-pip python3.12-devel; then PYBIN=python3.12
  else dnf install -y python3.11 python3.11-pip python3.11-devel && PYBIN=python3.11; fi

  if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
    curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
    dnf install -y nodejs
  fi

  if ! command -v caddy >/dev/null; then
    case "$(uname -m)" in aarch64) CARCH=arm64 ;; *) CARCH=amd64 ;; esac
    curl -fsSL "https://caddyserver.com/api/download?os=linux&arch=$CARCH" -o /usr/bin/caddy
    chmod 755 /usr/bin/caddy
  fi
  id caddy >/dev/null 2>&1 || useradd --system --home-dir /var/lib/caddy --create-home --shell /usr/sbin/nologin caddy
  install -d -o caddy -g caddy /etc/caddy
  [ -f /etc/systemd/system/caddy.service ] || cat > /etc/systemd/system/caddy.service <<'UNIT'
[Unit]
Description=Caddy
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
User=caddy
Group=caddy
ExecStart=/usr/bin/caddy run --environ --config /etc/caddy/Caddyfile
ExecReload=/usr/bin/caddy reload --config /etc/caddy/Caddyfile --force
TimeoutStopSec=5s
LimitNOFILE=1048576
PrivateTmp=true
ProtectSystem=full
AmbientCapabilities=CAP_NET_ADMIN CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
UNIT
  systemctl daemon-reload
else
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y python3 python3-venv python3-pip python3-dev rsync curl gpg debian-keyring debian-archive-keyring \
    apt-transport-https iptables-persistent build-essential libpq-dev
  if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
  fi
  if ! command -v caddy >/dev/null; then
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -y && apt-get install -y caddy
  fi
fi

id nexus >/dev/null 2>&1 || useradd --system --create-home --shell /bin/bash nexus
usermod -aG systemd-journal nexus   # para leer logs en deploy-remote.sh sin sudo
install -d -m 755 -o nexus -g nexus "$BASE" "$BASE/api" "$BASE/dashboard-src" "$BASE/dashboard" "$BASE/dashboard/releases" "$BASE/landing"
install -d -m 750 -o root -g nexus /etc/nexus
[ -f /etc/nexus/api.env ] || install -m 640 -o root -g nexus "$REPO/deploy/oracle/api.env.example" /etc/nexus/api.env
[ -f /etc/nexus/dashboard.env ] || install -m 640 -o root -g nexus "$REPO/deploy/oracle/dashboard.env.example" /etc/nexus/dashboard.env

# Página temporal para la landing hasta el primer deploy
[ -e "$BASE/landing/index.html" ] || echo '<!doctype html><title>Nexus</title><p>Próximamente</p>' > "$BASE/landing/index.html"
chown nexus:nexus "$BASE/landing/index.html"

echo "$PYBIN" > "$BASE/python-bin"
cat > /etc/nexus/domains <<EOF
API_DOMAIN=$API_DOMAIN
APP_DOMAIN=$APP_DOMAIN
LANDING_DOMAIN=$LANDING_DOMAIN
EOF
install -m 755 "$REPO/deploy/oracle/deploy-remote.sh" "$BASE/deploy-remote.sh"
install -m 755 "$REPO/deploy/oracle/gen-caddyfile.sh" "$BASE/gen-caddyfile.sh"
install -m 644 "$REPO/deploy/oracle/nexus-api.service" /etc/systemd/system/nexus-api.service
install -m 644 "$REPO/deploy/oracle/nexus-dashboard.service" /etc/systemd/system/nexus-dashboard.service
systemctl daemon-reload

# Llave SSH usada por GitHub Actions
install -d -m 700 -o nexus -g nexus /home/nexus/.ssh
grep -qF "$PUBKEY" /home/nexus/.ssh/authorized_keys 2>/dev/null || echo "$PUBKEY" >> /home/nexus/.ssh/authorized_keys
chown nexus:nexus /home/nexus/.ssh/authorized_keys; chmod 600 /home/nexus/.ssh/authorized_keys
command -v restorecon >/dev/null && restorecon -R /home/nexus/.ssh || true

# sudo mínimo: solo gestionar sus propios servicios
cat > /etc/sudoers.d/nexus <<'SUDO'
nexus ALL=(root) NOPASSWD: /usr/bin/systemctl enable nexus-api, /usr/bin/systemctl restart nexus-api, /usr/bin/systemctl status nexus-api, /usr/bin/systemctl enable nexus-dashboard, /usr/bin/systemctl restart nexus-dashboard, /usr/bin/systemctl status nexus-dashboard
SUDO
chmod 440 /etc/sudoers.d/nexus

# Caddy compartido (saca los certificados TLS solo): cada proyecto deja sus sitios en /etc/caddy/sites/
# y el Caddyfile principal los importa. Así no se toca la configuración de los demás proyectos.
install -d -m 755 /etc/caddy/sites
"$BASE/gen-caddyfile.sh" /etc/nexus/domains > /etc/caddy/sites/nexus.caddy
IMPORT_LINE='import /etc/caddy/sites/*.caddy'
# El Caddyfile de ejemplo del paquete de Ubuntu ocupa :80 para todos los hosts; si sigue ahí, se reemplaza
if [ ! -f /etc/caddy/Caddyfile ] || grep -q '/usr/share/caddy' /etc/caddy/Caddyfile; then
  echo "$IMPORT_LINE" > /etc/caddy/Caddyfile
elif ! grep -qF "$IMPORT_LINE" /etc/caddy/Caddyfile; then
  cp /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.bak.$(date +%Y%m%d%H%M%S)"
  printf '\n%s\n' "$IMPORT_LINE" >> /etc/caddy/Caddyfile
fi
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl enable caddy
if systemctl is-active --quiet caddy; then systemctl reload caddy; else systemctl start caddy; fi

# Firewall del SO (además de la Security List de OCI): abrir 80/443
if command -v firewall-cmd >/dev/null; then
  systemctl enable --now firewalld
  firewall-cmd --permanent --add-service=http --add-service=https
  firewall-cmd --reload
else
  for port in 80 443; do
    iptables -C INPUT -p tcp --dport $port -j ACCEPT 2>/dev/null || iptables -I INPUT 5 -p tcp --dport $port -j ACCEPT
  done
  netfilter-persistent save
fi
command -v restorecon >/dev/null && restorecon -R "$BASE" /etc/caddy || true

echo "Listo. Siguiente: editar /etc/nexus/api.env y /etc/nexus/dashboard.env, y lanzar el workflow 'Deploy to Oracle VM'."
