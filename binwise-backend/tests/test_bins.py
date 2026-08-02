import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models import Bin, BinStatus, FillStatus, Zone


BINS_URL = "/api/bins"

class TestGetLiveBins:
    """GET /api/bins/live"""

    def test_returns_200_for_authenticated_user(
        self, client: TestClient, test_bin: Bin, admin_headers: dict
    ):
        response = client.get(f"{BINS_URL}/live", headers=admin_headers)
        assert response.status_code == 200

    def test_returns_list_of_bins(
        self, client: TestClient, test_bin: Bin, admin_headers: dict
    ):
        response = client.get(f"{BINS_URL}/live", headers=admin_headers)
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_live_response_contains_required_fields(
        self, client: TestClient, test_bin: Bin, admin_headers: dict
    ):
        """BinLive schema must include fields the dashboard map needs."""
        response = client.get(f"{BINS_URL}/live", headers=admin_headers)
        bin_data = response.json()[0]
        for field in ["bin_code", "latitude", "longitude", "fill_pct", "fill_status"]:
            assert field in bin_data, f"Missing field: {field}"

    def test_returns_401_without_token(self, client: TestClient, test_bin: Bin):
        response = client.get(f"{BINS_URL}/live")
        assert response.status_code == 401

    def test_driver_can_access_live_bins(
        self, client: TestClient, test_bin: Bin, driver_headers: dict
    ):
        """Drivers need live bin data for their route navigation screen."""
        response = client.get(f"{BINS_URL}/live", headers=driver_headers)
        assert response.status_code == 200


