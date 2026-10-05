"""Email service — transactional emails over SMTP (works with Resend, OCI Email Delivery, etc.)."""

import asyncio
import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger("nexus.email")


class EmailNotConfigured(RuntimeError):
    pass


def _send_sync(msg: EmailMessage) -> None:
    context = ssl.create_default_context()
    if settings.smtp_port == 465:
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, context=context, timeout=15) as smtp:
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password or "")
            smtp.send_message(msg)
    else:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            smtp.starttls(context=context)
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password or "")
            smtp.send_message(msg)


async def send_email(to: str, subject: str, text: str, html: str | None = None) -> None:
    """Send an email. Without SMTP configured, development logs it instead; production raises."""
    if not settings.smtp_host:
        if settings.is_production:
            raise EmailNotConfigured("SMTP_HOST no está configurado")
        logger.warning("SMTP no configurado — correo para %s: %s\n%s", to, subject, text)
        return

    msg = EmailMessage()
    msg["From"] = settings.email_from
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")
    await asyncio.to_thread(_send_sync, msg)


_PURPOSE_COPY = {
    "verify": ("Verifica tu correo", "Usa este código para verificar tu cuenta de Nexus:"),
    "reset": ("Restablece tu contraseña", "Usa este código para crear una nueva contraseña en Nexus:"),
}


async def send_code(to: str, code: str, purpose: str) -> None:
    """Send a one-time code (purpose: 'verify' or 'reset')."""
    title, intro = _PURPOSE_COPY[purpose]
    text = f"{intro}\n\n{code}\n\nEl código vence en 15 minutos. Si no fuiste tú, ignora este correo."
    html = f"""<div style="font-family:system-ui,sans-serif;max-width:420px;margin:auto;padding:24px">
  <h2 style="margin:0 0 12px">{title}</h2>
  <p style="color:#555">{intro}</p>
  <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:24px 0">{code}</p>
  <p style="color:#888;font-size:13px">El código vence en 15 minutos. Si no fuiste tú, ignora este correo.</p>
</div>"""
    await send_email(to, f"Nexus — {title}", text, html)
