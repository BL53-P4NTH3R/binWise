import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models import (
    Bin,
    CollectionRoute,
    RouteStatus,
    RouteWaypoint,
    WaypointStatus,
    Zone,
)
from app.services.route_optimizer import nearest_neighbour, calculate_total_distance


ROUTES_URL = "/api/routes"

class TestRouteOptimiserService:
    """
    Direct unit tests of the route_optimizer service functions.
    These run without HTTP — fastest tests in the suite.
    Tests your core academic contribution: the AI optimiser.
    """

    def test_nearest_neighbour_returns_all_bins(
        self, db: Session, test_bin: Bin, overflow_bin: Bin
    ):
        """Every bin passed in must appear exactly once in the output."""
        bins = [test_bin, overflow_bin]
        result = nearest_neighbour(bins)
        assert len(result) == len(bins)
        result_bin_ids = [wp["bin_id"] for wp in result]
        for b in bins:
            assert b.id in result_bin_ids

    def test_nearest_neighbour_assigns_sequential_order(
        self, db: Session, test_bin: Bin, overflow_bin: Bin
    ):
        """stop_order must start at 1 and increment by 1 for each stop."""
        bins = [test_bin, overflow_bin]
        result = nearest_neighbour(bins)
        orders = sorted([wp["stop_order"] for wp in result])
        assert orders == list(range(1, len(bins) + 1))

    def test_nearest_neighbour_single_bin(
        self, db: Session, test_bin: Bin
    ):
        """Single bin input must return a one-item list."""
        result = nearest_neighbour([test_bin])
        assert len(result) == 1
        assert result[0]["stop_order"] == 1

    def test_nearest_neighbour_empty_input_returns_empty(self):
        """Empty bin list must return empty list, not raise an exception."""
        result = nearest_neighbour([])
        assert result == []

    def test_ai_distance_less_than_baseline(
        self, db: Session, test_bin: Bin, overflow_bin: Bin,
        test_zone: Zone
    ):
        """
        THE KEY EVALUATION RESULT:
        The AI-optimised route distance must be <= the baseline (fixed schedule).
        This is the core claim of your project — prove it in code.
        Quote this test result in your evaluation chapter.
        """
        # Create a third bin far from the others to make the difference meaningful
        far_bin = Bin(
            bin_code="SPT-Bin-01",
            location_name="Main Football Field",
            latitude=11.1480,  # significantly different lat
            longitude=7.6100,  # significantly different lng
            zone_id=test_zone.id,
            fill_pct=75.0,
        )
        db.add(far_bin)
        db.commit()
        db.refresh(far_bin)

        bins = [test_bin, overflow_bin, far_bin]
        ai_route = nearest_neighbour(bins)
        ai_distance = calculate_total_distance(ai_route, bins)

        # Baseline: alphabetical bin_code order (simulates fixed schedule)
        baseline_route = sorted(
            [{"bin_id": b.id, "stop_order": i + 1} for i, b in enumerate(
                sorted(bins, key=lambda b: b.bin_code)
            )],
            key=lambda w: w["stop_order"],
        )
        baseline_distance = calculate_total_distance(baseline_route, bins)

        assert ai_distance <= baseline_distance, (
            f"AI route ({ai_distance:.3f}km) must be <= "
            f"baseline ({baseline_distance:.3f}km)"
        )


class TestGenerateRoute:
    """POST /api/routes/generate"""

    def test_admin_can_generate_route(
        self, client: TestClient,
        overflow_bin: Bin, admin_headers: dict
    ):
        """Admin can trigger AI route generation."""
        response = client.post(
            f"{ROUTES_URL}/generate",
            headers=admin_headers,
            json={"threshold_pct": 70.0},
        )
        assert response.status_code == 201

    def test_generated_route_contains_overflow_bins(
        self, client: TestClient,
        test_bin: Bin, overflow_bin: Bin,
        admin_headers: dict
    ):
        """
        Only bins above threshold_pct=70 should be included.
        overflow_bin (87%) must be included; test_bin (45%) must not.
        """
        response = client.post(
            f"{ROUTES_URL}/generate",
            headers=admin_headers,
            json={"threshold_pct": 70.0},
        )
        assert response.status_code == 201
        data = response.json()
        waypoint_bin_ids = [str(wp["bin_id"]) for wp in data["waypoints"]]
        assert str(overflow_bin.id) in waypoint_bin_ids
        assert str(test_bin.id) not in waypoint_bin_ids

    def test_generated_route_has_route_code(
        self, client: TestClient, overflow_bin: Bin, admin_headers: dict
    ):
        """Every generated route must have a unique human-readable route_code."""
        response = client.post(
            f"{ROUTES_URL}/generate",
            headers=admin_headers,
            json={"threshold_pct": 70.0},
        )
        data = response.json()
        assert "route_code" in data
        assert data["route_code"] is not None

    def test_generated_route_stores_ai_and_baseline_distance(
        self, client: TestClient, overflow_bin: Bin, admin_headers: dict
    ):
        """
        Both distances must be stored for your evaluation chapter comparison.
        """
        response = client.post(
            f"{ROUTES_URL}/generate",
            headers=admin_headers,
            json={"threshold_pct": 70.0},
        )
        data = response.json()
        assert data["ai_distance_km"] is not None
        assert data["baseline_distance_km"] is not None

    def test_ai_distance_lte_baseline_in_response(
        self, client: TestClient, overflow_bin: Bin, admin_headers: dict
    ):
        """AI distance must be <= baseline in the API response."""
        response = client.post(
            f"{ROUTES_URL}/generate",
            headers=admin_headers,
            json={"threshold_pct": 70.0},
        )
        data = response.json()
        assert data["ai_distance_km"] <= data["baseline_distance_km"]

    def test_no_eligible_bins_returns_400(
        self, client: TestClient, test_bin: Bin, admin_headers: dict
    ):
        """
        If no bins exceed the threshold, generation must fail gracefully.
        test_bin is at 45% — below 70% threshold.
        """
        response = client.post(
            f"{ROUTES_URL}/generate",
            headers=admin_headers,
            json={"threshold_pct": 70.0},
        )
        assert response.status_code == 400

    def test_driver_cannot_generate_route(
        self, client: TestClient, overflow_bin: Bin, driver_headers: dict
    ):
        """Route generation is admin-only."""
        response = client.post(
            f"{ROUTES_URL}/generate",
            headers=driver_headers,
            json={"threshold_pct": 70.0},
        )
        assert response.status_code == 403

    def test_unauthenticated_cannot_generate_route(
        self, client: TestClient, overflow_bin: Bin
    ):
        response = client.post(
            f"{ROUTES_URL}/generate",
            json={"threshold_pct": 70.0},
        )
        assert response.status_code == 401


