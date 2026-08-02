"""Route waypoint models for BinWise."""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional, ClassVar, List
from uuid import UUID, uuid4

from sqlalchemy import Column, Index
from sqlalchemy import Enum as SAEnum
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.bin import Bin
    from app.models.collection_route import CollectionRoute


class WaypointStatus(str, Enum):
    pending   = "pending"
    collected = "collected"
    skipped   = "skipped"


class RouteWaypointBase(SQLModel):
    stop_order             : int            = Field(description="Position in route sequence, 1-indexed")
    fill_pct_at_generation : Optional[float] = Field(
        default=None,
        description="Fill level snapshot when route was generated — never updated after creation",
    )


class RouteWaypoint(RouteWaypointBase, table=True):
    __tablename__ : ClassVar[str] = "routewaypoint"   # type: ignore

    id           : Optional[UUID]        = Field(default_factory=uuid4, primary_key=True)
    route_id     : Optional[UUID]        = Field(default=None, foreign_key="collectionroute.id")
    bin_id       : Optional[UUID]        = Field(default=None, foreign_key="bin.id")
    status       : WaypointStatus        = Field(
        default=WaypointStatus.pending,
        sa_column=Column(
            SAEnum(WaypointStatus, name="waypointstatus", create_constraint=True),
            nullable=False,
        ),
    )
    collected_at : Optional[datetime]    = Field(default=None)
    skip_reason  : Optional[str]         = Field(default=None, max_length=200)

    route : Optional["CollectionRoute"] = Relationship(
        back_populates="waypoints",
        sa_relationship_kwargs={"lazy": "selectin"},
    )
    bin   : Optional["Bin"] = Relationship(
        back_populates="waypoints",
        sa_relationship_kwargs={"lazy": "selectin"},
    )

    __table_args__ = (
        Index("ix_waypoint_route_stop", "route_id", "stop_order", unique=True),
        Index("ix_waypoint_bin", "bin_id"),
        Index("ix_waypoint_status", "status"),
    )


class WaypointRead(RouteWaypointBase):
    id           : UUID
    route_id     : UUID
    bin_id       : UUID
    status       : WaypointStatus
    collected_at : Optional[datetime] = None
    skip_reason  : Optional[str]      = None

    model_config = {"from_attributes": True}


class WaypointCollect(SQLModel):
    """
    Request body for marking a waypoint as collected.
    Posted by the driver mobile app to /api/routes/{id}/collect/{bin_id}.
    skip_reason is only required when status is skipped.
    """
    status      : WaypointStatus       = WaypointStatus.collected
    skip_reason : Optional[str]        = Field(default=None, max_length=200)