"""BinWise test configuration and shared fixtures."""

import os
from typing import Generator

# 1. Set dummy PostgreSQL URL FIRST before any app imports
os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/binwise_test"

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlmodel.pool import StaticPool

# 2. Create SQLite test engine
test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False,
)

# 3. Patch engine BEFORE importing app modules
import app.core.database
app.core.database.engine = test_engine

# 4. NOW import app — lifespan will use the patched engine
from app.core.database import get_db
from app.core.security import get_password_hash
from app.main import fastapi_app
from app.models import (
    Alert,
    AlertSettings,
    AlertStatus,
    AlertType,
    AlertSeverity,
    Bin,
    BinStatus,
    FillStatus,
    CollectionRoute,
    RouteStatus,
    RouteWaypoint,
    WaypointStatus,
    SensorNode,
    User,
    UserRole,
    Zone,
)


# ── DATABASE FIXTURE ──────────────────────────────────────────────────────────

@pytest.fixture(name="db")
def db_fixture() -> Generator[Session, None, None]:
    """
    Yields a clean SQLite session for each test.
    Tables are created before the test and dropped after.
    """
    SQLModel.metadata.create_all(test_engine)
    with Session(test_engine) as session:
        yield session
    SQLModel.metadata.drop_all(test_engine)


# ── CLIENT FIXTURE ────────────────────────────────────────────────────────────

@pytest.fixture(name="client")
def client_fixture(db: Session) -> Generator[TestClient, None, None]:
    """
    Yields a FastAPI TestClient wired to the test database.
    The get_db dependency is overridden so all router code
    uses the same SQLite session as the test fixtures.
    """
    def override_get_db():
        yield db

    fastapi_app.dependency_overrides[get_db] = override_get_db
    with TestClient(fastapi_app, raise_server_exceptions=True) as client:
        yield client
    fastapi_app.dependency_overrides.clear()


# ── DATA FIXTURES ─────────────────────────────────────────────────────────────

@pytest.fixture(name="test_zone")
def test_zone_fixture(db: Session) -> Zone:
    zone = Zone(name="Academic Core", description="Main academic area")
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return zone


@pytest.fixture(name="test_bin")
def test_bin_fixture(db: Session, test_zone: Zone) -> Bin:
    bin_ = Bin(
        bin_code="ACB-Bin-01",
        location_name="Faculty of Physical Sciences Front Lawn",
        latitude=11.1558,
        longitude=7.6228,
        capacity_l=120,
        height_cm=80,
        zone_id=test_zone.id,
        fill_pct=45.0,
        fill_status=FillStatus.normal,
        status=BinStatus.active,
    )
    db.add(bin_)
    db.commit()
    db.refresh(bin_)
    return bin_


@pytest.fixture(name="overflow_bin")
def overflow_bin_fixture(db: Session, test_zone: Zone) -> Bin:
    bin_ = Bin(
        bin_code="ACB-Bin-02",
        location_name="Faculty of Engineering Entrance",
        latitude=11.1560,
        longitude=7.6230,
        capacity_l=120,
        height_cm=80,
        zone_id=test_zone.id,
        fill_pct=87.0,
        fill_status=FillStatus.overflow,
        status=BinStatus.active,
    )
    db.add(bin_)
    db.commit()
    db.refresh(bin_)
    return bin_


@pytest.fixture(name="test_sensor_node")
def test_sensor_node_fixture(db: Session, test_bin: Bin) -> SensorNode:
    node = SensorNode(
        node_id="US-Node-402",
        firmware_v="1.0.0",
        gsm_number="08012345678",
        bin_id=test_bin.id,
        is_active=True,
    )
    db.add(node)
    db.commit()
    db.refresh(node)
    return node


@pytest.fixture(name="admin_user")
def admin_user_fixture(db: Session) -> User:
    user = User(
        email="musa.abdullahi@abu.edu.ng",
        full_name="Musa Abdullahi",
        hashed_pw=get_password_hash("Admin123!"),
        role=UserRole.admin,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(name="driver_user")
def driver_user_fixture(db: Session) -> User:
    user = User(
        email="umar.sule@abu.edu.ng",
        full_name="Umar Sule",
        hashed_pw=get_password_hash("Driver123!"),
        role=UserRole.driver,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(name="admin_token")
def admin_token_fixture(client: TestClient, admin_user: User) -> str:
    response = client.post(
        "/api/auth/login",
        json={"email": "musa.abdullahi@abu.edu.ng", "password": "Admin123!"},
    )
    assert response.status_code == 200, f"Admin login failed: {response.json()}"
    return response.json()["access_token"]


@pytest.fixture(name="driver_token")
def driver_token_fixture(client: TestClient, driver_user: User) -> str:
    response = client.post(
        "/api/auth/login",
        json={"email": "umar.sule@abu.edu.ng", "password": "Driver123!"},
    )
    assert response.status_code == 200, f"Driver login failed: {response.json()}"
    return response.json()["access_token"]


@pytest.fixture(name="admin_headers")
def admin_headers_fixture(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(name="driver_headers")
def driver_headers_fixture(driver_token: str) -> dict:
    return {"Authorization": f"Bearer {driver_token}"}


@pytest.fixture(name="alert_settings")
def alert_settings_fixture(db: Session) -> AlertSettings:
    s = AlertSettings(
        overflow_threshold=80.0,
        offline_timeout_min=15,
        low_battery_threshold=20.0,
        notify_email=True,
        notify_sms=False,
        notify_inapp=True,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@pytest.fixture(name="test_route")
def test_route_fixture(
    db: Session,
    test_bin: Bin,
    overflow_bin: Bin,
) -> CollectionRoute:
    route = CollectionRoute(
        route_code="R-2024-001",
        status=RouteStatus.pending,
        threshold_pct=70.0,
        bin_count=2,
        ai_distance_km=1.2,
        baseline_distance_km=2.1,
        ai_duration_min=25,
    )
    db.add(route)
    db.commit()
    db.refresh(route)

    db.add(RouteWaypoint(
        route_id=route.id,
        bin_id=overflow_bin.id,
        stop_order=1,
        fill_pct_at_generation=87.0,
        status=WaypointStatus.pending,
    ))
    db.add(RouteWaypoint(
        route_id=route.id,
        bin_id=test_bin.id,
        stop_order=2,
        fill_pct_at_generation=45.0,
        status=WaypointStatus.pending,
    ))
    db.commit()
    return route