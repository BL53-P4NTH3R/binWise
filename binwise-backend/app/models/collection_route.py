"""Collection route models for BinWise."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import Column, Index
from sqlalchemy import Enum as saEnum
from sqlmodel import Field, Relationship, SQLModel


class RouteStatus(str, Enum):
	pending = "pending"
	in_progress = "in_progress"
	completed = "completed"
	canceled = "canceled"


class CollectionRouteBase(SQLModel):
	threshold_pct: float = Field(default=70.0)


class CollectionRoute(CollectionRouteBase, table=True):
	id: UUID = Field(default_factory=uuid4, primary_key=True)
	route_code: str = Field(max_length=20)
	assigned_driver_id: Optional[UUID] = Field(default=None, foreign_key="user.id", index=True)
	status: RouteStatus = Field(default=RouteStatus.pending, sa_column=Column(saEnum(RouteStatus), nullable=False))
	bin_count: int
	ai_distance_km: Optional[float] = None
	baseline_distance_km: Optional[float] = None
	ai_duration_min: Optional[int] = None
	generated_at: datetime = Field(default_factory=datetime.utcnow)
	started_at: Optional[datetime] = None
	completed_at: Optional[datetime] = None

	assigned_driver: Optional[Any] = Relationship(back_populates="assigned_routes")
	waypoints: List[Any] = Relationship(back_populates="route")

	__table_args__ = (Index("ix_collection_routes_route_code", "route_code", unique=True),)


class RouteRequest(CollectionRouteBase):
	pass


class RouteRead(CollectionRouteBase):
	id: UUID
	route_code: str
	assigned_driver_id: Optional[UUID] = None
	status: RouteStatus
	bin_count: int
	ai_distance_km: Optional[float] = None
	baseline_distance_km: Optional[float] = None
	ai_duration_min: Optional[int] = None
	generated_at: datetime
	started_at: Optional[datetime] = None
	completed_at: Optional[datetime] = None
	waypoints: List[Any] = []

	model_config = {"from_attributes": True}


class RouteAssign(SQLModel):
	driver_id: UUID
