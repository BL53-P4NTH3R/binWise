"""Route waypoint models for BinWise."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional
from uuid import UUID, uuid4

from sqlalchemy import Column, Index
from sqlalchemy import Enum as saEnum
from sqlmodel import Field, Relationship, SQLModel


class WayPointStatus(str, Enum):
	pending = "pending"
	collected = "collected"
	skipped = "skipped"


class RouteWaypointBase(SQLModel):
	stop_order: int
	fill_pct_at_generation: Optional[float] = None


class RouteWaypoint(RouteWaypointBase, table=True):
	id: UUID = Field(default_factory=uuid4, primary_key=True)
	route_id: UUID = Field(foreign_key="collectionroute.id", index=True)
	bin_id: UUID = Field(foreign_key="bin.id", index=True)
	status: WayPointStatus = Field(default=WayPointStatus.pending, sa_column=Column(saEnum(WayPointStatus), nullable=False))
	collected_at: Optional[datetime] = None
	skip_reason: Optional[str] = Field(default=None, max_length=200)

	route: Optional[Any] = Relationship(back_populates="waypoints")
	bin: Optional[Any] = Relationship(back_populates="waypoints")

	__table_args__ = (Index("ix_route_waypoints_route_id_stop_order", "route_id", "stop_order", unique=True),)


class WaypointRead(RouteWaypointBase):
	id: UUID
	route_id: UUID
	bin_id: UUID
	status: WayPointStatus
	collected_at: Optional[datetime] = None
	skip_reason: Optional[str] = None

	model_config = {"from_attributes": True}
