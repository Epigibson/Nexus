# Antigravity — Setup Completo

Guía para levantar el sistema completo en tu máquina local.

## Prerrequisitos

| Tool | Versión | Verificar |
|------|---------|-----------|
| Node.js | 24+ | `node --version` |
| npm | 10+ | `npm --version` |
| Python | 3.12+ | `python --version` |
| pip | 24+ | `pip --version` |
| Go | 1.26+ | `go version` |
| Git | 2.40+ | `git --version` |

## 1. Clonar el Repositorio

```bash
git clone https://github.com/acme-corp/antigravity.git
cd antigravity
```

## 2. Backend API (FastAPI)

```bash
cd api/

# Instalar dependencias Python
pip install -r requirements.txt

# Copiar variables de entorno
cp .env.example .env

# IMPORTANTE: Cambiar SECRET_KEY en .env para producción
# SECRET_KEY=tu-clave-secreta-de-64-caracteres-random

# Crear base de datos y poblar con datos de demo
python -m seed

# Iniciar servidor (puerto 8000)
uvicorn app.main:app --reload --port 8000

# Verificar:
# → http://localhost:8000       (health check)
# → http://localhost:8000/docs  (Swagger UI)
```

## 3. Dashboard (Next.js)

```bash
cd dashboard/

# Instalar dependencias Node.js
npm install

# Iniciar dev server (puerto 3000)
npm run dev

# → http://localhost:3000       (redirect a login)
# → http://localhost:3000/login (página de autenticación)
```

## 4. CLI (Go) — Opcional

```bash
cd core/

# Compilar binario
go build -o antigravity ./cmd/main.go

# Mover a PATH (opcional)
# mv antigravity /usr/local/bin/  (Linux/Mac)
# copy antigravity.exe C:\bin\    (Windows)

# Verificar
./antigravity version
```

## 5. Verificar Todo

```bash
# Health del API
curl http://localhost:8000/

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@acme-corp.com","password":"password123"}'

# Abrir dashboard
# → http://localhost:3000/login
# → Email: dev@acme-corp.com
# → Password: password123
```

## Puertos

| Servicio | Puerto | URL |
|----------|--------|-----|
| Dashboard | 3000 | http://localhost:3000 |
| API | 8000 | http://localhost:8000 |
| Swagger UI | 8000 | http://localhost:8000/docs |

## Troubleshooting

### "CORS error" en el dashboard
Asegúrate de que el API está corriendo en `:8000` y que `CORS_ORIGINS` en `.env` incluye `http://localhost:3000`.

### "Token inválido" después de reiniciar el API
El `SECRET_KEY` debe ser el mismo entre reinicios. Si lo cambias, los tokens existentes se invalidan. Haz logout y login de nuevo.

### "No se puede conectar a la base de datos"
Si es SQLite, la BD está en `api/antigravity.db`. Si el archivo no existe, corre `python -m seed` para crearla.

### "pip install falla con pydantic"
Python 3.14 puede tener problemas con ciertas versiones de pydantic-core. Usa `pip install --upgrade pip` primero, o prueba sin versiones fijas: `pip install fastapi uvicorn pydantic pydantic-settings sqlalchemy aiosqlite python-jose passlib python-multipart httpx bcrypt`.