class TestGetRoutes:
    """GET /api/routes"""

    def test_returns_routes_list(
        self, client: TestClient, test_route: CollectionRoute, admin_headers: dict
    ):
        response = client.get(ROUTES_URL, headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        assert len(response.json()) >= 1

    def test_driver_can_list_routes(
        self, client: TestClient, test_route: CollectionRoute, driver_headers: dict
    ):
        response = client.get(ROUTES_URL, headers=driver_headers)
        assert response.status_code == 200


class TestGetRouteById:
    """GET /api/routes/{id}"""

    def test_returns_route_with_waypoints(
        self, client: TestClient, test_route: CollectionRoute, admin_headers: dict
    ):
        response = client.get(f"{ROUTES_URL}/{test_route.id}", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "waypoints" in data
        assert len(data["waypoints"]) == 2

    def test_waypoints_ordered_by_stop_order(
        self, client: TestClient, test_route: CollectionRoute, admin_headers: dict
    ):
        """Waypoints must come back in stop_order sequence for the driver app."""
        response = client.get(f"{ROUTES_URL}/{test_route.id}", headers=admin_headers)
        waypoints = response.json()["waypoints"]
        orders = [wp["stop_order"] for wp in waypoints]
        assert orders == sorted(orders)


class TestAssignRoute:
    """PATCH /api/routes/{id}/assign"""

    def test_admin_can_assign_driver(
        self, client: TestClient, db: Session,
        test_route: CollectionRoute,
        driver_user, admin_headers: dict
    ):
        response = client.patch(
            f"{ROUTES_URL}/{test_route.id}/assign",
            headers=admin_headers,
            json={"driver_id": str(driver_user.id)},
        )
        assert response.status_code == 200
        db.refresh(test_route)
        assert test_route.assigned_driver_id == driver_user.id

    def test_assigning_non_driver_user_returns_400(
        self, client: TestClient,
        test_route: CollectionRoute,
        admin_user, admin_headers: dict
    ):
        """Cannot assign an admin as a collection driver."""
        response = client.patch(
            f"{ROUTES_URL}/{test_route.id}/assign",
            headers=admin_headers,
            json={"driver_id": str(admin_user.id)},
        )
        assert response.status_code == 400


class TestMarkCollected:
    """POST /api/routes/{id}/collect/{bin_id}"""

    def test_driver_can_mark_waypoint_collected(
        self, client: TestClient, db: Session,
        test_route: CollectionRoute,
        overflow_bin: Bin,
        driver_user, driver_headers: dict,
        admin_headers: dict
    ):
        # Assign route to driver first
        client.patch(
            f"{ROUTES_URL}/{test_route.id}/assign",
            headers=admin_headers,
            json={"driver_id": str(driver_user.id)},
        )

        response = client.post(
            f"{ROUTES_URL}/{test_route.id}/collect/{overflow_bin.id}",
            headers=driver_headers,
        )
        assert response.status_code == 200

        waypoint = db.exec(
            select(RouteWaypoint).where(
                RouteWaypoint.route_id == test_route.id,
                RouteWaypoint.bin_id == overflow_bin.id,
            )
        ).first()
        assert waypoint.status == WaypointStatus.collected
        assert waypoint.collected_at is not None

    def test_all_collected_sets_route_completed(
        self, client: TestClient, db: Session,
        test_route: CollectionRoute,
        test_bin: Bin, overflow_bin: Bin,
        driver_user, driver_headers: dict,
        admin_headers: dict
    ):
        """When every waypoint is collected, route status becomes completed."""
        client.patch(
            f"{ROUTES_URL}/{test_route.id}/assign",
            headers=admin_headers,
            json={"driver_id": str(driver_user.id)},
        )
        client.post(
            f"{ROUTES_URL}/{test_route.id}/collect/{overflow_bin.id}",
            headers=driver_headers,
        )
        client.post(
            f"{ROUTES_URL}/{test_route.id}/collect/{test_bin.id}",
            headers=driver_headers,
        )
        db.refresh(test_route)
        assert test_route.status == RouteStatus.completed
        assert test_route.completed_at is not None
