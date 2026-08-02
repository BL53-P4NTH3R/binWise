import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models import (
    Alert,
    AlertStatus,
    AlertType,
    Bin,
    FillStatus,
    SensorNode,
    SensorReading,
)


INGEST_URL = "/api/ingest"

class TestIngestValidPayload:
    """Happy-path telemetry ingestion."""

    def test_valid_payload_returns_200(
        self, client: TestClient, test_sensor_node: SensorNode
    ):
        """A well-formed payload from a known sensor node returns 200."""
        response = client.post(INGEST_URL, json={
            "sensor_id": "US-Node-402",
            "fill_pct": 55.0,
            "battery_pct": 78.0,
            "rssi_dbm": -72,
        })
        assert response.status_code == 200

    def test_ingest_creates_sensor_reading_row(
        self, client: TestClient, db: Session, test_sensor_node: SensorNode
    ):
        """
        A successful POST must create exactly one SensorReading row.
        This is the append-only log that powers analytics.
        """
        client.post(INGEST_URL, json={
            "sensor_id": "US-Node-402",
            "fill_pct": 55.0,
            "battery_pct": 78.0,
        })
        readings = db.exec(select(SensorReading)).all()
        assert len(readings) == 1
        assert readings[0].fill_pct == 55.0
        assert readings[0].node_id == "US-Node-402"

    def test_ingest_updates_bin_fill_pct(
        self, client: TestClient, db: Session,
        test_bin: Bin, test_sensor_node: SensorNode
    ):
        """
        After ingestion, the bin's fill_pct must be updated in-place.
        This is what the dashboard map reads — not sensor_readings.
        """
        client.post(INGEST_URL, json={
            "sensor_id": "US-Node-402",
            "fill_pct": 63.0,
            "battery_pct": 70.0,
        })
        db.refresh(test_bin)
        assert test_bin.fill_pct == 63.0

    def test_ingest_updates_battery_pct(
        self, client: TestClient, db: Session,
        test_bin: Bin, test_sensor_node: SensorNode
    ):
        """bin.battery_pct must reflect the latest telemetry reading."""
        client.post(INGEST_URL, json={
            "sensor_id": "US-Node-402",
            "fill_pct": 30.0,
            "battery_pct": 42.0,
        })
        db.refresh(test_bin)
        assert test_bin.battery_pct == 42.0

    def test_ingest_updates_last_reading_timestamp(
        self, client: TestClient, db: Session,
        test_bin: Bin, test_sensor_node: SensorNode
    ):
        """bin.last_reading must be set after the first telemetry POST."""
        assert test_bin.last_reading is None
        client.post(INGEST_URL, json={
            "sensor_id": "US-Node-402",
            "fill_pct": 30.0,
        })
        db.refresh(test_bin)
        assert test_bin.last_reading is not None


class TestFillStatusDerivation:
    """fill_status must be recalculated correctly on every ingest."""

    def test_fill_below_50_sets_normal_status(
        self, client: TestClient, db: Session,
        test_bin: Bin, test_sensor_node: SensorNode
    ):
        client.post(INGEST_URL, json={"sensor_id": "US-Node-402", "fill_pct": 30.0})
        db.refresh(test_bin)
        assert test_bin.fill_status == FillStatus.normal

    def test_fill_at_50_sets_warning_status(
        self, client: TestClient, db: Session,
        test_bin: Bin, test_sensor_node: SensorNode
    ):
        client.post(INGEST_URL, json={"sensor_id": "US-Node-402", "fill_pct": 50.0})
        db.refresh(test_bin)
        assert test_bin.fill_status == FillStatus.warning

    def test_fill_at_80_sets_warning_status(
        self, client: TestClient, db: Session,
        test_bin: Bin, test_sensor_node: SensorNode
    ):
        client.post(INGEST_URL, json={"sensor_id": "US-Node-402", "fill_pct": 80.0})
        db.refresh(test_bin)
        assert test_bin.fill_status == FillStatus.warning

    def test_fill_above_80_sets_overflow_status(
        self, client: TestClient, db: Session,
        test_bin: Bin, test_sensor_node: SensorNode
    ):
        client.post(INGEST_URL, json={"sensor_id": "US-Node-402", "fill_pct": 81.0})
        db.refresh(test_bin)
        assert test_bin.fill_status == FillStatus.overflow

    def test_fill_at_100_sets_overflow_status(
        self, client: TestClient, db: Session,
        test_bin: Bin, test_sensor_node: SensorNode
    ):
        client.post(INGEST_URL, json={"sensor_id": "US-Node-402", "fill_pct": 100.0})
        db.refresh(test_bin)
        assert test_bin.fill_status == FillStatus.overflow


