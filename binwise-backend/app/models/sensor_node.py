"""Sensor node models for BinWise."""

from datetime import datetime
from typing import Optional, TYPE_CHECKING, ClassVar
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.bin import Bin


class SensorNodeBase(SQLModel):
    node_id    : str            = Field(max_length=20, description="e.g. US-Node-402")
    firmware_v : Optional[str] = Field(default=None, max_length=20)
    gsm_number : Optional[str] = Field(default=None, max_length=20)


class SensorNode(SensorNodeBase, table=True):
    __tablename__ : ClassVar[str] = "sensornode"      # type: ignore

    id         : Optional[UUID]     = Field(default_factory=uuid4, primary_key=True)
    bin_id     : Optional[UUID]     = Field(default=None, foreign_key="bin.id", unique=True)
    is_active  : bool               = Field(default=True)
    last_seen  : Optional[datetime] = Field(default=None)
    created_at : datetime           = Field(default_factory=datetime.utcnow)

    bin : Optional["Bin"] = Relationship(
        back_populates="sensor_node",
        sa_relationship_kwargs={"lazy": "selectin"},
    )


class SensorNodeRead(SensorNodeBase):
    id         : UUID
    bin_id     : Optional[UUID] = None
    is_active  : bool
    last_seen  : Optional[datetime] = None
    created_at : datetime

    model_config = {"from_attributes": True}


class SensorNodeCreate(SensorNodeBase):
    bin_id : Optional[UUID] = Field(
        default=None,
        description="Assign to a bin on creation, or leave null and assign later.",
    )


class SensorNodeUpdate(SQLModel):
    firmware_v : Optional[str]  = None
    gsm_number : Optional[str]  = None
    is_active  : Optional[bool] = None
    bin_id     : Optional[UUID] = None