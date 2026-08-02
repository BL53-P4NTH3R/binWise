"""Collection route endpoints for BinWise."""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.database import get_db
from app.core.security import require_admin, get_current_user
from app.models.bin import Bin, BinStatus
from app.models.collection_route import (
    CollectionRoute,
    RouteAssign,
    RouteRequest,
    RouteStatus,
)
from app.models.route_waypoint import RouteWaypoint, WaypointStatus
from app.models.user import User, UserRole
from app.services.route_optimizer import (
    calculate_total_distance,
    nearest_neighbour,
    simulate_baseline,
)

router = APIRouter(tags=["routes"])


# ── HELPERS ──────────────────────────────────────────────────────────────────

def _route_code(db: Session) -> str:
    """Generate a human-readable route code e.g. R-20240624-003."""
    count = len(db.exec(select(CollectionRoute)).all()) + 1
    return f"R-{datetime.now(timezone.utc):%Y%m%d}-{count:03d}"


def _route_detail(route: CollectionRoute, db: Session) -> dict:
    """
    Build the full route payload including ordered waypoints with bin details.
    This is what every route endpoint returns — one consistent shape.
    """
    bins_by_id = {b.id: b for b in db.exec(select(Bin)).all()}

    waypoints = sorted(
        db.exec(select(RouteWaypoint).where(RouteWaypoint.route_id == route.id)).all(),
        key=lambda w: w.stop_order,
    )

    assigned_driver = (
        db.get(User, route.assigned_driver_id)
        if route.assigned_driver_id else None
    )

    return {
        "id":                    str(route.id),
        "route_code":            route.route_code,
        "status":                route.status,
        "threshold_pct":         route.threshold_pct,
        "assigned_driver_id":    str(route.assigned_driver_id) if route.assigned_driver_id else None,
        "assigned_driver_name":  assigned_driver.full_name if assigned_driver else None,
        "bin_count":             route.bin_count,
        "ai_distance_km":        route.ai_distance_km,
        "baseline_distance_km":  route.baseline_distance_km,
        "ai_duration_min":       route.ai_duration_min,
        "generated_at":          route.generated_at,
        "started_at":            route.started_at,
        "completed_at":          route.completed_at,
        "waypoints": [
            {
                "id":                      str(w.id),
                "route_id":                str(w.route_id),
                "bin_id":                  str(w.bin_id),
                "stop_order":              w.stop_order,
                "fill_pct_at_generation":  w.fill_pct_at_generation,
                "status":                  w.status,
                "collected_at":            w.collected_at,
                "skip_reason":             w.skip_reason,
                "bin": (
                    {
                        "id":            str(bins_by_id[w.bin_id].id),
                        "bin_code":      bins_by_id[w.bin_id].bin_code,
                        "location_name": bins_by_id[w.bin_id].location_name,
                        "fill_pct":      bins_by_id[w.bin_id].fill_pct,
                        "fill_status":   bins_by_id[w.bin_id].fill_status,
                        "latitude":      bins_by_id[w.bin_id].latitude,
                        "longitude":     bins_by_id[w.bin_id].longitude,
                    }
                    if w.bin_id is not None and w.bin_id in bins_by_id else None
                ),
            }
            for w in waypoints
        ],
    }


# ── ENDPOINTS ─────────────────────────────────────────────────────────────────

