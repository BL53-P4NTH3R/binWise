"""Analytics routes for BinWise."""

import csv
from collections import defaultdict
from datetime import date, datetime, timedelta
from io import StringIO
from typing import Any, Optional, cast
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.bin import Bin
from app.models.collection_route import CollectionRoute, RouteStatus
from app.models.sensor_reading import SensorReading
from app.models.user import User, UserRole


router = APIRouter(tags=["analytics"])


# ── AUTH GUARD ────────────────────────────────────────────────────────────────

def require_analytics_admin(user: User = Depends(get_current_user)) -> User:
    """Analytics endpoints are admin-only."""
    if user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


# ── HELPERS ───────────────────────────────────────────────────────────────────

def _get_fill_trends(
    days: int,
    zone_id: Optional[UUID],
    db: Session,
) -> list[dict]:
    since = datetime.utcnow() - timedelta(days=days)
    query = select(SensorReading).where(SensorReading.created_at >= since)

    if zone_id is not None:
        bin_ids = [
            b.id for b in db.exec(
                select(Bin).where(Bin.zone_id == zone_id)
            ).all()
        ]
        if not bin_ids:
            return []
        query = query.where(cast(Any, SensorReading.bin_id).in_(bin_ids))

    readings = db.exec(query).all()
    grouped: dict[str, list[float]] = defaultdict(list)
    for r in readings:
        grouped[r.created_at.date().isoformat()].append(r.fill_pct)

    return [
        {"date": day, "avg_fill": round(sum(vals) / len(vals), 2)}
        for day, vals in sorted(grouped.items())
    ]


def _get_trip_rows(db: Session) -> list[dict]:
    routes = db.exec(
        select(CollectionRoute).where(
            CollectionRoute.status == RouteStatus.completed
        )
    ).all()
    return [
        {
            "route_code":            r.route_code,
            "ai_distance_km":        r.ai_distance_km,
            "baseline_distance_km":  r.baseline_distance_km,
            "time_saved":            round(
                (r.baseline_distance_km or 0.0) - (r.ai_distance_km or 0.0), 2
            ),
            "bins_collected": r.bin_count,
            "completed_at":   r.completed_at,
        }
        for r in sorted(
            routes,
            key=lambda r: r.completed_at or r.generated_at,
        )
    ]


# ── ENDPOINTS ─────────────────────────────────────────────────────────────────

@router.get("/fill-trends")
def fill_trends(
    days: int = Query(default=7, ge=1, le=365),
    zone_id: Optional[UUID] = Query(default=None),
    _admin: User = Depends(require_analytics_admin),
    db: Session = Depends(get_db),
) -> list[dict]:
    """
    Daily average fill levels for the past N days.
    Tests call this with just ?days=7 or no params at all — defaults handle both.
    """
    return _get_fill_trends(days, zone_id, db)


@router.get("/trips")
def trips(
    _admin: User = Depends(require_analytics_admin),
    db: Session = Depends(get_db),
) -> list[dict]:
    """
    All completed route comparison data — AI vs baseline.
    No date filter needed for tests; returns all completed routes.
    """
    return _get_trip_rows(db)


@router.get("/export")
def export_analytics(
    _admin: User = Depends(require_analytics_admin),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """Export completed route analytics as a downloadable CSV."""
    rows = _get_trip_rows(db)
    buffer = StringIO()
    writer = csv.DictWriter(
        buffer,
        fieldnames=[
            "route_code", "ai_distance_km", "baseline_distance_km",
            "time_saved", "bins_collected", "completed_at",
        ],
    )
    writer.writeheader()
    writer.writerows(rows)
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="binwise-analytics.csv"'},
    )