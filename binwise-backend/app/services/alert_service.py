"""Alert service helpers for BinWise."""

from __future__ import annotations

from typing import cast

from sqlmodel import Session, select

from uuid import UUID

from app.models.alert import Alert, AlertSeverity, AlertStatus, AlertType
from app.models.alert_settings import AlertSettings
from app.models.bin import Bin
from app.services.notification_service import send_alert_email


def create_alert(bin_record: Bin, alert_type: AlertType, severity: AlertSeverity, db: Session) -> Alert:
	"""Create a new alert, persist it, and send the notification email."""
	alert = Alert(bin_id=cast(UUID, bin_record.id), alert_type=alert_type, severity=severity)
	db.add(alert)
	db.commit()
	db.refresh(alert)
	send_alert_email(alert, db)
	return alert


def check_alerts(bin_record: Bin, db: Session) -> None:
	"""Create or resolve the open overflow alert for a bin based on its fill level."""
	settings = db.exec(select(AlertSettings)).first()
	overflow_threshold = settings.overflow_threshold if settings else 80.0

	open_overflow_alert = db.exec(
		select(Alert).where(
			Alert.bin_id == bin_record.id,
			Alert.alert_type == AlertType.overflow,
			Alert.status == AlertStatus.open,
		)
	).first()

	if bin_record.fill_pct >= overflow_threshold:
		if open_overflow_alert is None:
			create_alert(bin_record, AlertType.overflow, AlertSeverity.critical, db)
		return

	if open_overflow_alert is not None:
		open_overflow_alert.status = AlertStatus.resolved
		db.add(open_overflow_alert)
		db.commit()
