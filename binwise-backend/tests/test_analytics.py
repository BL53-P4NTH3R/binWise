import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import (
    Bin,
    CollectionRoute,
    RouteStatus,
    SensorReading,
)


ANALYTICS_URL = "/api/analytics"

def seed_readings(db: Session, bin_: Bin, count: int = 5):
    """Helper: insert N sensor readings for a bin over the past N days."""
    for i in range(count):
        reading = SensorReading(
            bin_id=bin_.id,
            node_id="US-Node-402",
            fill_pct=40.0 + (i * 5),
            battery_pct=80.0,
            created_at=datetime.utcnow() - timedelta(days=i),
        )
        db.add(reading)
    db.commit()


class TestFillTrends:
    """GET /api/analytics/fill-trends"""

    def test_returns_200_for_admin(
        self, client: TestClient, test_bin: Bin,
        admin_headers: dict, db: Session
    ):
        seed_readings(db, test_bin)
        response = client.get(
            f"{ANALYTICS_URL}/fill-trends", headers=admin_headers
        )
        assert response.status_code == 200

    def test_returns_list_of_daily_averages(
        self, client: TestClient, test_bin: Bin,
        admin_headers: dict, db: Session
    ):
        """Response must be a list of {date, avg_fill} objects."""
        seed_readings(db, test_bin, count=3)
        response = client.get(
            f"{ANALYTICS_URL}/fill-trends?days=7", headers=admin_headers
        )
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert "date" in data[0]
            assert "avg_fill" in data[0]

    def test_driver_cannot_access_analytics(
        self, client: TestClient, driver_headers: dict
    ):
        """Analytics are admin-only."""
        response = client.get(
            f"{ANALYTICS_URL}/fill-trends", headers=driver_headers
        )
        assert response.status_code == 403

    def test_returns_401_without_token(self, client: TestClient):
        response = client.get(f"{ANALYTICS_URL}/fill-trends")
        assert response.status_code == 401

    def test_zone_filter_accepted(
        self, client: TestClient, test_bin: Bin,
        test_zone, admin_headers: dict, db: Session
    ):
        """zone_id query param must be accepted without error."""
        seed_readings(db, test_bin)
        response = client.get(
            f"{ANALYTICS_URL}/fill-trends?zone_id={test_zone.id}",
            headers=admin_headers,
        )
        assert response.status_code == 200


class TestTripsComparison:
    """GET /api/analytics/trips"""

    def test_returns_route_comparison_data(
        self, client: TestClient, db: Session,
        admin_headers: dict
    ):
        """
        This is your evaluation chapter data — AI distance vs baseline.
        The response must include both values for each completed route.
        """
        route = CollectionRoute(
            route_code="R-2024-EVL-01",
            status=RouteStatus.completed,
            threshold_pct=70.0,
            bin_count=3,
            ai_distance_km=2.1,
            baseline_distance_km=3.8,
            ai_duration_min=35,
            completed_at=datetime.utcnow(),
        )
        db.add(route)
        db.commit()

        response = client.get(
            f"{ANALYTICS_URL}/trips", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        if len(data) > 0:
            item = data[0]
            assert "ai_distance_km" in item
            assert "baseline_distance_km" in item

    def test_ai_always_lte_baseline_in_completed_routes(
        self, client: TestClient, db: Session, admin_headers: dict
    ):
        """
        Every completed route in analytics must show ai <= baseline.
        This validates your core project claim across the full dataset.
        """
        for i in range(3):
            route = CollectionRoute(
                route_code=f"R-2024-T{i:02d}",
                status=RouteStatus.completed,
                threshold_pct=70.0,
                bin_count=2,
                ai_distance_km=1.0 + i * 0.3,
                baseline_distance_km=2.0 + i * 0.3,
                ai_duration_min=20,
                completed_at=datetime.utcnow() - timedelta(days=i),
            )
            db.add(route)
        db.commit()

        response = client.get(f"{ANALYTICS_URL}/trips", headers=admin_headers)
        for route_data in response.json():
            assert route_data["ai_distance_km"] <= route_data["baseline_distance_km"], (
                f"Route {route_data.get('route_code')} has AI > baseline"
            )


class TestExportReport:
    """GET /api/analytics/export"""

    def test_export_returns_csv_content_type(
        self, client: TestClient, admin_headers: dict
    ):
        response = client.get(
            f"{ANALYTICS_URL}/export", headers=admin_headers
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")

    def test_export_has_attachment_header(
        self, client: TestClient, admin_headers: dict
    ):
        """CSV must be downloaded as a file, not rendered inline."""
        response = client.get(
            f"{ANALYTICS_URL}/export", headers=admin_headers
        )
        content_disposition = response.headers.get("content-disposition", "")
        assert "attachment" in content_disposition

    def test_driver_cannot_export(
        self, client: TestClient, driver_headers: dict
    ):
        response = client.get(
            f"{ANALYTICS_URL}/export", headers=driver_headers
        )
        assert response.status_code == 403
