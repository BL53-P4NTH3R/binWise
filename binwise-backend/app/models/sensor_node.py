"""Sensor node models for BinWise."""

from __future__ import annotations

from datetime import datetime
from typing import Optional, TYPE_CHECKING
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
	from app.models.bin import Bin


class SensorNodeBase(SQLModel):
	node_id: str = Field(max_length=20)
	firmware_v: Optional[str] = Field(default=None, max_length=20)
	gsm_number: Optional[str] = Field(default=None, max_length=20)


class SensorNode(SensorNodeBase, table=True):
	id: UUID = Field(default_factory=uuid4, primary_key=True)
	bin_id: UUID = Field(foreign_key="bin.id", unique=True, index=True)
	is_active: bool = Field(default=True)
	last_seen: Optional[datetime] = Field(default=None)
	created_at: datetime = Field(default_factory=datetime.utcnow)

	bin: Optional["Bin"] = Relationship(back_populates="sensors")


class SensorNodeRead(SensorNodeBase):
	id: UUID
	bin_id: UUID
	is_active: bool
	last_seen: Optional[datetime] = None
	created_at: datetime

	model_config = {"from_attributes": True}


class SensorNodeCreate(SensorNodeBase):
	bin_id: UUID