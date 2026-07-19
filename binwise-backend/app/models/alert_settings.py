"""Alert settings model for BinWise."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class AlertSettings(SQLModel, table=True):
	id: UUID = Field(default_factory=uuid4, primary_key=True)
	overflow_threshold: float = Field(default=80.0)
	offline_timeout_min: int = Field(default=15)
	low_battery_threshold: float = Field(default=20.0)
	notify_email: bool = Field(default=True)
	notify_sms: bool = Field(default=False)
	notify_inapp: bool = Field(default=True)
	updated_at: datetime = Field(default_factory=datetime.utcnow)


class AlertSettingsRead(SQLModel):
	id: UUID
	overflow_threshold: float
	offline_timeout_min: int
	low_battery_threshold: float
	notify_email: bool
	notify_sms: bool
	notify_inapp: bool
	updated_at: datetime

	model_config = {"from_attributes": True}


class AlertSettingsUpdate(SQLModel):
	overflow_threshold: Optional[float] = None
	offline_timeout_min: Optional[int] = None
	low_battery_threshold: Optional[float] = None
	notify_email: Optional[bool] = None
	notify_sms: Optional[bool] = None
	notify_inapp: Optional[bool] = None
