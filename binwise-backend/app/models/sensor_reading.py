"""Sensor reading models for BinWise."""

from __future__ import annotations

from datetime import datetime
from typing import Optional, TYPE_CHECKING
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
	from app.models.bin import Bin


class SensorReadingBase(SQLModel):
	fill_pct: float
	distance_cm: Optional[float] = None
	battery_pct: Optional[float] = None
	rssi_dbm: Optional[int] = None


class SensorReading(SensorReadingBase, table=True):
	id: UUID = Field(default_factory=uuid4, primary_key=True)
	bin_id: UUID = Field(foreign_key="bin.id", index=True)
	node_id: str = Field(max_length=20)
	created_at: datetime = Field(default_factory=datetime.utcnow)

	bin: Optional["Bin"] = Relationship(back_populates="readings")

	__table_args__ = ()


class SensorPayload(SQLModel):
	sensor_id: str = Field(max_length=20)
	fill_pct: float
	battery_pct: Optional[float] = None
	rssi_dbm: Optional[int] = None


class SensorReadingRead(SensorReadingBase):
	id: UUID
	bin_id: UUID
	node_id: str
	created_at: datetime

	model_config = {"from_attributes": True}
