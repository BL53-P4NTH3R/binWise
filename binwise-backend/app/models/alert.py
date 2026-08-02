"""Alert models for BinWise."""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional, ClassVar
from uuid import UUID, uuid4

from sqlalchemy import Column, Index
from sqlalchemy import Enum as SAEnum
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.bin import Bin, BinLive
    from app.models.user import User


class AlertType(str, Enum):
    overflow    = "overflow"
    offline     = "offline"
    low_battery = "low_battery"


class AlertSeverity(str, Enum):
    critical = "critical"
    warning  = "warning"
    info     = "info"


class AlertStatus(str, Enum):
    open     = "open"
    resolved = "resolved"


class AlertBase(SQLModel):
    alert_type : AlertType
    severity   : AlertSeverity
    message    : Optional[str] = Field(default=None, max_length=200)

    model_config = {"from_attributes": True}



class Alert(AlertBase, table=True):
    __tablename__ : ClassVar[str] = "alert"           # type: ignore

    id          : Optional[UUID]     = Field(default_factory=uuid4, primary_key=True)
    bin_id      : Optional[UUID]     = Field(default=None, foreign_key="bin.id")
    status      : AlertStatus        = Field(
        default=AlertStatus.open,
        sa_column=Column(
            SAEnum(AlertStatus, name="alertstatus", create_constraint=True),
            nullable=False,
        ),
    )
    resolved_by : Optional[UUID]     = Field(default=None, foreign_key="user.id")
    resolved_at : Optional[datetime] = Field(default=None)
    created_at  : datetime           = Field(default_factory=datetime.utcnow)

    bin      : Optional["Bin"] = Relationship(
        back_populates="alerts",
        sa_relationship_kwargs={"lazy": "selectin"},
    )
    resolver : Optional["User"] = Relationship(
        back_populates="resolved_alerts",
        sa_relationship_kwargs={"lazy": "selectin"},
    )

    __table_args__ = (
        # Dedup index — prevents duplicate open alerts of same type per bin.
        # The alert_service.check_alerts() function queries this combination
        # before creating a new alert to avoid firing 288 overflow alerts
        # per day (one every 5 minutes) for the same overflowing bin.
        Index("ix_alert_dedup", "bin_id", "alert_type", "status"),
        Index("ix_alert_status", "status"),
        Index("ix_alert_created_at", "created_at"),
    )


class AlertRead(AlertBase):
    id          : UUID
    bin_id      : UUID
    status      : AlertStatus
    resolved_by : Optional[UUID]     = None
    resolved_at : Optional[datetime] = None
    created_at  : datetime
    bin         : Optional["BinLive"] = None

    model_config = {"from_attributes": True}


class AlertResolve(SQLModel):
    """
    Empty request body for PATCH /api/alerts/{id}/resolve.
    The resolver's identity comes from the JWT token (get_current_user),
    not the request body. The act of calling the endpoint is the data.
    resolved_by and resolved_at are set server-side in the router.
    """
    pass


class AlertCreate(SQLModel):
    """
    Used internally by alert_service.py — never exposed as an API endpoint.
    Callers are the ingest router (overflow) and the APScheduler
    watchdog job (offline, low_battery).
    """
    bin_id     : UUID
    alert_type : AlertType
    severity   : AlertSeverity
    message    : Optional[str] = None