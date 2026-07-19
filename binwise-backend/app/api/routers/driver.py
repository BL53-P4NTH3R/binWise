"""Driver-only routes for BinWise."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, cast
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlmodel import Session, select

from app.core.database import get_db
from app.models.collection_route import CollectionRoute, RouteStatus
from app.models.route_waypoint import RouteWaypoint, WayPointStatus
from app.models.user import User, UserRole


router = APIRouter(prefix="/driver", tags=["driver"])


def get_current_driver(
	user_id: UUID | None = Header(default=None, alias="X-User-Id"),
	db: Session = Depends(get_db),
) -> User:
	"""Resolve the current driver from the `X-User-Id` header."""
	if user_id is None:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing driver identity")
	driver = db.exec(select(User).where(User.id == user_id, User.role == UserRole.driver)).first()
	if driver is None:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Driver access required")
	return driver


def _serialize_waypoints(route_id: UUID, db: Session) -> list[dict[str, object]]:
	waypoints = sorted(
		db.exec(select(RouteWaypoint).where(RouteWaypoint.route_id == route_id)).all(),
		key=lambda waypoint: waypoint.stop_order,
	)
	return [
		{
			"id": waypoint.id,
			"bin_id": waypoint.bin_id,
			"stop_order": waypoint.stop_order,
			"status": waypoint.status.value,
			"collected_at": waypoint.collected_at,
			"skip_reason": waypoint.skip_reason,
		}
		for waypoint in waypoints
	]


@router.get("/route")
def get_current_route(
	driver: User = Depends(get_current_driver),
	db: Session = Depends(get_db),
) -> dict[str, object]:
	"""Return the current in-progress route assigned to the authenticated driver."""
	route = db.exec(
		select(CollectionRoute).where(
			CollectionRoute.assigned_driver_id == driver.id,
			CollectionRoute.status == RouteStatus.in_progress,
		)
	).first()
	if route is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active route found")
	return {
		"id": route.id,
		"route_code": route.route_code,
		"status": route.status.value,
		"generated_at": route.generated_at,
		"started_at": route.started_at,
		"completed_at": route.completed_at,
		"waypoints": _serialize_waypoints(route.id, db),
	}


@router.post("/collect")
def collect_waypoint(
	bin_id: UUID,
	driver: User = Depends(get_current_driver),
	db: Session = Depends(get_db),
) -> dict[str, object]:
	"""Mark the waypoint for a bin as collected for the driver's active route."""
	route = db.exec(
		select(CollectionRoute).where(
			CollectionRoute.assigned_driver_id == driver.id,
			CollectionRoute.status == RouteStatus.in_progress,
		)
	).first()
	if route is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active route found")

	waypoint = db.exec(
		select(RouteWaypoint).where(RouteWaypoint.route_id == route.id, RouteWaypoint.bin_id == bin_id)
	).first()
	if waypoint is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waypoint not found")

	if waypoint.status != WayPointStatus.collected:
		waypoint.status = WayPointStatus.collected
		waypoint.collected_at = datetime.now(timezone.utc)
		db.add(waypoint)
		db.commit()

	return {"message": "Waypoint collected", "route_id": route.id, "bin_id": bin_id}


@router.get("/history")
def get_history(
	driver: User = Depends(get_current_driver),
	db: Session = Depends(get_db),
) -> list[dict[str, object]]:
	"""Return completed routes for the authenticated driver, grouped by date."""
	routes = db.exec(
		select(CollectionRoute).where(
			CollectionRoute.assigned_driver_id == driver.id,
			CollectionRoute.status == RouteStatus.completed,
		)
	).all()
	history: dict[str, dict[str, Any]] = {}
	for route in sorted(routes, key=lambda route: route.completed_at or route.generated_at, reverse=True):
		key = route.completed_at.date().isoformat() if route.completed_at else route.generated_at.date().isoformat()
		entry = history.setdefault(key, {"date": key, "routes": [], "bin_count": 0})
		routes_for_day = cast(list[dict[str, object]], entry["routes"])
		routes_for_day.append(
			{
				"id": route.id,
				"route_code": route.route_code,
				"completed_at": route.completed_at,
				"bin_count": route.bin_count,
			}
		)
		entry["bin_count"] = cast(int, entry["bin_count"]) + route.bin_count
	return list(history.values())
