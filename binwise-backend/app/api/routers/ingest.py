"""Sensor ingestion endpoint for BinWise."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import cast
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.database import get_db
from app.models.bin import Bin, derive_fill_status
from app.models.sensor_node import SensorNode
from app.models.sensor_reading import SensorPayload, SensorReading
from app.services.alert_service import check_alerts


router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("")
def ingest_reading(payload: SensorPayload, db: Session = Depends(get_db)) -> dict[str, str]:
	"""Persist a sensor reading and update the related bin state."""
	node = db.exec(select(SensorNode).where(SensorNode.node_id == payload.sensor_id, SensorNode.is_active == True)).first()  # noqa: E712
	if node is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sensor node not found")

	bin_record = db.get(Bin, node.bin_id)
	if bin_record is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bin not found")

	reading = SensorReading(
		bin_id=cast(UUID, node.bin_id),
		node_id=payload.sensor_id,
		fill_pct=payload.fill_pct,
		battery_pct=payload.battery_pct,
		rssi_dbm=payload.rssi_dbm,
		created_at=datetime.now(timezone.utc),
	)
	db.add(reading)

	bin_record.fill_pct = payload.fill_pct
	if payload.battery_pct is not None:
		bin_record.battery_pct = payload.battery_pct
	bin_record.last_reading = reading.created_at
	bin_record.fill_status = derive_fill_status(payload.fill_pct)
	bin_record.updated_at = reading.created_at

	node.last_seen = reading.created_at

	db.add(bin_record)
	db.add(node)
	db.commit()
	db.refresh(reading)
	db.refresh(bin_record)
	check_alerts(bin_record, db)
	return {"message": "Reading ingested successfully"}
