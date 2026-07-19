"""Bin endpoints for BinWise."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlmodel import Session, select

from app.core.database import get_db
from app.core.security import require_admin
from app.models.bin import Bin, BinCreate, BinLive, BinRead, BinStatus, BinSummary, BinUpdate, derive_fill_status
from app.models.route_waypoint import RouteWaypoint, WayPointStatus
from app.models.user import User


router = APIRouter(prefix="/bins", tags=["bins"])


def _bin_live_payload(bin_record: Bin) -> dict[str, object]:
	"""Serialize the live bin fields used by the dashboard map."""
	return {
		"id": bin_record.id,
		"bin_code": bin_record.bin_code,
		"location_name": bin_record.location_name,
		"latitude": bin_record.latitude,
		"longitude": bin_record.longitude,
		"fill_pct": bin_record.fill_pct,
		"fill_status": bin_record.fill_status,
		"last_reading": bin_record.last_reading,
		"status": bin_record.status,
	}


def _bin_detail_payload(bin_record: Bin) -> dict[str, object]:
	"""Build a bin detail payload with a minimal recent readings placeholder."""
	return {
		"id": bin_record.id,
		"bin_code": bin_record.bin_code,
		"location_name": bin_record.location_name,
		"latitude": bin_record.latitude,
		"longitude": bin_record.longitude,
		"capacity_l": bin_record.capacity_l,
		"height_cm": bin_record.height_cm,
		"zone_id": bin_record.zone_id,
		"fill_pct": bin_record.fill_pct,
		"fill_status": bin_record.fill_status,
		"battery_pct": bin_record.battery_pct,
		"last_reading": bin_record.last_reading,
		"status": bin_record.status,
		"installed_at": bin_record.installed_at,
		"created_at": bin_record.created_at,
		"updated_at": bin_record.updated_at,
		"recent_readings": [],
	}


@router.get("", response_model=list[BinRead])
def list_bins(
	zone_id: int | None = Query(default=None),
	status_filter: BinStatus | None = Query(default=None, alias="status"),
	fill_status: str | None = Query(default=None),
	db: Session = Depends(get_db),
) -> list[Bin]:
	"""Return a filtered list of bins."""
	query = select(Bin)
	if zone_id is not None:
		query = query.where(Bin.zone_id == zone_id)
	if status_filter is not None:
		query = query.where(Bin.status == status_filter)
	if fill_status is not None:
		query = query.where(Bin.fill_status == derive_fill_status(0 if fill_status == "normal" else 100 if fill_status == "overflow" else 50))
	return list(db.exec(query).all())


@router.get("/live")
def live_bins(db: Session = Depends(get_db)) -> list[dict[str, object]]:
	"""Return all active bins for the live dashboard view."""
	return [_bin_live_payload(bin_record) for bin_record in db.exec(select(Bin).where(Bin.status == BinStatus.active)).all()]


@router.get("/summary")
def bins_summary(db: Session = Depends(get_db)) -> BinSummary:
	"""Return the KPI counts for bins and collections today."""
	bins = db.exec(select(Bin)).all()
	waypoints = db.exec(select(RouteWaypoint).where(RouteWaypoint.status == WayPointStatus.collected)).all()
	today = datetime.now(timezone.utc).date()
	collections_today = sum(1 for waypoint in waypoints if waypoint.collected_at and waypoint.collected_at.date() == today)
	return BinSummary(
		total_bins=len(bins),
		overflow_count=sum(1 for bin_record in bins if bin_record.fill_status == derive_fill_status(81)),
		offline_count=sum(1 for bin_record in bins if bin_record.status == BinStatus.offline),
		collections_today=collections_today,
	)


@router.get("/{bin_id}")
def get_bin(bin_id: int, db: Session = Depends(get_db)) -> dict[str, object]:
	"""Return a single bin detail payload."""
	bin_record = db.get(Bin, bin_id)
	if bin_record is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bin not found")
	return _bin_detail_payload(bin_record)


@router.post("", response_model=BinRead, status_code=status.HTTP_201_CREATED)
def create_bin(
	payload: BinCreate,
	_admin: User = Depends(require_admin),
	db: Session = Depends(get_db),
) -> Bin:
	"""Create a new bin after checking bin code uniqueness."""
	if db.exec(select(Bin).where(Bin.bin_code == payload.bin_code)).first() is not None:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="bin_code already exists")
	bin_record = Bin(**payload.model_dump())
	db.add(bin_record)
	db.commit()
	db.refresh(bin_record)
	return bin_record


@router.patch("/{bin_id}", response_model=BinRead)
def update_bin(
	bin_id: int,
	payload: BinUpdate,
	_admin: User = Depends(require_admin),
	db: Session = Depends(get_db),
) -> Bin:
	"""Update the editable bin fields and refresh the timestamp."""
	bin_record = db.get(Bin, bin_id)
	if bin_record is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bin not found")
	for field_name, value in payload.model_dump(exclude_unset=True).items():
		setattr(bin_record, field_name, value)
	bin_record.fill_status = derive_fill_status(bin_record.fill_pct)
	bin_record.updated_at = datetime.now(timezone.utc)
	db.add(bin_record)
	db.commit()
	db.refresh(bin_record)
	return bin_record


@router.delete("/{bin_id}")
def delete_bin(
	bin_id: int,
	_admin: User = Depends(require_admin),
	db: Session = Depends(get_db),
) -> dict[str, str]:
	"""Soft-delete a bin by marking it inactive."""
	bin_record = db.get(Bin, bin_id)
	if bin_record is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bin not found")
	bin_record.status = BinStatus.inactive
	bin_record.updated_at = datetime.now(timezone.utc)
	db.add(bin_record)
	db.commit()
	return {"message": "Bin marked inactive"}
