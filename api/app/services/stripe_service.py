"""Stripe billing service — handles checkout, portal, and webhook events."""

import stripe
from app.config import settings

# ─── Initialize Stripe ───
stripe.api_key = settings.stripe_secret_key

# Cache for the price ID
_premium_price_id: str | None = None


def _get_or_create_premium_price() -> str:
    """Ensure the Nexus Premium product and price exist in Stripe.
    Returns the price ID to use for checkout sessions."""
    global _premium_price_id

    if _premium_price_id and _premium_price_id != "auto":
        return _premium_price_id

    # Check if a product named "Nexus Premium" already exists
    products = stripe.Product.search(query='name:"Nexus Premium"', limit=1)

    if products.data:
        product = products.data[0]
    else:
        product = stripe.Product.create(
            name="Nexus Premium",
            description="Plan Premium de Nexus — Proyectos ilimitados, scripts automatizados y soporte prioritario.",
            metadata={"nexus_plan": "premium"},
        )

    # Find an active recurring price for this product
    prices = stripe.Price.list(product=product.id, active=True, type="recurring", limit=1)
    if prices.data:
        _premium_price_id = prices.data[0].id
    else:
        price = stripe.Price.create(
            product=product.id,
            unit_amount=1200,  # $12.00 USD
            currency="usd",
            recurring={"interval": "month"},
            metadata={"nexus_plan": "premium"},
        )
        _premium_price_id = price.id

    return _premium_price_id


def get_premium_price_id() -> str:
    """Public accessor — lazy-initializes the price."""
    configured = settings.stripe_premium_price_id
    if configured and configured != "auto":
        return configured
    return _get_or_create_premium_price()


def create_checkout_session(
    user_id: str,
    user_email: str,
    stripe_customer_id: str | None,
    success_url: str,
    cancel_url: str,
) -> str:
    """Create a Stripe Checkout session for upgrading to Premium.
    Returns the checkout URL to redirect the user to."""

    price_id = get_premium_price_id()

    session_params: dict = {
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": success_url,
        "cancel_url": cancel_url,
        "metadata": {"nexus_user_id": user_id},
        "subscription_data": {
            "metadata": {"nexus_user_id": user_id},
        },
    }

    if stripe_customer_id:
        session_params["customer"] = stripe_customer_id
    else:
        session_params["customer_email"] = user_email

    session = stripe.checkout.Session.create(**session_params)
    return session.url


def create_portal_session(stripe_customer_id: str, return_url: str) -> str:
    """Create a Stripe Customer Portal session for plan management.
    Returns the portal URL."""
    session = stripe.billing_portal.Session.create(
        customer=stripe_customer_id,
        return_url=return_url,
    )
    return session.url


def handle_webhook_event(payload: bytes, sig_header: str) -> dict:
    """Verify and parse a Stripe webhook event.
    Returns a dict with the action taken."""

    webhook_secret = settings.stripe_webhook_secret

    if webhook_secret and webhook_secret != "whsec_placeholder":
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    else:
        # Dev mode — parse without signature verification
        import json
        event = stripe.Event.construct_from(json.loads(payload), stripe.api_key)

    event_type = event.type
    data = event.data.object

    result = {"event_type": event_type, "processed": False}

    if event_type == "checkout.session.completed":
        result["user_id"] = data.metadata.get("nexus_user_id")
        result["customer_id"] = data.customer
        result["subscription_id"] = data.subscription
        result["action"] = "upgrade_to_premium"
        result["processed"] = True

    elif event_type == "customer.subscription.updated":
        result["user_id"] = data.metadata.get("nexus_user_id")
        result["customer_id"] = data.customer
        result["subscription_id"] = data.id
        result["status"] = data.status
        result["action"] = "subscription_updated"
        result["processed"] = True

    elif event_type == "customer.subscription.deleted":
        result["user_id"] = data.metadata.get("nexus_user_id")
        result["customer_id"] = data.customer
        result["action"] = "downgrade_to_free"
        result["processed"] = True

    elif event_type == "invoice.payment_failed":
        result["customer_id"] = data.customer
        result["action"] = "payment_failed"
        result["processed"] = True

    return result
