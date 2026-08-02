"""Collection route models for BinWise."""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, List, Optional, ClassVar
from uuid import UUID, uuid4

from sqlalchemy import Column, Index
from sqlalchemy import Enum as SAEnum
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.route_waypoint import RouteWaypoint, WaypointRead


class RouteStatus(str, Enum):
    pending     = "pending"
    in_progress = "in_progress"
    completed   = "completed"
    canceled    = "canceled"


class CollectionRouteBase(SQLModel):
    threshold_pct : float = Field(
        default=70.0,
        ge=0.0,
        le=100.0,
        description="Minimum fill % for a bin to be included in this route",
    )


class CollectionRoute(CollectionRouteBase, table=True):
    __tablename__ : ClassVar[str] = "collectionroute" # type: ignore

    id                   : Optional[UUID]     = Field(default_factory=uuid4, primary_key=True)
    route_code           : str                = Field(max_length=20)
    assigned_driver_id   : Optional[UUID]     = Field(default=None, foreign_key="user.id")
    status               : RouteStatus        = Field(
        default=RouteStatus.pending,
        sa_column=Column(
            SAEnum(RouteStatus, name="routestatus", create_constraint=True),
            nullable=False,
        ),
    )
    bin_count            : int                = Field(default=0)
    ai_distance_km       : Optional[float]    = Field(default=None)
    baseline_distance_km : Optional[float]    = Field(default=None)
    ai_duration_min      : Optional[int]      = Field(default=None)
    generated_at         : datetime           = Field(default_factory=datetime.utcnow)
    started_at           : Optional[datetime] = Field(default=None)
    completed_at         : Optional[datetime] = Field(default=None)

    assigned_driver : Optional["User"] = Relationship(
        back_populates="assigned_routes",
        sa_relationship_kwargs={"lazy": "selectin"},
    )
    waypoints : List["RouteWaypoint"] = Relationship(
        back_populates="route",
        sa_relationship_kwargs={
            "lazy": "selectin",
            "order_by": "RouteWaypoint.stop_order",
        },
    )

    __table_args__ = (
        Index("ix_route_code", "route_code", unique=True),
        Index("ix_route_driver", "assigned_driver_id"),
        Index("ix_route_status", "status"),
        Index("ix_route_generated_at", "generated_at"),
    )


class RouteRequest(CollectionRouteBase):
    """
    Request body for POST /api/routes/generate.
    Only threshold_pct is needed — everything else is
    calculated by the route optimiser service.
    """
    pass


class RouteRead(CollectionRouteBase):
    id                   : UUID
    route_code           : str
    assigned_driver_id   : Optional[UUID]        = None
    status               : RouteStatus
    bin_count            : int
    ai_distance_km       : Optional[float]        = None
    baseline_distance_km : Optional[float]        = None
    ai_duration_min      : Optional[int]          = None
    generated_at         : datetime
    started_at           : Optional[datetime]     = None
    completed_at         : Optional[datetime]     = None
    waypoints            : List["WaypointRead"]   = []

    model_config = {"from_attributes": True}


class RouteAssign(SQLModel):
    """
    Request body for PATCH /api/routes/{id}/assign.
    Admin picks a driver from the dropdown and submits their UUID.
    """
    driver_id : UUID


class RouteStatusUpdate(SQLModel):
    """
    Request body for PATCH /api/routes/{id}/status.
    Used internally when a driver starts or completes a route.
    """
    status : RouteStatus