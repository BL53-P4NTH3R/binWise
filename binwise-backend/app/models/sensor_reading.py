"""Sensor reading models for BinWise."""

from datetime import datetime
from typing import Optional, TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import Index
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.bin import Bin


class SensorReadingBase(SQLModel):
    fill_pct    : float
    distance_cm : Optional[float] = None
    battery_pct : Optional[float] = None
    rssi_dbm    : Optional[int]   = None


class SensorReading(SensorReadingBase, table=True):
    id         : Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    bin_id     : UUID           = Field(foreign_key="bin.id")
    node_id    : str            = Field(max_length=20)
    created_at : datetime       = Field(default_factory=datetime.utcnow)

    bin : Optional["Bin"] = Relationship(
        back_populates="readings",
        sa_relationship_kwargs={"lazy": "selectin"},
    )

    __table_args__ = (
        Index("ix_reading_bin_time", "bin_id", "created_at"),
        Index("ix_reading_created_at", "created_at"),
    )


class SensorPayload(SQLModel):
    """
    What the ESP32 POSTs to /api/ingest.
    sensor_id matches the node_id field in SensorNode table.
    The ingest router looks up the SensorNode by sensor_id,
    gets the bin_id from it, then creates a SensorReading row.
    """
    sensor_id   : str            = Field(max_length=20)
    fill_pct    : float          = Field(ge=0.0, le=100.0)
    battery_pct : Optional[float] = Field(default=None, ge=0.0, le=100.0)
    rssi_dbm    : Optional[int]   = Field(default=None)


class SensorReadingRead(SensorReadingBase):
    id         : UUID
    bin_id     : UUID
    node_id    : str
    created_at : datetime

    model_config = {"from_attributes": True}