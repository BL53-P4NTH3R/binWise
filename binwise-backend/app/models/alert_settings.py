"""Alert settings model for BinWise."""

from datetime import datetime
from typing import Optional, ClassVar
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class AlertSettings(SQLModel, table=True):
    __tablename__ : ClassVar[str] = "alertsettings" # type: ignore

    id                    : Optional[UUID]  = Field(default_factory=uuid4, primary_key=True)
    overflow_threshold    : float           = Field(
        default=80.0,
        ge=0.0,
        le=100.0,
        description="Create overflow alert when fill_pct exceeds this value",
    )
    offline_timeout_min   : int             = Field(
        default=15,
        ge=1,
        description="Mark sensor offline after this many minutes of silence",
    )
    low_battery_threshold : float           = Field(
        default=20.0,
        ge=0.0,
        le=100.0,
        description="Create low_battery alert when battery_pct drops below this value",
    )
    notify_email          : bool            = Field(default=True)
    notify_sms            : bool            = Field(default=False)
    notify_inapp          : bool            = Field(default=True)
    updated_at            : datetime        = Field(default_factory=datetime.utcnow)


class AlertSettingsRead(SQLModel):
    id                    : UUID
    overflow_threshold    : float
    offline_timeout_min   : int
    low_battery_threshold : float
    notify_email          : bool
    notify_sms            : bool
    notify_inapp          : bool
    updated_at            : datetime

    model_config = {"from_attributes": True}


class AlertSettingsUpdate(SQLModel):
    overflow_threshold    : Optional[float] = Field(default=None, ge=0.0, le=100.0)
    offline_timeout_min   : Optional[int]   = Field(default=None, ge=1)
    low_battery_threshold : Optional[float] = Field(default=None, ge=0.0, le=100.0)
    notify_email          : Optional[bool]  = None
    notify_sms            : Optional[bool]  = None
    notify_inapp          : Optional[bool]  = None