class TestAlertCreation:
    """Alert engine triggered by ingest."""

    def test_overflow_reading_creates_alert(
        self, client: TestClient, db: Session,
        test_bin: Bin, test_sensor_node: SensorNode, alert_settings
    ):
        """
        A reading above overflow_threshold must create one overflow alert.
        This is the core safety feature of BinWise.
        """
        client.post(INGEST_URL, json={"sensor_id": "US-Node-402", "fill_pct": 85.0})
        alerts = db.exec(
            select(Alert).where(
                Alert.bin_id == test_bin.id,
                Alert.alert_type == AlertType.overflow,
            )
        ).all()
        assert len(alerts) == 1
        assert alerts[0].status == AlertStatus.open

    def test_overflow_alert_not_duplicated(
        self, client: TestClient, db: Session,
        test_bin: Bin, test_sensor_node: SensorNode, alert_settings
    ):
        """
        Two overflow readings for the same bin must create only ONE alert.
        The dedup logic in alert_service.check_alerts() prevents alert spam.
        Without this, a bin reporting every 5 minutes would create 288 alerts/day.
        """
        client.post(INGEST_URL, json={"sensor_id": "US-Node-402", "fill_pct": 85.0})
        client.post(INGEST_URL, json={"sensor_id": "US-Node-402", "fill_pct": 88.0})
        alerts = db.exec(
            select(Alert).where(
                Alert.bin_id == test_bin.id,
                Alert.alert_type == AlertType.overflow,
                Alert.status == AlertStatus.open,
            )
        ).all()
        assert len(alerts) == 1

    def test_normal_reading_does_not_create_alert(
        self, client: TestClient, db: Session,
        test_bin: Bin, test_sensor_node: SensorNode, alert_settings
    ):
        """A reading below threshold must not create any alert."""
        client.post(INGEST_URL, json={"sensor_id": "US-Node-402", "fill_pct": 40.0})
        alerts = db.exec(select(Alert).where(Alert.bin_id == test_bin.id)).all()
        assert len(alerts) == 0


class TestIngestValidation:
    """Payload validation and error cases."""

    def test_unknown_sensor_id_returns_404(self, client: TestClient):
        """A sensor_id not in sensor_nodes table must return 404."""
        response = client.post(INGEST_URL, json={
            "sensor_id": "US-Node-999",
            "fill_pct": 50.0,
        })
        assert response.status_code == 404

    def test_fill_pct_above_100_returns_422(
        self, client: TestClient, test_sensor_node: SensorNode
    ):
        """fill_pct > 100 is physically impossible — must be rejected."""
        response = client.post(INGEST_URL, json={
            "sensor_id": "US-Node-402",
            "fill_pct": 110.0,
        })
        assert response.status_code == 422

    def test_fill_pct_below_0_returns_422(
        self, client: TestClient, test_sensor_node: SensorNode
    ):
        """fill_pct < 0 is physically impossible — must be rejected."""
        response = client.post(INGEST_URL, json={
            "sensor_id": "US-Node-402",
            "fill_pct": -5.0,
        })
        assert response.status_code == 422

    def test_missing_sensor_id_returns_422(self, client: TestClient):
        """Missing sensor_id field must return 422."""
        response = client.post(INGEST_URL, json={"fill_pct": 50.0})
        assert response.status_code == 422

    def test_missing_fill_pct_returns_422(
        self, client: TestClient, test_sensor_node: SensorNode
    ):
        """Missing fill_pct field must return 422."""
        response = client.post(INGEST_URL, json={"sensor_id": "US-Node-402"})
        assert response.status_code == 422

    def test_no_auth_required(
        self, client: TestClient, test_sensor_node: SensorNode
    ):
        """
        The ingest endpoint must work WITHOUT an Authorization header.
        The ESP32 cannot store or manage JWT tokens.
        """
        response = client.post(INGEST_URL, json={
            "sensor_id": "US-Node-402",
            "fill_pct": 50.0,
        })
        assert response.status_code == 200
