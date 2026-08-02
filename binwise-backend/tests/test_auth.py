import pytest
from fastapi.testclient import TestClient

from app.models import User, UserRole


class TestLogin:
    """POST /api/auth/login"""

    def test_admin_login_returns_token(self, client: TestClient, admin_user: User):
        """Valid admin credentials return a 200 with an access_token."""
        response = client.post(
            "/api/auth/login",
            json={"email": "musa.abdullahi@abu.edu.ng", "password": "Admin123!"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 20  # sanity check it's a real JWT

    def test_driver_login_returns_token(self, client: TestClient, driver_user: User):
        """Valid driver credentials return a 200 with an access_token."""
        response = client.post(
            "/api/auth/login",
            json={"email": "umar.sule@abu.edu.ng", "password": "Driver123!"},
        )
        assert response.status_code == 200
        assert "access_token" in response.json()

    def test_wrong_password_returns_401(self, client: TestClient, admin_user: User):
        """Incorrect password must return 401, not 500."""
        response = client.post(
            "/api/auth/login",
            json={"email": "musa.abdullahi@abu.edu.ng", "password": "WrongPassword!"},
        )
        assert response.status_code == 401

    def test_unknown_email_returns_401(self, client: TestClient):
        """Email not in database must return 401."""
        response = client.post(
            "/api/auth/login",
            json={"email": "nobody@abu.edu.ng", "password": "SomePass123!"},
        )
        assert response.status_code == 401

    def test_missing_email_field_returns_422(self, client: TestClient):
        """Payload missing email field must return 422 validation error."""
        response = client.post(
            "/api/auth/login",
            json={"password": "Admin123!"},
        )
        assert response.status_code == 422

    def test_missing_password_field_returns_422(self, client: TestClient):
        """Payload missing password field must return 422 validation error."""
        response = client.post(
            "/api/auth/login",
            json={"email": "musa.abdullahi@abu.edu.ng"},
        )
        assert response.status_code == 422

    def test_inactive_user_cannot_login(self, client: TestClient, db, admin_user: User):
        """Deactivated user must be rejected even with correct credentials."""
        admin_user.is_active = False
        db.add(admin_user)
        db.commit()

        response = client.post(
            "/api/auth/login",
            json={"email": "musa.abdullahi@abu.edu.ng", "password": "Admin123!"},
        )
        assert response.status_code == 401

    def test_empty_body_returns_422(self, client: TestClient):
        """Empty JSON body must return 422."""
        response = client.post("/api/auth/login", json={})
        assert response.status_code == 422


class TestForgotPassword:
    """POST /api/auth/forgot-password"""

    def test_known_email_returns_200(self, client: TestClient, admin_user: User):
        """Known email triggers reset flow and returns 200."""
        response = client.post(
            "/api/auth/forgot-password",
            json={"email": "musa.abdullahi@abu.edu.ng"},
        )
        assert response.status_code == 200

    def test_unknown_email_still_returns_200(self, client: TestClient):
        """
        Unknown email must also return 200.
        Security best practice: never reveal whether an email is registered.
        """
        response = client.post(
            "/api/auth/forgot-password",
            json={"email": "doesnotexist@abu.edu.ng"},
        )
        assert response.status_code == 200