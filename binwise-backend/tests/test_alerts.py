import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models import Alert, AlertStatus, AlertType, AlertSeverity, Bin
from app.services.alert_service import check_alerts, create_alert

ALERTS_URL = "/api/alerts"

class TestAlertService:
    """Direct unit tests of alert_service functions — no HTTP."""

    def test_check_alerts_creates_overflow_alert(
        self, db: Session, test_bin: Bin, alert_settings
    ):
        """
        check_alerts() must create an overflow alert when
        fill_pct exceeds alert_settings.overflow_threshold.
        """
        test_bin.fill_pct = 85.0
        db.add(test_bin)
        db.commit()

        check_alerts(test_bin, db)

        alert = db.exec(
            select(Alert).where(
                Alert.bin_id == test_bin.id,
                Alert.alert_type == AlertType.overflow,
            )
        ).first()
        assert alert is not None
        assert alert.status == AlertStatus.open
        assert alert.severity == AlertSeverity.critical

    def test_check_alerts_deduplication(
        self, db: Session, test_bin: Bin, alert_settings
    ):
        """
        Calling check_alerts() twice for the same overflow bin
        must still produce only ONE open alert.
        This is the dedup guard — critical for preventing alert spam.
        """
        test_bin.fill_pct = 85.0
        db.add(test_bin)
        db.commit()

        check_alerts(test_bin, db)
        check_alerts(test_bin, db)

        alerts = db.exec(
            select(Alert).where(
                Alert.bin_id == test_bin.id,
                Alert.alert_type == AlertType.overflow,
                Alert.status == AlertStatus.open,
            )
        ).all()
        assert len(alerts) == 1

    def test_check_alerts_no_alert_below_threshold(
        self, db: Session, test_bin: Bin, alert_settings
    ):
        """No alert must be created when fill_pct is below overflow_threshold."""
        test_bin.fill_pct = 50.0
        db.add(test_bin)
        db.commit()

        check_alerts(test_bin, db)

        alerts = db.exec(
            select(Alert).where(Alert.bin_id == test_bin.id)
        ).all()
        assert len(alerts) == 0

    def test_create_alert_persists_to_db(
        self, db: Session, test_bin: Bin
    ):
        """create_alert() helper must add a row to the alerts table."""
        create_alert(
            bin_record=test_bin,
            alert_type=AlertType.offline,
            severity=AlertSeverity.warning,
            db=db,
            message="Sensor US-Node-402 has not reported in 15 minutes.",
        )
        alert = db.exec(
            select(Alert).where(
                Alert.bin_id == test_bin.id,
                Alert.alert_type == AlertType.offline,
            )
        ).first()
        assert alert is not None
        assert alert.message is not None


class TestGetAlerts:
    """GET /api/alerts"""

    def test_returns_open_alerts_by_default(
        self, client: TestClient, db: Session,
        test_bin: Bin, admin_headers: dict
    ):
        """Default response must include only open alerts."""
        alert = Alert(
            bin_id=test_bin.id,
            alert_type=AlertType.overflow,
            severity=AlertSeverity.critical,
            status=AlertStatus.open,
        )
        db.add(alert)
        db.commit()

        response = client.get(ALERTS_URL, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        for item in data:
            assert item["status"] == "open"

    def test_filter_by_resolved_status(
        self, client: TestClient, db: Session,
        test_bin: Bin, admin_headers: dict
    ):
        """Status query param must filter results correctly."""
        alert = Alert(
            bin_id=test_bin.id,
            alert_type=AlertType.overflow,
            severity=AlertSeverity.critical,
            status=AlertStatus.resolved,
        )
        db.add(alert)
        db.commit()

        response = client.get(
            f"{ALERTS_URL}?status=resolved", headers=admin_headers
        )
        assert response.status_code == 200
        for item in response.json():
            assert item["status"] == "resolved"

    def test_returns_401_without_token(self, client: TestClient):
        response = client.get(ALERTS_URL)
        assert response.status_code == 401

    def test_driver_cannot_access_alerts(
        self, client: TestClient, driver_headers: dict
    ):
        """Alert centre is admin-only."""
        response = client.get(ALERTS_URL, headers=driver_headers)
        assert response.status_code == 403


class TestResolveAlert:
    """PATCH /api/alerts/{id}/resolve"""

    def test_admin_can_resolve_alert(
        self, client: TestClient, db: Session,
        test_bin: Bin, admin_user, admin_headers: dict
    ):
        alert = Alert(
            bin_id=test_bin.id,
            alert_type=AlertType.overflow,
            severity=AlertSeverity.critical,
            status=AlertStatus.open,
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)

        response = client.patch(
            f"{ALERTS_URL}/{alert.id}/resolve", headers=admin_headers
        )
        assert response.status_code == 200

        db.refresh(alert)
        assert alert.status == AlertStatus.resolved
        assert alert.resolved_at is not None
        assert alert.resolved_by == admin_user.id

    def test_resolve_already_resolved_returns_400(
        self, client: TestClient, db: Session,
        test_bin: Bin, admin_headers: dict
    ):
        """Resolving an already-resolved alert must return 400."""
        alert = Alert(
            bin_id=test_bin.id,
            alert_type=AlertType.overflow,
            severity=AlertSeverity.critical,
            status=AlertStatus.resolved,
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)

        response = client.patch(
            f"{ALERTS_URL}/{alert.id}/resolve", headers=admin_headers
        )
        assert response.status_code == 400

    def test_unknown_alert_id_returns_404(
        self, client: TestClient, admin_headers: dict
    ):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.patch(
            f"{ALERTS_URL}/{fake_id}/resolve", headers=admin_headers
        )
        assert response.status_code == 404

    def test_driver_cannot_resolve_alert(
        self, client: TestClient, db: Session,
        test_bin: Bin, driver_headers: dict
    ):
        alert = Alert(
            bin_id=test_bin.id,
            alert_type=AlertType.overflow,
            severity=AlertSeverity.critical,
            status=AlertStatus.open,
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)

        response = client.patch(
            f"{ALERTS_URL}/{alert.id}/resolve", headers=driver_headers
        )
        assert response.status_code == 403


class TestAlertThresholds:
    """GET and PATCH /api/alerts/settings/thresholds"""

    def test_get_thresholds_returns_settings(
        self, client: TestClient, alert_settings, admin_headers: dict
    ):
        response = client.get(
            f"{ALERTS_URL}/settings/thresholds", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["overflow_threshold"] == 80.0
        assert data["offline_timeout_min"] == 15
        assert data["low_battery_threshold"] == 20.0

    def test_admin_can_update_threshold(
        self, client: TestClient, db: Session,
        alert_settings, admin_headers: dict
    ):
        response = client.patch(
            f"{ALERTS_URL}/settings/thresholds",
            headers=admin_headers,
            json={"overflow_threshold": 75.0},
        )
        assert response.status_code == 200
        assert response.json()["overflow_threshold"] == 75.0

    def test_threshold_above_100_returns_422(
        self, client: TestClient, alert_settings, admin_headers: dict
    ):
        """overflow_threshold > 100 is physically impossible."""
        response = client.patch(
            f"{ALERTS_URL}/settings/thresholds",
            headers=admin_headers,
            json={"overflow_threshold": 150.0},
        )
        assert response.status_code == 422
