"""Zone endpoints for BinWise."""

from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlmodel import Session, select

from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.services.bulk_import import (
    BulkRowError,
    json_import_rows,
    process_import_rows,
    uploaded_import_rows,
)
from app.models.user import User
from app.models.zone import Zone, ZoneCreate, ZoneRead, ZoneUpdate

router = APIRouter(tags=["zones"])


def _create_bulk_zone(data: dict[str, object], db: Session) -> Zone:
    payload = ZoneCreate.model_validate(data)
    if db.exec(select(Zone).where(Zone.name == payload.name)).first() is not None:
        raise BulkRowError("Zone with this name already exists")
    return Zone(**payload.model_dump())


@router.get("", response_model=list[ZoneRead])
def list_zones(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Zone]:
    """Return a list of all zones."""
    return list(db.exec(select(Zone)).all())


@router.post("/bulk")
def bulk_create_zones(
    payload: list[object],
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> dict[str, object]:
    """Create valid zones from a JSON array; report invalid rows individually."""
    rows = json_import_rows(payload)
    return process_import_rows(rows, db, lambda data: _create_bulk_zone(data, db))


@router.post("/bulk/upload")
def bulk_upload_zones(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> dict[str, object]:
    """Create valid zones from a CSV or XLSX file with one zone per row."""
    rows = uploaded_import_rows(file)
    return process_import_rows(rows, db, lambda data: _create_bulk_zone(data, db))


@router.get("/{zone_id}", response_model=ZoneRead)
def get_zone(
    zone_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Zone:
    """Return details for a specific zone."""
    zone = db.get(Zone, zone_id)
    if not zone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found")
    return zone


@router.post("", response_model=ZoneRead, status_code=status.HTTP_201_CREATED)
def create_zone(
    payload: ZoneCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> Zone:
    """Create a new zone (Admin only). Checks for duplicate names."""
    existing_zone = db.exec(select(Zone).where(Zone.name == payload.name)).first()
    if existing_zone:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Zone with this name already exists")
    
    zone = Zone(**payload.model_dump())
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return zone


@router.patch("/{zone_id}", response_model=ZoneRead)
def update_zone(
    zone_id: UUID,
    payload: ZoneUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> Zone:
    """Update an existing zone (Admin only)."""
    zone = db.get(Zone, zone_id)
    if not zone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    
    # Check name collision if name is being updated
    if "name" in update_data and update_data["name"] != zone.name:
        existing_zone = db.exec(select(Zone).where(Zone.name == update_data["name"])).first()
        if existing_zone:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Zone with this name already exists")

    for field, value in update_data.items():
        setattr(zone, field, value)
        
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return zone


@router.delete("/{zone_id}")
def delete_zone(
    zone_id: UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> dict[str, str]:
    """Delete a zone (Admin only). Prevents deletion if bins are attached."""
    zone = db.get(Zone, zone_id)
    if not zone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found")
    
    # Safety check: Do not delete if bins are still assigned to this zone
    if zone.bins:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Cannot delete zone. There are {len(zone.bins)} bins still assigned to it."
        )
        
    db.delete(zone)
    db.commit()
    return {"message": "Zone deleted successfully"}