class TestGetBinsSummary:
    """GET /api/bins/summary"""

    def test_returns_summary_kpi_fields(
        self, client: TestClient, test_bin: Bin, admin_headers: dict
    ):
        """Dashboard KPI cards need all four counts."""
        response = client.get(f"{BINS_URL}/summary", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ["total_bins", "overflow_count", "offline_count", "collections_today"]:
            assert field in data, f"Missing KPI field: {field}"

    def test_overflow_count_correct(
        self, client: TestClient,
        test_bin: Bin, overflow_bin: Bin,
        admin_headers: dict
    ):
        """overflow_count must match bins with fill_status=overflow."""
        response = client.get(f"{BINS_URL}/summary", headers=admin_headers)
        data = response.json()
        assert data["overflow_count"] >= 1
        assert data["total_bins"] >= 2

    def test_returns_401_without_token(self, client: TestClient):
        response = client.get(f"{BINS_URL}/summary")
        assert response.status_code == 401


class TestGetBins:
    """GET /api/bins"""

    def test_returns_paginated_list(
        self, client: TestClient, test_bin: Bin, admin_headers: dict
    ):
        response = client.get(BINS_URL, headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_returns_401_without_token(self, client: TestClient):
        response = client.get(BINS_URL)
        assert response.status_code == 401


class TestGetBinById:
    """GET /api/bins/{id}"""

    def test_returns_bin_detail(
        self, client: TestClient, test_bin: Bin, admin_headers: dict
    ):
        response = client.get(f"{BINS_URL}/{test_bin.id}", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["bin_code"] == "ACB-Bin-01"

    def test_unknown_id_returns_404(
        self, client: TestClient, admin_headers: dict
    ):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.get(f"{BINS_URL}/{fake_id}", headers=admin_headers)
        assert response.status_code == 404


class TestCreateBin:
    """POST /api/bins"""

    def test_admin_can_create_bin(
        self, client: TestClient, test_zone: Zone, admin_headers: dict
    ):
        response = client.post(
            BINS_URL,
            headers=admin_headers,
            json={
                "bin_code": "FPS-Bin-01",
                "location_name": "Physics Department Entrance",
                "latitude": 11.1562,
                "longitude": 7.6235,
                "capacity_l": 120,
                "height_cm": 80,
                "zone_id": str(test_zone.id),
            },
        )
        assert response.status_code == 201
        assert response.json()["bin_code"] == "FPS-Bin-01"

    def test_driver_cannot_create_bin(
        self, client: TestClient, test_zone: Zone, driver_headers: dict
    ):
        """Only admins can register new bins."""
        response = client.post(
            BINS_URL,
            headers=driver_headers,
            json={
                "bin_code": "FPS-Bin-99",
                "location_name": "Some Location",
                "latitude": 11.156,
                "longitude": 7.623,
                "zone_id": str(test_zone.id),
            },
        )
        assert response.status_code == 403

    def test_duplicate_bin_code_returns_409(
        self, client: TestClient, test_bin: Bin,
        test_zone: Zone, admin_headers: dict
    ):
        """bin_code must be unique — duplicate must return 409."""
        response = client.post(
            BINS_URL,
            headers=admin_headers,
            json={
                "bin_code": "ACB-Bin-01",  # already exists
                "location_name": "Another Location",
                "latitude": 11.156,
                "longitude": 7.623,
                "zone_id": str(test_zone.id),
            },
        )
        assert response.status_code == 409

    def test_missing_required_field_returns_422(
        self, client: TestClient, admin_headers: dict
    ):
        """Missing bin_code must return 422."""
        response = client.post(
            BINS_URL,
            headers=admin_headers,
            json={
                "location_name": "Some Location",
                "latitude": 11.156,
                "longitude": 7.623,
            },
        )
        assert response.status_code == 422

    def test_create_bin_sets_active_status(
        self, client: TestClient, test_zone: Zone, admin_headers: dict
    ):
        """Newly created bins must default to active status."""
        response = client.post(
            BINS_URL,
            headers=admin_headers,
            json={
                "bin_code": "ADM-Bin-01",
                "location_name": "Admin Block",
                "latitude": 11.157,
                "longitude": 7.624,
                "zone_id": str(test_zone.id),
            },
        )
        assert response.json()["status"] == "active"


class TestUpdateBin:
    """PATCH /api/bins/{id}"""

    def test_admin_can_update_location_name(
        self, client: TestClient, test_bin: Bin, admin_headers: dict
    ):
        response = client.patch(
            f"{BINS_URL}/{test_bin.id}",
            headers=admin_headers,
            json={"location_name": "Updated Location Name"},
        )
        assert response.status_code == 200
        assert response.json()["location_name"] == "Updated Location Name"

    def test_driver_cannot_update_bin(
        self, client: TestClient, test_bin: Bin, driver_headers: dict
    ):
        response = client.patch(
            f"{BINS_URL}/{test_bin.id}",
            headers=driver_headers,
            json={"location_name": "Hacked Location"},
        )
        assert response.status_code == 403

    def test_update_unknown_bin_returns_404(
        self, client: TestClient, admin_headers: dict
    ):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.patch(
            f"{BINS_URL}/{fake_id}",
            headers=admin_headers,
            json={"location_name": "Nowhere"},
        )
        assert response.status_code == 404


class TestDeactivateBin:
    """DELETE /api/bins/{id} — sets status=inactive, does not delete row."""

    def test_admin_can_deactivate_bin(
        self, client: TestClient, db: Session,
        test_bin: Bin, admin_headers: dict
    ):
        response = client.delete(
            f"{BINS_URL}/{test_bin.id}", headers=admin_headers
        )
        assert response.status_code == 200
        db.refresh(test_bin)
        # Row must still exist — only status changes
        assert test_bin.status == BinStatus.inactive

    def test_deactivated_bin_row_still_exists(
        self, client: TestClient, db: Session,
        test_bin: Bin, admin_headers: dict
    ):
        """
        Physical deletion would destroy historical sensor_readings.
        Deactivation preserves data integrity.
        """
        client.delete(f"{BINS_URL}/{test_bin.id}", headers=admin_headers)
        existing = db.exec(select(Bin).where(Bin.id == test_bin.id)).first()
        assert existing is not None

    def test_driver_cannot_deactivate_bin(
        self, client: TestClient, test_bin: Bin, driver_headers: dict
    ):
        response = client.delete(
            f"{BINS_URL}/{test_bin.id}", headers=driver_headers
        )
        assert response.status_code == 403
