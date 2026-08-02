import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import (
    Bin,
    CollectionRoute,
    RouteStatus,
    RouteWaypoint,
    WaypointStatus,
    User,
)


DRIVER_URL = "/api/driver"

class TestDriverHome:
    """GET /api/driver/route — today's assigned route."""

    def test_driver_can_get_assigned_route(
        self, client: TestClient, db: Session,
        test_route: CollectionRoute,
        driver_user: User,
        driver_headers: dict,
        admin_headers: dict,
    ):
        """Driver must see their currently assigned in_progress route."""
        # Assign route to driver
        client.patch(
            f"/api/routes/{test_route.id}/assign",
            headers=admin_headers,
            json={"driver_id": str(driver_user.id)},
        )

        response = client.get(f"{DRIVER_URL}/route", headers=driver_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["route_code"] == "R-2024-001"

    def test_driver_with_no_route_returns_404(
        self, client: TestClient, driver_headers: dict
    ):
        """Driver with no assigned route must get 404, not 500."""
        response = client.get(f"{DRIVER_URL}/route", headers=driver_headers)
        assert response.status_code == 404

    def test_admin_cannot_access_driver_route(
        self, client: TestClient, admin_headers: dict
    ):
        """Driver endpoints are driver-role only."""
        response = client.get(f"{DRIVER_URL}/route", headers=admin_headers)
        assert response.status_code == 403

    def test_unauthenticated_cannot_access(self, client: TestClient):
        response = client.get(f"{DRIVER_URL}/route")
        assert response.status_code == 401


class TestDriverCollect:
    """POST /api/driver/collect — mark a bin as collected."""

    def test_driver_can_collect_assigned_bin(
        self, client: TestClient, db: Session,
        test_route: CollectionRoute,
        overflow_bin: Bin,
        driver_user: User,
        driver_headers: dict,
        admin_headers: dict,
    ):
        client.patch(
            f"/api/routes/{test_route.id}/assign",
            headers=admin_headers,
            json={"driver_id": str(driver_user.id)},
        )

        response = client.post(
            f"{DRIVER_URL}/collect",
            headers=driver_headers,
            json={"bin_id": str(overflow_bin.id)},
        )
        assert response.status_code == 200

    def test_collect_sets_waypoint_collected(
        self, client: TestClient, db: Session,
        test_route: CollectionRoute,
        overflow_bin: Bin,
        driver_user: User,
        driver_headers: dict,
        admin_headers: dict,
    ):
        client.patch(
            f"/api/routes/{test_route.id}/assign",
            headers=admin_headers,
            json={"driver_id": str(driver_user.id)},
        )
        client.post(
            f"{DRIVER_URL}/collect",
            headers=driver_headers,
            json={"bin_id": str(overflow_bin.id)},
        )
        from sqlmodel import select
        waypoint = db.exec(
            select(RouteWaypoint).where(
                RouteWaypoint.route_id == test_route.id,
                RouteWaypoint.bin_id == overflow_bin.id,
            )
        ).first()
        assert waypoint.status == WaypointStatus.collected # type: ignore

    def test_unassigned_driver_cannot_collect(
        self, client: TestClient,
        overflow_bin: Bin,
        driver_headers: dict,
    ):
        """Driver with no route assigned must not be able to collect."""
        response = client.post(
            f"{DRIVER_URL}/collect",
            headers=driver_headers,
            json={"bin_id": str(overflow_bin.id)},
        )
        assert response.status_code in [400, 404]


class TestDriverHistory:
    """GET /api/driver/history — past completed routes."""

    def test_driver_can_get_history(
        self, client: TestClient, db: Session,
        driver_user: User, driver_headers: dict,
    ):
        completed_route = CollectionRoute(
            route_code="R-2024-HIST-01",
            status=RouteStatus.completed,
            threshold_pct=70.0,
            bin_count=2,
            assigned_driver_id=driver_user.id,
            ai_distance_km=1.5,
            baseline_distance_km=2.8,
        )
        db.add(completed_route)
        db.commit()

        response = client.get(f"{DRIVER_URL}/history", headers=driver_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_history_only_shows_own_routes(
        self, client: TestClient, db: Session,
        driver_user: User,
        admin_user: User,
        driver_headers: dict,
    ):
        """
        Driver must only see routes assigned to themselves,
        not routes assigned to other drivers.
        """
        own_route = CollectionRoute(
            route_code="R-MINE-01",
            status=RouteStatus.completed,
            threshold_pct=70.0,
            bin_count=1,
            assigned_driver_id=driver_user.id,
            ai_distance_km=1.0,
            baseline_distance_km=1.5,
        )
        other_route = CollectionRoute(
            route_code="R-OTHER-01",
            status=RouteStatus.completed,
            threshold_pct=70.0,
            bin_count=1,
            assigned_driver_id=admin_user.id,
            ai_distance_km=1.0,
            baseline_distance_km=1.5,
        )
        db.add(own_route)
        db.add(other_route)
        db.commit()

        response = client.get(f"{DRIVER_URL}/history", headers=driver_headers)
        route_codes = [r["route_code"] for r in response.json()]
        assert "R-MINE-01" in route_codes
        assert "R-OTHER-01" not in route_codes

    def test_admin_cannot_access_driver_history(
        self, client: TestClient, admin_headers: dict
    ):
        response = client.get(f"{DRIVER_URL}/history", headers=admin_headers)
        assert response.status_code == 403
