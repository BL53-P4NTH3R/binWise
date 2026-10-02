from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.database import get_db
from app.models.bin import Bin
from app.models.sensor_node import (
    SensorNode,
    SensorNodeCreate,
    SensorNodeRead,
    SensorNodeUpdate,
)


router = APIRouter(tags=["sensor_nodes"])


def _get_node_or_404(node_id: str, db: Session) -> SensorNode:
    node = db.exec(
        select(SensorNode).where(SensorNode.node_id == node_id)
    ).first()
    if node is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sensor node '{node_id}' not found",
        )
    return node


@router.get("", response_model=list[SensorNodeRead])
def list_sensor_nodes(db: Session = Depends(get_db)) -> list[SensorNode]:
    """List all registered sensor nodes."""
    return list(db.exec(select(SensorNode)).all())


@router.post("", response_model=SensorNodeRead, status_code=status.HTTP_201_CREATED)
def create_sensor_node(
    payload: SensorNodeCreate, db: Session = Depends(get_db)
) -> SensorNode:
    """Register a new sensor node, optionally assigning it to a bin."""

    existing = db.exec(
        select(SensorNode).where(SensorNode.node_id == payload.node_id)
    ).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Sensor node '{payload.node_id}' already exists",
        )

    if payload.bin_id is not None:
        bin_record = db.get(Bin, payload.bin_id)
        if bin_record is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bin not found",
            )

        bin_taken = db.exec(
            select(SensorNode).where(SensorNode.bin_id == payload.bin_id)
        ).first()
        if bin_taken is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Bin already has sensor node '{bin_taken.node_id}' assigned",
            )

    node = SensorNode.model_validate(payload)
    db.add(node)
    db.commit()
    db.refresh(node)
    return node


@router.get("/{node_id}", response_model=SensorNodeRead)
def get_sensor_node(node_id: str, db: Session = Depends(get_db)) -> SensorNode:
    """Get a single sensor node by its node_id (e.g. US-Node-402)."""
    return _get_node_or_404(node_id, db)


@router.patch("/{node_id}", response_model=SensorNodeRead)
def update_sensor_node(
    node_id: str, payload: SensorNodeUpdate, db: Session = Depends(get_db)
) -> SensorNode:
    """Update firmware version, GSM number, active status, or bin assignment."""
    node = _get_node_or_404(node_id, db)

    update_data = payload.model_dump(exclude_unset=True)

    if "bin_id" in update_data and update_data["bin_id"] is not None:
        new_bin_id = update_data["bin_id"]
        bin_record = db.get(Bin, new_bin_id)
        if bin_record is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bin not found",
            )
        bin_taken = db.exec(
            select(SensorNode).where(
                SensorNode.bin_id == new_bin_id,
                SensorNode.id != node.id,
            )
        ).first()
        if bin_taken is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Bin already has sensor node '{bin_taken.node_id}' assigned",
            )

    for field, value in update_data.items():
        setattr(node, field, value)

    db.add(node)
    db.commit()
    db.refresh(node)
    return node


@router.delete("/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sensor_node(node_id: str, db: Session = Depends(get_db)) -> None:
    """Permanently remove a sensor node registration.

    Note: this does NOT delete past SensorReading rows, since those
    reference node_id as a plain string, not a foreign key to this
    table. Historical readings are preserved even after a node is
    deleted or replaced.
    """
    node = _get_node_or_404(node_id, db)
    db.delete(node)
    db.commit()