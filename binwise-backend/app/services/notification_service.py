"""Notification helpers for BinWise alerts."""

from __future__ import annotations

import os
import smtplib
from email.message import EmailMessage

from sqlmodel import Session, select

from app.core.database import engine
from app.models.alert import Alert
from app.models.user import User, UserRole


def get_admin_emails(db: Session) -> list[str]:
	users = db.exec(
		select(User.email).where(User.role == UserRole.admin, User.is_active == True)  # noqa: E712
	).all()
	return [email for email in users if email]


def send_alert_email(alert: Alert, db: Session) -> None:
	try:
		emails = get_admin_emails(db)
		if not emails:
			return

		message = EmailMessage()
		message["Subject"] = f"BinWise Alert: {alert.alert_type.value}"
		message["From"] = os.getenv("SMTP_FROM", os.getenv("SMTP_USER", "no-reply@binwise.local"))
		message["To"] = ", ".join(emails)
		message.set_content(
			f"Alert Type: {alert.alert_type.value}\n"
			f"Severity: {alert.severity.value}\n"
			f"Status: {alert.status.value}\n"
			f"Message: {alert.message or ''}\n"
			f"Bin ID: {alert.bin_id}\n"
		)

		host = os.getenv("SMTP_HOST", "localhost")
		port = int(os.getenv("SMTP_PORT", "25"))
		username = os.getenv("SMTP_USER")
		password = os.getenv("SMTP_PASSWORD")

		with smtplib.SMTP(host, port) as smtp:
			if os.getenv("SMTP_USE_TLS", "false").lower() == "true":
				smtp.starttls()
			if username and password:
				smtp.login(username, password)
			smtp.send_message(message)
	except Exception:
		pass


def send_password_reset_email(email: str, reset_token: str) -> None:
	"""Send a password-reset email to a single recipient."""
	try:
		message = EmailMessage()
		message["Subject"] = "BinWise password reset"
		message["From"] = os.getenv("SMTP_FROM", os.getenv("SMTP_USER", "no-reply@binwise.local"))
		message["To"] = email
		message.set_content(f"Use this token to reset your password: {reset_token}")

		host = os.getenv("SMTP_HOST", "localhost")
		port = int(os.getenv("SMTP_PORT", "25"))
		username = os.getenv("SMTP_USER")
		password = os.getenv("SMTP_PASSWORD")

		with smtplib.SMTP(host, port) as smtp:
			if os.getenv("SMTP_USE_TLS", "false").lower() == "true":
				smtp.starttls()
			if username and password:
				smtp.login(username, password)
			smtp.send_message(message)
	except Exception:
		pass
