# Despliegue en Oracle Cloud (sin AWS)

Nexus corre en la **misma VM que michicondrias** (`michicondrias-app`, A1.Flex 4 OCPU / 24 GB, IP `129.213.120.99`). Esa VM ya usa todo el Ampere gratis, así que compartirla cuesta $0. AWS (Lambda, API Gateway, Amplify, Cognito, SSM) ya no se usa.

Cada proyecto tiene su propio usuario, carpeta y servicios; lo único compartido es Caddy:

| | michicondrias | Nexus |
|---|---|---|
| Usuario / carpeta | `michicondrias` / `/opt/michicondrias` | `nexus` / `/opt/nexus` |
| Puertos locales | 8000–8016 | 8100 (API), 3100 (dashboard) |
| Variables | `/etc/michicondrias/` | `/etc/nexus/` |
| Caddy | `/etc/caddy/Caddyfile` (lo genera su `gen-caddyfile.sh`) | `/etc/caddy/sites/nexus.caddy`, importado al final del Caddyfile |

| Pieza | Ahora (Oracle) | Antes (AWS) |
|---|---|---|
| API | `uvicorn` + systemd (`nexus-api`), puerto 8100 | Lambda + API Gateway |
| Dashboard | Next.js `standalone` + systemd (`nexus-dashboard`), puerto 3100 | Amplify |
| Landing | Archivos estáticos servidos por Caddy | Amplify |
| HTTPS | Caddy (`gen-caddyfile.sh`, certificados automáticos de Let's Encrypt) | API Gateway / Amplify |
| Login | **Propio en la API**: JWT + bcrypt, verificación por correo, 2FA TOTP, recuperación de contraseña | Cognito |
| Correos | SMTP (Resend u OCI Email Delivery) | Cognito |
| Variables | `/etc/nexus/api.env`, `/etc/nexus/dashboard.env` | SSM / Amplify |
| CI/CD | `.github/workflows/deploy-oracle.yml` | `deploy-backend.yml` + Amplify |
| BD | Supabase (sin cambios) | Supabase |

## 1. La VM

No hay que crear nada: se usa `michicondrias-app`. Los puertos 22, 80 y 443 ya están abiertos.

Revisa en *Networking → IP Management → Reserved public IPs* que `129.213.120.99` sea **reservada**. Si es efímera, cambia al detener/recrear la instancia y se rompen los DNS de los dos proyectos. Convertirla en reservada es gratis (incluida en Always Free).

Antes de correr el setup, despliega la versión de michicondrias que trae el cambio en su `deploy/oracle/gen-caddyfile.sh` (agrega `import /etc/caddy/sites/*.caddy`). Si no, al volver a correr el setup de michicondrias se borraría Nexus de Caddy.

## 2. Correo (reemplazo de Cognito)

La API manda los códigos de verificación y de recuperación por SMTP. Opciones:

- **Resend** (gratis hasta 3,000 correos/mes): verifica el dominio `nexusproject.pro` (registros DNS que te da Resend) y crea una API key. SMTP: `smtp.resend.com`, puerto 465, usuario `resend`, contraseña = API key.
- **OCI Email Delivery**: crea un *Approved Sender* y credenciales SMTP en tu usuario de OCI.

Sin SMTP configurado nadie podrá registrarse ni recuperar su contraseña.

## 3. Migración de la base de datos

En el SQL Editor de Supabase corre **antes de desplegar la API nueva**:

```
api/migrations/002_local_auth.sql
```

Agrega las columnas de verificación y 2FA. Los usuarios actuales quedan como verificados.

## 4. DNS (Route 53 → Hostinger)

El dominio está registrado en **Hostinger**, pero sus nameservers apuntaban a Route 53. Con la cuenta de AWS suspendida esa zona ya no responde (SERVFAIL), así que:

1. En Hostinger → Dominios → `nexusproject.pro` → **DNS / Nameservers**, cambia a los nameservers de Hostinger (o a Cloudflare, gratis).
2. Crea los registros desde cero (los de Route 53 no se pueden recuperar):
   - `api` → A → `129.213.120.99`
   - `@` (raíz) → A → `129.213.120.99`
   - `www` → A → `129.213.120.99`
   - Los registros que te pida Resend para verificar el dominio (TXT/MX/DKIM).
   - Si el dominio tenía correo u otros servicios, vuelve a crear sus registros también.
3. El cambio de nameservers puede tardar unas horas en propagarse. Caddy saca los certificados en cuanto el DNS apunta a la VM.

## 5. Preparar la VM

```bash
# En tu máquina
ssh-keygen -t ed25519 -f nexus_deploy_key -N "" -C "github-actions-nexus"

# En la VM (ssh opc@129.213.120.99 o ubuntu@...)
git clone <repo> nexus && cd nexus
sudo bash deploy/oracle/setup-vm.sh api.nexusproject.pro nexusproject.pro "$(cat nexus_deploy_key.pub)" www.nexusproject.pro
sudo nano /etc/nexus/api.env          # guía: deploy/oracle/api.env.example
sudo nano /etc/nexus/dashboard.env    # guía: deploy/oracle/dashboard.env.example
```

El setup no toca nada de michicondrias: instala Node 22 si falta, crea el usuario `nexus`, sus servicios y `/etc/caddy/sites/nexus.caddy`, agrega el `import` al Caddyfile (con respaldo `Caddyfile.bak.*`), valida la configuración y hace `reload` de Caddy (sin cortar michicondrias).

Para `api.env` usa los valores de tu `api/.env` local (`DATABASE_URL`, `SECRET_KEY`, `ENCRYPTION_KEY`, Stripe): SSM ya no es accesible. Si `ENCRYPTION_KEY` no es la misma que usaba la Lambda, los secretos que se guardaron cifrados desde producción no se podrán descifrar y hay que volver a capturarlos.

## 6. GitHub

Secrets: `ORACLE_HOST` (`129.213.120.99`), `ORACLE_SSH_KEY` (contenido de `nexus_deploy_key`), opcional `ORACLE_USER` (default `nexus`). Borra los que ya no se usan: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `COGNITO_*`.

Mientras `ORACLE_HOST` no exista el workflow se salta solo. Después, cada push a `master` despliega lo que cambió (`api/`, `dashboard/`, `landing/`), o se lanza a mano (*Deploy to Oracle VM*).

El dashboard se compila **en la VM** (así `sharp`/SWC son ARM). Cada deploy queda en `/opt/nexus/dashboard/releases/` y, si el health-check falla, vuelve solo a la release anterior.

Prueba: `curl https://api.nexusproject.pro/api/v1/health`.

## 7. Corte

1. **Stripe:** Dashboard → Webhooks → nuevo endpoint `https://api.nexusproject.pro/api/v1/billing/webhook` con los mismos eventos. Pon su `whsec_...` en `STRIPE_WEBHOOK_SECRET` y `sudo systemctl restart nexus-api`.
2. Mueve `nexusproject.pro` y `www` a la IP de la VM.
3. Avisa a los usuarios: **la primera vez entran con «¿Olvidaste tu contraseña?»**. Cognito no deja exportar contraseñas ni secretos de 2FA, así que también tienen que volver a activar el 2FA si lo usaban. La página de login ya lo indica.
4. Saca una versión nueva del **CLI** (`core/`) y de la **app móvil** (EAS build): ya apuntan a `https://api.nexusproject.pro`. Los CLI viejos llaman a la URL de API Gateway y dejarán de funcionar al apagar AWS; mientras actualizan pueden usar `NEXUS_API_URL=https://api.nexusproject.pro`.

## 8. AWS

La cuenta de AWS está **suspendida** por saldo pendiente, así que no hay nada que apagar a mano: Lambda, API Gateway, Amplify, Cognito, SSM y Route 53 ya no responden, y AWS puede dar de baja los recursos. Lo único pendiente es el saldo con AWS (Billing / soporte), que es aparte de esta migración.

## Operación

```bash
journalctl -u nexus-api -f
journalctl -u nexus-dashboard -f
sudo systemctl restart nexus-api
sudo systemctl status caddy
```

Cambiar dominios: editar `/etc/nexus/domains` y `sudo /opt/nexus/gen-caddyfile.sh | sudo tee /etc/caddy/sites/nexus.caddy && sudo systemctl reload caddy`.

Recursos: `systemd-cgtop` o `htop` muestran cuánto usa cada proyecto. El `next build` de cada deploy del dashboard usa CPU un par de minutos; michicondrias sigue respondiendo.
