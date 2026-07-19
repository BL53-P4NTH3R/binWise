"""Alert and alert-settings routes for BinWise."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlmodel import Session, select

from app.core.database import get_db
from app.core.security import require_admin
from app.models.alert import Alert, AlertRead, AlertResolve, AlertSeverity, AlertStatus
from app.models.alert_settings import AlertSettings, AlertSettingsRead, AlertSettingsUpdate
from app.models.user import User


router = APIRouter(tags=["alerts"])


@router.get("/alerts", response_model=list[AlertRead])
def list_alerts(
	status_filter: str = Query(default="all", alias="status"),
	severity: AlertSeverity | None = Query(default=None),
	db: Session = Depends(get_db),
) -> list[Alert]:
	"""Return alerts ordered by newest first with optional status and severity filters."""
	query = select(Alert)
	if status_filter != "all":
		query = query.where(Alert.status == AlertStatus(status_filter))
	if severity is not None:
		query = query.where(Alert.severity == severity)
	alerts = db.exec(query).all()
	return sorted(alerts, key=lambda alert: alert.created_at, reverse=True)


@router.patch("/alerts/{alert_id}/resolve", response_model=AlertRead)
def resolve_alert(
	alert_id: UUID,
	_admin: User = Depends(require_admin),
	db: Session = Depends(get_db),
) -> Alert:
	"""Mark an alert as resolved by the current admin."""
	alert = db.get(Alert, alert_id)
	if alert is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
	alert.status = AlertStatus.resolved
	alert.resolved_by = _admin.id
	alert.resolved_at = datetime.now(timezone.utc)
	db.add(alert)
	db.commit()
	db.refresh(alert)
	return alert


@router.get("/settings/thresholds", response_model=AlertSettingsRead)
def get_thresholds(db: Session = Depends(get_db)) -> AlertSettings:
	"""Return the singleton alert settings row."""
	settings = db.exec(select(AlertSettings)).first()
	if settings is None:
		settings = AlertSettings()
		db.add(settings)
		db.commit()
		db.refresh(settings)
	return settings


@router.patch("/settings/thresholds", response_model=AlertSettingsRead)
def update_thresholds(
	payload: AlertSettingsUpdate,
	_admin: User = Depends(require_admin),
	db: Session = Depends(get_db),
) -> AlertSettings:
	"""Update the singleton alert settings row."""
	settings = db.exec(select(AlertSettings)).first()
	if settings is None:
		settings = AlertSettings()

	for field_name, value in payload.model_dump(exclude_unset=True).items():
		setattr(settings, field_name, value)

	settings.updated_at = datetime.now(timezone.utc)
	db.add(settings)
	db.commit()
	db.refresh(settings)
	return settings
