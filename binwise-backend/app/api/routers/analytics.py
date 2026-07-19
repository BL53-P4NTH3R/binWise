"""Analytics routes for BinWise."""

from __future__ import annotations

import csv
from collections import defaultdict
from datetime import date
from io import StringIO
from typing import Any, cast

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from app.core.database import get_db
from app.models.bin import Bin
from app.models.collection_route import CollectionRoute, RouteStatus
from app.models.sensor_reading import SensorReading


router = APIRouter(prefix="/analytics", tags=["analytics"])


def _resolve_bin_ids(zone_id: int | None, db: Session) -> list[Any]:
	"""Return bin identifiers filtered by zone when requested."""
	if zone_id is None:
		return []
	return [bin_record.id for bin_record in db.exec(select(Bin).where(Bin.zone_id == zone_id)).all()]


def _get_fill_trends(start_date: date, end_date: date, zone_id: int | None, db: Session) -> list[dict[str, object]]:
	"""Build daily average fill trends for the requested date range."""
	query = select(SensorReading)
	bin_ids = _resolve_bin_ids(zone_id, db)
	if zone_id is not None:
		if not bin_ids:
			return []
		query = query.where(cast(Any, SensorReading.bin_id).in_(bin_ids))

	readings = db.exec(query).all()
	grouped: dict[str, list[float]] = defaultdict(list)
	for reading in readings:
		reading_day = reading.created_at.date()
		if start_date <= reading_day <= end_date:
			grouped[reading_day.isoformat()].append(reading.fill_pct)

	return [
		{"date": day, "avg_fill": round(sum(values) / len(values), 2)}
		for day, values in sorted(grouped.items())
	]


def _get_trip_rows(start_date: date, end_date: date, db: Session) -> list[dict[str, object]]:
	"""Collect completed route comparison rows for analytics and export."""
	routes = db.exec(
		select(CollectionRoute).where(
			CollectionRoute.status == RouteStatus.completed,
		)
	).all()
	ordered_routes = [
		route
		for route in sorted(routes, key=lambda route: route.completed_at or route.generated_at)
		if start_date <= (route.completed_at or route.generated_at).date() <= end_date
	]
	return [
		{
			"route_code": route.route_code,
			"ai_distance_km": route.ai_distance_km,
			"baseline_distance_km": route.baseline_distance_km,
			"time_saved": round((route.baseline_distance_km or 0.0) - (route.ai_distance_km or 0.0), 2),
			"bins_collected": route.bin_count,
		}
		for route in ordered_routes
	]


@router.get("/fill-trends")
def fill_trends(
	start_date: date = Query(...),
	end_date: date = Query(...),
	zone_id: int | None = Query(default=None),
	db: Session = Depends(get_db),
) -> list[dict[str, object]]:
	"""Return daily average fill levels for charting."""
	return _get_fill_trends(start_date, end_date, zone_id, db)


@router.get("/trips")
def trips(
	start_date: date = Query(...),
	end_date: date = Query(...),
	db: Session = Depends(get_db),
) -> list[dict[str, object]]:
	"""Return completed route comparison data for the requested date range."""
	return _get_trip_rows(start_date, end_date, db)


@router.get("/export")
def export_analytics(
	start_date: date = Query(...),
	end_date: date = Query(...),
	db: Session = Depends(get_db),
) -> StreamingResponse:
	"""Export completed route analytics as a CSV attachment."""
	rows = _get_trip_rows(start_date, end_date, db)
	buffer = StringIO()
	writer = csv.DictWriter(
		buffer,
		fieldnames=["route_code", "ai_distance_km", "baseline_distance_km", "time_saved", "bins_collected"],
	)
	writer.writeheader()
	writer.writerows(rows)
	buffer.seek(0)
	return StreamingResponse(
		iter([buffer.getvalue()]),
		media_type="text/csv",
		headers={"Content-Disposition": 'attachment; filename="analytics.csv"'},
	)
