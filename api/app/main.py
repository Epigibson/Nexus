"""Nexus Control Center — Backend API.

FastAPI application with JWT auth, SQLite/PostgreSQL, and RESTful endpoints.
"""

import logging
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db
from app.routers import auth, projects, skills, audit, dashboard, billing, teams
from app.limiter import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("nexus")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle — creates tables on boot (dev only)."""
    if settings.is_production:
        # Production (Lambda): skip table creation, migrations, and seeds
        # Tables already exist in Supabase — this saves ~1-3s per cold start
        logger.info(f"{settings.app_name} v{settings.app_version} — Production mode (skipping init_db)")
    else:
        # Development: create tables, run migrations, seed data
        await init_db()
        logger.info(f"{settings.app_name} v{settings.app_version} — Database ready")
        logger.info(f"CORS origins: {settings.cors_origins}")
        if settings.stripe_secret_key:
            logger.info("Stripe configured (test mode)")

        # Seed default data & admin account
        from app.database import async_session
        from app.services.seed_skills import seed_skills
        from app.services.admin_bootstrap import bootstrap_admin
        async with async_session() as db:
            await seed_skills(db)
            await bootstrap_admin(db)

    yield
    logger.info("Shutting down...")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Centro de Control de Entornos de Desarrollo — API Backend",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── CORS (must be added BEFORE other middleware so it's outermost in the stack) ───
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-API-Key", "Accept", "Origin", "X-Requested-With"],
    max_age=86400,  # Cache preflight for 24h to reduce OPTIONS requests
)

# ─── Global Exception Handler ───
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions — hide internal details in production."""
    # Log the full traceback internally
    logger.error(f"Unhandled exception: {exc}", exc_info=True)

    if settings.is_production:
        # Production: generic error message
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )
    else:
        # Development: include error details
        return JSONResponse(
            status_code=500,
            content={"detail": str(exc), "type": type(exc).__name__}
        )


# ─── Security Headers Middleware ───
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    # Skip security headers for CORS preflight — CORSMiddleware handles these
    if request.method == "OPTIONS":
        response = await call_next(request)
        return response
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if settings.is_production:
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.amazonaws.com https://api.stripe.com"
    return response

# ─── Routers ───
API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(projects.router, prefix=API_PREFIX)
app.include_router(skills.router, prefix=API_PREFIX)
app.include_router(audit.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)
app.include_router(billing.router, prefix=API_PREFIX)
app.include_router(teams.router, prefix=API_PREFIX)


@app.get("/", tags=["Health"])
async def health():
    return {
        "status": "ok",
        "name": settings.app_name,
        "version": settings.app_version,
    }


@app.get("/api/v1/health", tags=["Health"])
async def api_health():
    return {"status": "ok", "api": "v1"}


@app.post("/api/v1/admin/seed-skills", tags=["Admin"])
async def admin_seed_skills(request: Request):
    """Admin endpoint to seed/update skills in production database.
    Requires X-Admin-Secret header matching the SECRET_KEY."""
    # Verify admin secret
    admin_secret = request.headers.get("X-Admin-Secret")
    if not admin_secret or admin_secret != settings.secret_key:
        return JSONResponse(
            status_code=403,
            content={"detail": "Invalid admin secret"}
        )
    
    try:
        from app.database import async_session
        from app.services.seed_skills import seed_skills
        async with async_session() as db:
            count = await seed_skills(db)
            return {"status": "ok", "skills_added": count}
    except Exception as e:
        logger.error(f"Seed failed: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": f"Seed failed: {str(e)}"}
        )


@app.post("/api/v1/admin/init-db", tags=["Admin"])
async def admin_init_db(request: Request):
    """Admin endpoint to initialize database tables in production.
    Requires X-Admin-Secret header matching the SECRET_KEY."""
    # Verify admin secret
    admin_secret = request.headers.get("X-Admin-Secret")
    if not admin_secret or admin_secret != settings.secret_key:
        return JSONResponse(
            status_code=403,
            content={"detail": "Invalid admin secret"}
        )
    
    try:
        from app.database import init_db
        await init_db()
        return {"status": "ok", "message": "Database initialized"}
    except Exception as e:
        logger.error(f"Init DB failed: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": f"Init failed: {str(e)}"}
        )

# ─── AWS Lambda Handler ───
from mangum import Mangum
handler = Mangum(app, lifespan="on")
