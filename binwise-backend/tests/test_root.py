from fastapi.testclient import TestClient


def test_root_returns_api_confirmation(client: TestClient):
	response = client.get("/", follow_redirects=False)

	assert response.status_code == 200
	assert response.json() == {"message": "BinWise API is running"}


def test_health_check_returns_healthy_status(client: TestClient):
	response = client.get("/health")

	assert response.status_code == 200
	assert response.json() == {"status": "healthy"}
