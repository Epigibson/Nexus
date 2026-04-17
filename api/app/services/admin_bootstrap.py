"""Bootstrap admin account — ensures the platform owner has unlimited access."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.organization import Organization, OrganizationMember

ADMIN_EMAIL = "hackminor@live.com.mx"


async def bootstrap_admin(db: AsyncSession) -> None:
    """Ensure the admin account has enterprise-level unlimited access."""
    result = await db.execute(
        select(User).where(User.email == ADMIN_EMAIL)
    )
    admin = result.scalar_one_or_none()
    if not admin:
        return

    changed = False

    # Upgrade user plan
    if admin.plan != "enterprise":
        admin.plan = "enterprise"
        changed = True

    # Upgrade organization
    member_result = await db.execute(
        select(OrganizationMember.org_id)
        .where(OrganizationMember.user_id == admin.id)
        .limit(1)
    )
    org_id = member_result.scalar_one_or_none()

    if org_id:
        org_result = await db.execute(
            select(Organization).where(Organization.id == org_id)
        )
        org = org_result.scalar_one_or_none()
        if org and org.plan != "enterprise":
            org.plan = "enterprise"
            org.max_projects = 999999
            org.max_members = 999999
            changed = True

    if changed:
        await db.commit()
        print(f"👑 Admin {ADMIN_EMAIL} → Enterprise (unlimited)")
    else:
        print(f"👑 Admin {ADMIN_EMAIL} already Enterprise ✓")
