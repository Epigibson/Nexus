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

## 4. DNS

Baja el TTL de los registros actuales a 300 s un día antes.

- `api.nexusproject.pro` → A → `129.213.120.99` (ya, es un nombre nuevo).
- `nexusproject.pro` y `www.nexusproject.pro` → A → `129.213.120.99` **en el corte** (paso 7).

Si el DNS está en Route 53, muévelo a Cloudflare (gratis) u OCI DNS antes de cerrar AWS: copia todos los registros (incluidos MX y los de Resend) y cambia los *nameservers* en tu registrador.

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

Copia `SECRET_KEY`, `ENCRYPTION_KEY`, Stripe y `DATABASE_URL` de los secrets de GitHub o de SSM (`/nexus/prod/*`) **antes de cerrar AWS**. `ENCRYPTION_KEY` tiene que ser idéntica: con otra no se pueden descifrar los secretos guardados en la BD.

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

## 8. Apagar AWS

Una vez que todo responde desde Oracle (y copiaste los secretos):

```bash
aws cloudformation delete-stack --stack-name nexus-backend-api-prod --region us-east-1   # Lambda + API Gateway
aws amplify list-apps --region us-east-1                                                   # y luego delete-app por cada una
aws cognito-idp delete-user-pool --user-pool-id us-east-1_80HMwd889 --region us-east-1
aws ssm delete-parameters --names $(aws ssm get-parameters-by-path --path /nexus --recursive --query 'Parameters[].Name' --output text) --region us-east-1
```

Revisa también el bucket S3 de deploys de Serverless (`nexus-backend-api-prod-serverlessdeploymentbucket-*`, se borra con el stack), los logs de CloudWatch (`/aws/lambda/nexus-backend-api-prod-api`), Route 53 si ahí estaba el DNS, y la usuaria/llave IAM que usaba GitHub Actions. Al final mira **Billing → Bills** del mes siguiente para confirmar que quedó en 0.

## Operación

```bash
journalctl -u nexus-api -f
journalctl -u nexus-dashboard -f
sudo systemctl restart nexus-api
sudo systemctl status caddy
```

Cambiar dominios: editar `/etc/nexus/domains` y `sudo /opt/nexus/gen-caddyfile.sh | sudo tee /etc/caddy/sites/nexus.caddy && sudo systemctl reload caddy`.

Recursos: `systemd-cgtop` o `htop` muestran cuánto usa cada proyecto. El `next build` de cada deploy del dashboard usa CPU un par de minutos; michicondrias sigue respondiendo.
