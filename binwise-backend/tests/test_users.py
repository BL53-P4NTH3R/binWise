import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import User, UserRole


USERS_URL = "/api/users"

class TestGetUsers:
    """GET /api/users"""

    def test_admin_can_list_users(
        self, client: TestClient, admin_user: User, admin_headers: dict
    ):
        response = client.get(USERS_URL, headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_driver_cannot_list_users(
        self, client: TestClient, driver_user: User, driver_headers: dict
    ):
        """User management is admin-only."""
        response = client.get(USERS_URL, headers=driver_headers)
        assert response.status_code == 403

    def test_response_never_includes_hashed_password(
        self, client: TestClient, admin_user: User, admin_headers: dict
    ):
        """
        hashed_pw must NEVER appear in any API response.
        This is a security requirement — verify it explicitly.
        """
        response = client.get(USERS_URL, headers=admin_headers)
        for user in response.json():
            assert "hashed_pw" not in user
            assert "password" not in user


class TestCreateUser:
    """POST /api/users"""

    def test_admin_can_create_driver(
        self, client: TestClient, admin_headers: dict
    ):
        response = client.post(
            USERS_URL,
            headers=admin_headers,
            json={
                "email": "bello.yusuf@abu.edu.ng",
                "full_name": "Bello Yusuf",
                "password": "DriverPass456!",
                "role": "driver",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "bello.yusuf@abu.edu.ng"
        assert data["role"] == "driver"

    def test_created_user_response_has_no_password(
        self, client: TestClient, admin_headers: dict
    ):
        response = client.post(
            USERS_URL,
            headers=admin_headers,
            json={
                "email": "fatima.garba@abu.edu.ng",
                "full_name": "Fatima Garba",
                "password": "AdminPass456!",
                "role": "admin",
            },
        )
        assert "hashed_pw" not in response.json()
        assert "password" not in response.json()

    def test_duplicate_email_returns_409(
        self, client: TestClient, admin_user: User, admin_headers: dict
    ):
        """Email addresses must be unique across the system."""
        response = client.post(
            USERS_URL,
            headers=admin_headers,
            json={
                "email": "musa.abdullahi@abu.edu.ng",  # already exists
                "full_name": "Duplicate User",
                "password": "SomePass123!",
                "role": "driver",
            },
        )
        assert response.status_code == 409

    def test_short_password_returns_422(
        self, client: TestClient, admin_headers: dict
    ):
        """Password under 8 characters must be rejected by Pydantic."""
        response = client.post(
            USERS_URL,
            headers=admin_headers,
            json={
                "email": "new.user@abu.edu.ng",
                "full_name": "New User",
                "password": "short",
                "role": "driver",
            },
        )
        assert response.status_code == 422

    def test_driver_cannot_create_user(
        self, client: TestClient, driver_headers: dict
    ):
        response = client.post(
            USERS_URL,
            headers=driver_headers,
            json={
                "email": "sneaky@abu.edu.ng",
                "full_name": "Sneaky Driver",
                "password": "SomePass123!",
                "role": "admin",
            },
        )
        assert response.status_code == 403


class TestUpdateUser:
    """PATCH /api/users/{id}"""

    def test_admin_can_deactivate_user(
        self, client: TestClient, db: Session,
        driver_user: User, admin_headers: dict
    ):
        response = client.patch(
            f"{USERS_URL}/{driver_user.id}",
            headers=admin_headers,
            json={"is_active": False},
        )
        assert response.status_code == 200
        db.refresh(driver_user)
        assert driver_user.is_active is False

    def test_admin_can_change_role(
        self, client: TestClient, db: Session,
        driver_user: User, admin_headers: dict
    ):
        response = client.patch(
            f"{USERS_URL}/{driver_user.id}",
            headers=admin_headers,
            json={"role": "admin"},
        )
        assert response.status_code == 200
        db.refresh(driver_user)
        assert driver_user.role == UserRole.admin

    def test_driver_cannot_update_user(
        self, client: TestClient,
        admin_user: User, driver_headers: dict
    ):
        response = client.patch(
            f"{USERS_URL}/{admin_user.id}",
            headers=driver_headers,
            json={"role": "admin"},
        )
        assert response.status_code == 403

    def test_unknown_user_returns_404(
        self, client: TestClient, admin_headers: dict
    ):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.patch(
            f"{USERS_URL}/{fake_id}",
            headers=admin_headers,
            json={"is_active": False},
        )
        assert response.status_code == 404
