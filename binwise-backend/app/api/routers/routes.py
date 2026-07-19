"""Collection route endpoints for BinWise."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import cast
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Path, status
from sqlmodel import Session, select

from app.core.database import get_db
from app.core.security import require_admin
from app.models.bin import Bin, BinStatus, BinLive
from app.models.collection_route import CollectionRoute, RouteAssign, RouteRead, RouteRequest, RouteStatus
from app.models.route_waypoint import RouteWaypoint, WayPointStatus
from app.models.user import User, UserRole
from app.services.route_optimizer import calculate_total_distance, optimize_route, simulate_baseline


router = APIRouter(prefix="/routes", tags=["routes"])


def _require_driver(
	user_id: UUID | None = Header(default=None, alias="X-User-Id"),
	db: Session = Depends(get_db),
) -> User:
	"""Resolve the current driver user from the `X-User-Id` header."""
	if user_id is None:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing driver identity")
	driver = db.exec(select(User).where(User.id == user_id, User.role == UserRole.driver)).first()
	if driver is None:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Driver access required")
	return driver


def _route_code(db: Session) -> str:
	"""Generate a simple date-based route code."""
	count = len(db.exec(select(CollectionRoute)).all()) + 1
	return f"R-{datetime.now(timezone.utc):%Y%m%d}-{count:03d}"


def _bin_payload(bin_record: Bin) -> dict[str, object]:
	"""Serialize the bin fields needed by route details."""
	return {
		"id": bin_record.id,
		"bin_code": bin_record.bin_code,
		"location_name": bin_record.location_name,
		"fill_pct": bin_record.fill_pct,
		"status": bin_record.status,
	}


def _route_detail(route: CollectionRoute, db: Session) -> dict[str, object]:
	"""Build a full route payload including ordered waypoints and bin details."""
	bins_by_id = {bin_record.id: bin_record for bin_record in db.exec(select(Bin)).all()}
	waypoints = sorted(
		db.exec(select(RouteWaypoint).where(RouteWaypoint.route_id == route.id)).all(),
		key=lambda waypoint: waypoint.stop_order,
	)
	assigned_driver = db.get(User, route.assigned_driver_id) if route.assigned_driver_id else None
	return {
		"id": route.id,
		"route_code": route.route_code,
		"status": route.status,
		"threshold_pct": route.threshold_pct,
		"assigned_driver_id": route.assigned_driver_id,
		"assigned_driver_name": assigned_driver.full_name if assigned_driver else None,
		"bin_count": route.bin_count,
		"ai_distance_km": route.ai_distance_km,
		"baseline_distance_km": route.baseline_distance_km,
		"ai_duration_min": route.ai_duration_min,
		"generated_at": route.generated_at,
		"started_at": route.started_at,
		"completed_at": route.completed_at,
		"waypoints": [
			{
				"id": waypoint.id,
				"stop_order": waypoint.stop_order,
				"status": waypoint.status,
				"collected_at": waypoint.collected_at,
				"skip_reason": waypoint.skip_reason,
				"bin": _bin_payload(bins_by_id[waypoint.bin_id.int]) if waypoint.bin_id.int in bins_by_id else None,
			}
			for waypoint in waypoints
		],
	}


@router.post("/generate")
def generate_route(
	payload: RouteRequest,
	_admin: User = Depends(require_admin),
	db: Session = Depends(get_db),
) -> dict[str, object]:
	"""Generate a new collection route from active bins above the threshold."""
	bins = db.exec(
		select(Bin).where(Bin.status == BinStatus.active, Bin.fill_pct >= payload.threshold_pct)
	).all()
	ordered_bins: list[Bin] = []
	for step in optimize_route(list(bins)):
		bin_id = cast(int, step["bin_id"])
		matched_bin = next((bin_record for bin_record in bins if bin_record.id == bin_id), None)
		if matched_bin is not None:
			ordered_bins.append(matched_bin)
	route = CollectionRoute(
		route_code=_route_code(db),
		bin_count=len(ordered_bins),
		ai_distance_km=calculate_total_distance(ordered_bins),
		baseline_distance_km=simulate_baseline(list(bins)),
	)
	db.add(route)
	db.commit()
	db.refresh(route)

	for index, bin_record in enumerate(ordered_bins, start=1):
		db.add(
			RouteWaypoint(
				route_id=route.id,
				bin_id=UUID(int=bin_record.id),
				stop_order=index,
				fill_pct_at_generation=bin_record.fill_pct,
			)
		)
	db.commit()
	return _route_detail(route, db)


@router.get("")
def list_routes(db: Session = Depends(get_db)) -> list[dict[str, object]]:
	"""Return route summaries ordered by most recent generation."""
	routes = sorted(db.exec(select(CollectionRoute)).all(), key=lambda route: route.generated_at, reverse=True)
	users = {user.id: user for user in db.exec(select(User)).all()}
	return [
		{
			"id": route.id,
			"route_code": route.route_code,
			"status": route.status,
			"assigned_driver_name": users[route.assigned_driver_id].full_name if route.assigned_driver_id is not None and route.assigned_driver_id in users else None,
			"bin_count": route.bin_count,
			"generated_at": route.generated_at,
		}
		for route in routes
	]


@router.get("/{route_id}")
def get_route(route_id: UUID, db: Session = Depends(get_db)) -> dict[str, object]:
	"""Return the full route detail including all ordered waypoints."""
	route = db.get(CollectionRoute, route_id)
	if route is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
	return _route_detail(route, db)


@router.patch("/{route_id}/assign")
def assign_route(
	route_id: UUID,
	payload: RouteAssign,
	_admin: User = Depends(require_admin),
	db: Session = Depends(get_db),
) -> dict[str, object]:
	"""Assign a driver to a route and mark it in progress."""
	route = db.get(CollectionRoute, route_id)
	if route is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
	driver = db.get(User, payload.driver_id)
	if driver is None or driver.role != UserRole.driver:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid driver")
	route.assigned_driver_id = driver.id
	route.status = RouteStatus.in_progress
	route.started_at = datetime.now(timezone.utc)
	db.add(route)
	db.commit()
	db.refresh(route)
	return _route_detail(route, db)


@router.post("/{route_id}/collect/{bin_id}")
def collect_waypoint(
	route_id: UUID,
	bin_id: int = Path(..., description="Bin identifier"),
	_driver: User = Depends(_require_driver),
	db: Session = Depends(get_db),
) -> dict[str, object]:
	"""Mark a route waypoint as collected and complete the route if all stops are done."""
	route = db.get(CollectionRoute, route_id)
	if route is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
	if route.assigned_driver_id != _driver.id:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This route is not assigned to you")

	waypoint = db.exec(
		select(RouteWaypoint).where(RouteWaypoint.route_id == route.id, RouteWaypoint.bin_id == UUID(int=bin_id))
	).first()
	if waypoint is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waypoint not found")

	if waypoint.status != WayPointStatus.collected:
		waypoint.status = WayPointStatus.collected
		waypoint.collected_at = datetime.now(timezone.utc)
		db.add(waypoint)
		db.commit()

	remaining = db.exec(
		select(RouteWaypoint).where(RouteWaypoint.route_id == route.id, RouteWaypoint.status != WayPointStatus.collected)
	).first()
	if remaining is None:
		route.status = RouteStatus.completed
		route.completed_at = datetime.now(timezone.utc)
		db.add(route)
		db.commit()

	return _route_detail(route, db)
