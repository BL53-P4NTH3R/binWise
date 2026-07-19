"""
BinWise — app/models/bin.py
 
Central model file for the bins table.
Demonstrates every SQLModel pattern you will repeat across all other model files:
  - Base class (shared fields, no table)
  - Table class (actual DB table, inherits base)
  - Read / Create / Update / Live variants
  - sa_column() for Enum and Index
  - Relationships with selectin loading
  - __table_args__ for composite indexes
  - Optional fields with explicit None defaults
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import Column, Index
from sqlalchemy import Enum as saEnum
from sqlmodel import SQLModel, Field, Relationship

# TYPE_CHECKING is used to avoid circular imports when type hinting
if TYPE_CHECKING:
    from app.models.alert import Alert
    from app.models.sensor_node import SensorNode
    from app.models.sensor_reading import SensorReading
    from app.models.zone import Zone


# Enum for bin status
class BinStatus(str, Enum):
    """
    Lifecycle status of a bin, used for filtering and reporting.
    - active: bin is in use and operational
    - inactive: bin is not in use, may be under maintenance or decommissioned
    - offline: bin is active but sensor has not reported within the 
               offline_timeout_min window (set in AlertSettings)
    """
    active = "active"
    inactive = "inactive"
    offline = "offline"


class FillStatus(str, Enum):
    """
    Derived fill level category - recalculated on every sensor reading.
    - normal: fill_pct < 50
    - warning: 50 <= fill_pct <= 80
    - overflow: fill_pct > 80

    This field is stored (not computed at query time) so the dashboard
    can filter and sort on it without needing to compute it for every bin.
    """
    normal = "normal"
    warning = "warning"
    overflow = "overflow"

# Helper function
def derive_fill_status(fill_pct: float) -> FillStatus:
    """
    Derives the fill status based on the fill percentage.
    
    Args:
        fill_pct (float): The fill percentage of the bin.
        
    Returns:
        FillStatus: The derived fill status.
    """
    if fill_pct < 50:
        return FillStatus.normal
    elif 50 <= fill_pct <= 80:
        return FillStatus.warning
    else:
        return FillStatus.overflow
    

# BASE CLASS

class BinBase(SQLModel):
    """
    Shared fields definition for the Bin resource.
    This class has no table=True - it is purely a base class for other models to inherit from..
    All variant classes (BinCreate, BinRead, Bin table) inherit from this base class.

    Fields:
        bin_code        : Human-readable code for the bin, e.g., "BIN-001"
        location_name   : Descriptive physical location for display in the 
                            dashboard, e.g., "Main Street & 1st Ave"
        latitude        : Latitude coordinate for the bin's location
        longitude       : Longitude coordinate for the bin's location
        capacity_l      : Physical capacity of the bin in litres. Default 120L
                          covers the standard 120L bin size.
        height_cm        : Physical height of the bin in centimeters. Default 100cm
                          covers the standard 100cm bin size.
    """
    bin_code: str = Field(max_length=20, description="e.g., FPS-Bin-01")
    location_name: str = Field(max_length=120)
    latitude: float = Field(description="Latitude coordinate for the bin's location")
    longitude: float = Field(description="Longitude coordinate for the bin's location")
    capacity_l: int = Field(default=120, description="Physical capacity of the bin in litres")
    height_cm: int = Field(default=100, description="Physical height of the bin in centimeters")


# TABLE CLASS
class Bin(BinBase, table=True):
    """
    The Bin table model, inheriting from BinBase.
    This class represents the actual database table for bins.

    Additional Fields:
        id              : Primary key for the bin record
        zone_id         : Foreign key to the Zone table
        fill_pct        : Current fill percentage of the bin
        battery_pct     : Current battery percentage of the bin's sensor
        fill_status     : Derived fill status based on fill_pct
        last_reading     : Timestamp of the last sensor reading for this bin
        status          : Lifecycle status of the bin (active, inactive, offline)
        installed_at     : Timestamp when the bin was installed
        created_at      : Timestamp when the bin record was created
        updated_at      : Timestamp when the bin record was last updated
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    zone_id: Optional[int] = Field(default=None, foreign_key="zone.id", index=True)
    fill_pct: float = Field(default=0.0, description="Current fill percentage of the bin")
    battery_pct: float = Field(default=100.0, description="Current battery percentage of the bin's sensor")
    last_reading: Optional[datetime] = Field(default=None, description="Timestamp of the last sensor reading for this bin")
    fill_status: FillStatus = Field(sa_column=Column(saEnum(FillStatus)), default=FillStatus.normal)
    status: BinStatus = Field(sa_column=Column(saEnum(BinStatus)), default=BinStatus.active)
    installed_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp when the bin was installed")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp when the bin record was created")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp when the bin record was last updated")

    # Relationships
    zone: Optional["Zone"] = Relationship(back_populates="bins")
    sensors: List["SensorNode"] = Relationship(back_populates="bin")
    readings: List["SensorReading"] = Relationship(back_populates="bin")
    alerts: List["Alert"] = Relationship(back_populates="bin")

    __table_args__ = (
        Index("ix_bin_zone_id", "zone_id"),
        Index("ix_bin_fill_status", "fill_status"),
        Index("ix_bin_status", "status"),
        Index("ix_bins_geometry", "latitude", "longitude"),
    )


