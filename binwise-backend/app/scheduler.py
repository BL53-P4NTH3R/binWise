"""Background scheduler jobs for BinWise."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler  # type: ignore[import-not-found]
from sqlmodel import Session, select

from app.core.database import engine
from app.models.alert_settings import AlertSettings
from app.models.bin import Bin, BinStatus


scheduler = BackgroundScheduler()


def check_offline_sensors() -> None:
	"""Mark active bins as offline when their last reading is stale."""
	with Session(engine) as session:
		settings = session.exec(select(AlertSettings)).first()
		offline_timeout_min = settings.offline_timeout_min if settings else 15
		cutoff = datetime.now(timezone.utc) - timedelta(minutes=offline_timeout_min)
		bins = session.exec(select(Bin).where(Bin.status == BinStatus.active)).all()
		for bin_record in bins:
			if bin_record.last_reading is None or bin_record.last_reading >= cutoff:
				continue
			bin_record.status = BinStatus.offline
		session.add_all(bins)
		session.commit()


def start_scheduler() -> None:
	"""Start the background scheduler once."""
	if not scheduler.running:
		scheduler.add_job(check_offline_sensors, "interval", minutes=10, id="check_offline_sensors", replace_existing=True)
		scheduler.start()
