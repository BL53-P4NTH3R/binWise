from io import BytesIO

from fastapi.testclient import TestClient
from openpyxl import Workbook
from sqlmodel import Session, select

from app.models import Bin, SensorNode, User, Zone


def test_bulk_users_imports_valid_rows_and_reports_row_errors(
    client: TestClient, db: Session, admin_headers: dict, admin_user: User
):
    response = client.post(
        "/api/users/bulk",
        headers=admin_headers,
        json=[
            {
                "email": "driver.one@example.com",
                "full_name": "Driver One",
                "password": "DriverPass123!",
                "role": "driver",
            },
            {
                "email": admin_user.email,
                "full_name": "Duplicate Email",
                "password": "DriverPass123!",
            },
            {
                "email": "invalid@example.com",
                "full_name": "",
                "password": "short",
            },
        ],
    )

    assert response.status_code == 200
    result = response.json()
    assert (result["total_rows"], result["created"], result["failed"]) == (3, 1, 2)
    assert [item["row"] for item in result["created_records"]] == [1]
    assert [item["row"] for item in result["errors"]] == [2, 3]
    assert db.exec(select(User).where(User.email == "driver.one@example.com")).first() is not None


def test_bulk_bins_validates_zone_and_duplicate_codes(
    client: TestClient, admin_headers: dict, test_zone: Zone
):
    row = {
        "bin_code": "BULK-01",
        "location_name": "North entrance",
        "latitude": 11.15,
        "longitude": 7.62,
        "zone_id": str(test_zone.id),
    }
    response = client.post(
        "/api/bins/bulk",
        headers=admin_headers,
        json=[
            row,
            row,
            {**row, "bin_code": "BULK-02", "zone_id": "00000000-0000-0000-0000-000000000001"},
        ],
    )

    assert response.status_code == 200
    result = response.json()
    assert (result["created"], result["failed"]) == (1, 2)
    assert [item["row"] for item in result["errors"]] == [2, 3]


def test_bulk_sensor_nodes_prevents_duplicate_bin_assignments(
    client: TestClient, db: Session, admin_headers: dict, test_bin: Bin
):
    response = client.post(
        "/api/sensor-nodes/bulk",
        headers=admin_headers,
        json=[
            {"node_id": "BULK-NODE-1", "bin_id": str(test_bin.id)},
            {"node_id": "BULK-NODE-2", "bin_id": str(test_bin.id)},
            {"node_id": "BULK-NODE-3", "bin_id": "00000000-0000-0000-0000-000000000001"},
        ],
    )

    assert response.status_code == 200
    result = response.json()
    assert (result["created"], result["failed"]) == (1, 2)
    assert db.exec(select(SensorNode).where(SensorNode.node_id == "BULK-NODE-1")).first() is not None


def test_bulk_zones_csv_import_reports_invalid_rows(
    client: TestClient, admin_headers: dict, test_zone: Zone
):
    csv_data = (
        "name,description\n"
        "Sports Complex,Imported from CSV\n"
        f"{test_zone.name},Already exists\n"
        ",Missing name\n"
    )
    response = client.post(
        "/api/zones/bulk/upload",
        headers=admin_headers,
        files={"file": ("zones.csv", csv_data.encode(), "text/csv")},
    )

    assert response.status_code == 200
    result = response.json()
    assert (result["total_rows"], result["created"], result["failed"]) == (3, 1, 2)
    assert [item["row"] for item in result["errors"]] == [3, 4]


def test_bulk_sensor_nodes_xlsx_import_supports_blank_optional_bin_id(
    client: TestClient, admin_headers: dict
):
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["node_id", "firmware_v", "gsm_number", "bin_id"])
    sheet.append(["XLSX-NODE-1", "1.2", "08000000000", None])
    data = BytesIO()
    workbook.save(data)

    response = client.post(
        "/api/sensor-nodes/bulk/upload",
        headers=admin_headers,
        files={
            "file": (
                "sensor_nodes.xlsx",
                data.getvalue(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert (result["created"], result["failed"]) == (1, 0)


def test_bulk_import_endpoints_require_admin(client: TestClient, driver_headers: dict):
    response = client.post(
        "/api/zones/bulk",
        json=[{"name": "Unauthorized zone", "description": None}],
    )
    assert response.status_code == 401

    response = client.post(
        "/api/zones/bulk",
        headers=driver_headers,
        json=[{"name": "Driver zone", "description": None}],
    )
    assert response.status_code == 403