@router.post("/generate", status_code=status.HTTP_201_CREATED)
def generate_route(
    payload: RouteRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """
    Generate a new AI-optimised collection route.
    Only bins with status=active AND fill_pct >= threshold_pct are included.
    Returns 400 if no eligible bins exist above the threshold.
    """
    eligible_bins = db.exec(
        select(Bin).where(
            Bin.status == BinStatus.active,
            Bin.fill_pct >= payload.threshold_pct,
        )
    ).all()
    eligible_bins = list(eligible_bins)

    # Guard — no eligible bins means route generation makes no sense
    if not eligible_bins:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No active bins with fill level >= {payload.threshold_pct}%",
        )

    # Run the nearest-neighbour optimiser
    waypoint_dicts = nearest_neighbour(eligible_bins)

    # Build a lookup so we can resolve bin objects from waypoint dicts
    bins_by_id = {b.id: b for b in eligible_bins}

    # Ordered list of Bin objects matching the optimised sequence
    ordered_bins = [
        bins_by_id[wp["bin_id"]]
        for wp in sorted(waypoint_dicts, key=lambda w: w["stop_order"])
        if wp["bin_id"] in bins_by_id
    ]

    # Calculate AI route distance using the two-argument signature
    ai_distance    = calculate_total_distance(waypoint_dicts, eligible_bins)
    baseline_dist  = simulate_baseline(eligible_bins)

    # Rough duration estimate: assume 10 min per stop + 2 min per km
    ai_duration_min = int(len(ordered_bins) * 10 + ai_distance * 2)

    route = CollectionRoute(
        route_code           = _route_code(db),
        threshold_pct        = payload.threshold_pct,
        bin_count            = len(ordered_bins),
        ai_distance_km       = round(ai_distance, 4),
        baseline_distance_km = round(baseline_dist, 4),
        ai_duration_min      = ai_duration_min,
        status               = RouteStatus.pending,
    )
    db.add(route)
    db.commit()
    db.refresh(route)

    # Create one RouteWaypoint row per bin in optimised order
    for wp in sorted(waypoint_dicts, key=lambda w: w["stop_order"]):
        bin_obj = bins_by_id.get(wp["bin_id"])
        if bin_obj is None:
            continue
        db.add(
            RouteWaypoint(
                route_id               = route.id,
                bin_id                 = bin_obj.id,
                stop_order             = wp["stop_order"],
                fill_pct_at_generation = bin_obj.fill_pct,
                status                 = WaypointStatus.pending,
            )
        )
    db.commit()

    return _route_detail(route, db)


@router.get("")
def list_routes(
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    """Return all routes ordered by most recent generation. Accessible by all roles."""
    routes = sorted(
        db.exec(select(CollectionRoute)).all(),
        key=lambda r: r.generated_at,
        reverse=True,
    )
    users = {u.id: u for u in db.exec(select(User)).all()}

    return [
        {
            "id":                   str(r.id),
            "route_code":           r.route_code,
            "status":               r.status,
            "threshold_pct":        r.threshold_pct,
            "bin_count":            r.bin_count,
            "ai_distance_km":       r.ai_distance_km,
            "baseline_distance_km": r.baseline_distance_km,
            "ai_duration_min":      r.ai_duration_min,
            "assigned_driver_name": (
                users[r.assigned_driver_id].full_name
                if r.assigned_driver_id and r.assigned_driver_id in users
                else None
            ),
            "generated_at":  r.generated_at,
            "started_at":    r.started_at,
            "completed_at":  r.completed_at,
        }
        for r in routes
    ]


@router.get("/{route_id}")
def get_route(
    route_id: UUID,
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Return full route detail including all waypoints in stop_order sequence."""
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
) -> dict:
    """
    Assign a driver to a route and set status to in_progress.
    Only users with role=driver can be assigned.
    """
    route = db.get(CollectionRoute, route_id)
    if route is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")

    driver = db.get(User, payload.driver_id)
    if driver is None or driver.role != UserRole.driver:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assigned user must have role=driver",
        )

    route.assigned_driver_id = driver.id
    route.status             = RouteStatus.in_progress
    route.started_at         = datetime.now(timezone.utc)
    db.add(route)
    db.commit()
    db.refresh(route)

    return _route_detail(route, db)


@router.post("/{route_id}/collect/{bin_id}")
def collect_waypoint(
    route_id: UUID,
    bin_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Mark a waypoint as collected.
    The requesting user must be the assigned driver for this route.
    If all waypoints are resolved (collected or skipped), route becomes completed.
    """
    route = db.get(CollectionRoute, route_id)
    if route is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")

    # Enforce that only the assigned driver can mark collections
    if current_user.role == UserRole.driver and route.assigned_driver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This route is not assigned to you",
        )

    waypoint = db.exec(
        select(RouteWaypoint).where(
            RouteWaypoint.route_id == route_id,
            RouteWaypoint.bin_id   == bin_id,
        )
    ).first()
    if waypoint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waypoint not found for this bin")

    # Idempotent — mark collected only if not already done
    if waypoint.status != WaypointStatus.collected:
        waypoint.status       = WaypointStatus.collected
        waypoint.collected_at = datetime.now(timezone.utc)
        db.add(waypoint)
        db.commit()

    # Check if all waypoints are now resolved (collected or skipped)
    unresolved = db.exec(
        select(RouteWaypoint).where(
            RouteWaypoint.route_id == route_id,
            RouteWaypoint.status   == WaypointStatus.pending,
        )
    ).first()

    if unresolved is None:
        route.status       = RouteStatus.completed
        route.completed_at = datetime.now(timezone.utc)
        db.add(route)
        db.commit()

    return _route_detail(route, db)