# API Variants Schemas

class BinCreate(BinBase):
    """
    Schema for creating a new Bin instance.
    Inherits all attributes from BinBase.
    """
    zone_id: int = Field(..., description="ID of the zone this bin belongs to")

class BinRead(BinBase):
    """
    Schema for reading a Bin instance.
    Inherits all attributes from BinBase and adds additional fields.
    """
    id: int
    zone_id: int
    zone_name: Optional[str] = None
    fill_pct: float
    fill_status: FillStatus
    battery_pct: Optional[float]
    last_reading: Optional[datetime]
    status: BinStatus
    installed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
        "json_encoders": {
            datetime: lambda v: v.isoformat() if v else None,
        },
    }

class BinLive(SQLModel):
    """
    Lightweight response schema for live bin data, used in real-time dashboards and monitoring.
    """
    id : int
    bin_code : str
    location_name : str
    latitude : float
    longitude : float
    fill_pct : float
    fill_status : FillStatus
    last_reading : Optional[datetime]
    status : BinStatus

    model_config = {
        "from_attributes": True,
        "json_encoders": {
            datetime: lambda v: v.isoformat() if v else None,
        },
    }

class BinUpdate(SQLModel):
    """
    Schema for updating an existing Bin instance.
    All fields are optional to allow partial updates.
    """
    bin_code: Optional[str] = Field(None, max_length=20, description="Human-readable code for the bin")
    location_name: Optional[str] = Field(None, max_length=120, description="Descriptive physical location for display in the dashboard")
    latitude: Optional[float] = Field(None, description="Latitude coordinate for the bin's location")
    longitude: Optional[float] = Field(None, description="Longitude coordinate for the bin's location")
    capacity_l: Optional[int] = Field(None, description="Physical capacity of the bin in litres")
    height_cm: Optional[int] = Field(None, description="Physical height of the bin in centimeters")
    zone_id: Optional[int] = Field(None, description="ID of the zone this bin belongs to")
    fill_pct: Optional[float] = Field(None, description="Current fill percentage of the bin")
    battery_pct: Optional[float] = Field(None, description="Current battery percentage of the bin's sensor")
    last_reading: Optional[datetime] = Field(None, description="Timestamp of the last sensor reading for this bin")
    fill_status: Optional[FillStatus] = Field(None, description="Derived fill status based on fill_pct")
    status: Optional[BinStatus] = Field(None, description="Lifecycle status of the bin (active, inactive, offline)")
    installed_at: Optional[datetime] = Field(None, description="Timestamp when the bin was installed")

class BinSummary(SQLModel):
    """
    Summary schema for a Bin instance, used for quick overviews.
    """
    total_bins: int
    overflow_count: int
    offline_count: int
    collections_today: int
    