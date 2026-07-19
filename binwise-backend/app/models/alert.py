"""Alert models for BinWise."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional, TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import Column, Index
from sqlalchemy import Enum as saEnum
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
	from app.models.bin import BinLive


class AlertType(str, Enum):
	overflow = "overflow"
	offline = "offline"
	low_battery = "low_battery"


class AlertSeverity(str, Enum):
	critical = "critical"
	warning = "warning"
	info = "info"


class AlertStatus(str, Enum):
	open = "open"
	resolved = "resolved"


class AlertBase(SQLModel):
	alert_type: AlertType
	severity: AlertSeverity
	message: Optional[str] = Field(default=None, max_length=200)


class Alert(AlertBase, table=True):
	id: UUID = Field(default_factory=uuid4, primary_key=True)
	bin_id: UUID = Field(foreign_key="bin.id", index=True)
	status: AlertStatus = Field(default=AlertStatus.open, sa_column=Column(saEnum(AlertStatus), nullable=False))
	resolved_by: Optional[UUID] = Field(default=None, foreign_key="user.id", index=True)
	resolved_at: Optional[datetime] = None
	created_at: datetime = Field(default_factory=datetime.utcnow)

	bin: Optional[Any] = Relationship(back_populates="alerts")
	resolver: Optional[Any] = Relationship(back_populates="resolved_alerts")

	__table_args__ = (Index("ix_alerts_bin_id_alert_type_status", "bin_id", "alert_type", "status"),)


class AlertRead(AlertBase):
	id: UUID
	bin_id: UUID
	status: AlertStatus
	resolved_by: Optional[UUID] = None
	resolved_at: Optional[datetime] = None
	created_at: datetime
	bin: Optional["BinLive"] = None

	model_config = {"from_attributes": True}


class AlertResolve(SQLModel):
	pass
