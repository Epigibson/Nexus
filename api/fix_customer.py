import asyncio
from app.database import AsyncSessionLocal
from app.models.subscription import Subscription
from sqlalchemy import update

async def fix():
    async with AsyncSessionLocal() as session:
        await session.execute(update(Subscription).values(stripe_customer_id=None))
        await session.commit()
        print("Cleared stripe_customer_id from all subscriptions in Supabase!")

asyncio.run(fix())
