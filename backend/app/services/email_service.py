"""
Email delivery utility.

If SMTP_HOST/SMTP_USERNAME/SMTP_PASSWORD are set in .env, real emails are
sent via smtplib (works with Gmail App Passwords, Outlook, etc.).
Otherwise, falls back to printing the email to the backend console —
this keeps the project runnable with zero paid/external services for
local demos, exactly like the existing forgot-password flow.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import settings


def _smtp_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_USERNAME and settings.SMTP_PASSWORD)


def send_email(to_email: str, subject: str, body: str) -> None:
    if not _smtp_configured():
        print("=" * 60)
        print(f"[SIMULATED EMAIL] To: {to_email}")
        print(f"Subject: {subject}")
        print(body)
        print("=" * 60)
        return

    try:
        msg = MIMEMultipart()
        msg["From"] = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
        print(f"[EMAIL SENT] to {to_email} via SMTP")
    except Exception as e:
        # Never let email failures break registration/reset flows during a local demo -
        # fall back to console output so the code is still visible.
        print(f"[EMAIL SEND FAILED - falling back to console] error={e}")
        print(f"[SIMULATED EMAIL] To: {to_email} | Subject: {subject}")
        print(body)


def send_verification_email(to_email: str, username: str, code: str) -> None:
    subject = "Verify your WaveNet account"
    body = (
        f"Hi {username},\n\n"
        f"Welcome to WaveNet! Your email verification code is:\n\n"
        f"    {code}\n\n"
        f"This code expires in 15 minutes. Enter it on the verification "
        f"page to activate your account.\n\n"
        f"If you didn't create this account, you can ignore this email."
    )
    send_email(to_email, subject, body)
