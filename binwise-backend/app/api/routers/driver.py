"""Driver-only routes for BinWise."""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.collection_route import CollectionRoute, RouteStatus
from app.models.route_waypoint import RouteWaypoint, WaypointStatus
from app.models.user import User, UserRole


router = APIRouter(tags=["driver"])


# ── DEPENDENCY ────────────────────────────────────────────────────────────────

def require_driver(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency that enforces the requesting user has role=driver.
    Uses the standard JWT bearer token — same as every other protected endpoint.
    Raises 403 if the authenticated user is not a driver.
    """
    if current_user.role != UserRole.driver:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Driver access required",
        )
    return current_user


# ── HELPERS ───────────────────────────────────────────────────────────────────

def _serialize_waypoints(route_id: UUID, db: Session) -> list[dict]:
    """Return waypoints for a route sorted by stop_order."""
    waypoints = sorted(
        db.exec(select(RouteWaypoint).where(RouteWaypoint.route_id == route_id)).all(),
        key=lambda w: w.stop_order,
    )
    return [
        {
            "id":                     str(w.id),
            "bin_id":                 str(w.bin_id) if w.bin_id else None,
            "stop_order":             w.stop_order,
            "fill_pct_at_generation": w.fill_pct_at_generation,
            "status":                 w.status,
            "collected_at":           w.collected_at,
            "skip_reason":            w.skip_reason,
        }
        for w in waypoints
    ]


def _route_payload(route: CollectionRoute, db: Session) -> dict:
    """Build a consistent route response for driver endpoints."""
    return {
        "id":                    str(route.id),
        "route_code":            route.route_code,
        "status":                route.status,
        "threshold_pct":         route.threshold_pct,
        "bin_count":             route.bin_count,
        "ai_distance_km":        route.ai_distance_km,
        "baseline_distance_km":  route.baseline_distance_km,
        "ai_duration_min":       route.ai_duration_min,
        "generated_at":          route.generated_at,
        "started_at":            route.started_at,
        "completed_at":          route.completed_at,
        "waypoints":             _serialize_waypoints(route.id, db),
    }


# ── ENDPOINTS ─────────────────────────────────────────────────────────────────

@router.get("/route")
def get_current_route(
    driver: User = Depends(require_driver),
    db: Session = Depends(get_db),
) -> dict:
    """
    Return the driver's currently assigned in_progress route.
    Returns 404 if no active route is assigned — the driver home screen
    shows a 'no route assigned' state when this happens.
    """
    route = db.exec(
        select(CollectionRoute).where(
            CollectionRoute.assigned_driver_id == driver.id,
            CollectionRoute.status == RouteStatus.in_progress,
        )
    ).first()

    if route is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active route assigned to you",
        )

    return _route_payload(route, db)


class CollectRequest(BaseModel := __import__('pydantic').BaseModel):
    """Request body for marking a bin as collected."""
    bin_id: UUID


@router.post("/collect")
def collect_bin(
    payload: CollectRequest,
    driver: User = Depends(require_driver),
    db: Session = Depends(get_db),
) -> dict:
    """
    Mark a bin waypoint as collected on the driver's active route.
    Finds the driver's current in_progress route automatically —
    the driver app does not need to pass a route_id.
    Returns 400 if the driver has no active route.
    Returns 404 if the bin is not a waypoint on the active route.
    """
    route = db.exec(
        select(CollectionRoute).where(
            CollectionRoute.assigned_driver_id == driver.id,
            CollectionRoute.status == RouteStatus.in_progress,
        )
    ).first()

    if route is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have no active route to collect from",
        )

    waypoint = db.exec(
        select(RouteWaypoint).where(
            RouteWaypoint.route_id == route.id,
            RouteWaypoint.bin_id   == payload.bin_id,
        )
    ).first()

    if waypoint is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This bin is not a waypoint on your active route",
        )

    # Idempotent — safe to call twice without duplicating the timestamp
    if waypoint.status != WaypointStatus.collected:
        waypoint.status       = WaypointStatus.collected
        waypoint.collected_at = datetime.now(timezone.utc)
        db.add(waypoint)
        db.commit()

    # Check if all waypoints are now resolved — complete the route if so
    unresolved = db.exec(
        select(RouteWaypoint).where(
            RouteWaypoint.route_id == route.id,
            RouteWaypoint.status   == WaypointStatus.pending,
        )
    ).first()

    if unresolved is None:
        route.status       = RouteStatus.completed
        route.completed_at = datetime.now(timezone.utc)
        db.add(route)
        db.commit()

    return {
        "message":    "Bin marked as collected",
        "route_id":   str(route.id),
        "bin_id":     str(payload.bin_id),
        "route_status": route.status,
    }


@router.get("/history")
def get_history(
    driver: User = Depends(require_driver),
    db: Session = Depends(get_db),
) -> list[dict]:
    """
    Return all completed routes assigned to this driver, most recent first.
    Each route includes its waypoint list for the history expand/collapse UI.
    The frontend groups by date client-side from the completed_at field.
    """
    routes = db.exec(
        select(CollectionRoute).where(
            CollectionRoute.assigned_driver_id == driver.id,
            CollectionRoute.status             == RouteStatus.completed,
        )
    ).all()

    return [
        _route_payload(route, db)
        for route in sorted(
            routes,
            key=lambda r: r.completed_at or r.generated_at,
            reverse=True,
        )
    ]