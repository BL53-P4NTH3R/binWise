"""Schemas for collection routes."""

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RouteStatus(str, Enum):
    """
    Enum representing the status of a collection route.
    """
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELED = "canceled"

class WayPointStatus(str, Enum):
    """
    Enum representing the status of a waypoint in a collection route.
    """
    PENDING = "pending"
    COLLECTED = "collected"
    SKIPPED = "skipped"


class RouteBase(BaseModel):
    """
    Base schema for a collection route.

    Attributes:
        route_code (str): Unique code for the route.
        assigned_driver_id (UUID | None): ID of the driver assigned to the route.
        status (RouteStatus): Current status of the route.
        threshold_pct (float): Threshold percentage for the route.
        bin_count (int): Number of bins in the route.
        generated_at (datetime): Timestamp when the route was generated.
        ai_distance_km (float | None): AI-calculated distance for the route in kilometers
        baseline_distance_km (float | None): Baseline distance for the route in kilometers.
        ai_duration_min (int | None): AI-calculated duration for the route in minutes.
        started_at (datetime | None): Timestamp when the route was started.
        completed_at (datetime | None): Timestamp when the route was completed.
    """
    route_code: str = Field(..., max_length=20, description="Unique route code.")
    assigned_driver_id: UUID | None = Field(None, description="Assigned driver ID.")
    status: RouteStatus = Field(..., description="Current route status.")
    threshold_pct: float = Field(..., description="Route threshold percentage.")
    bin_count: int = Field(..., description="Number of bins in the route.")
    generated_at: datetime = Field(..., description="Route generation timestamp.")
    ai_distance_km: float | None = Field(None, description="AI-calculated route distance in km.")
    baseline_distance_km: float | None = Field(None, description="Baseline route distance in km.")
    ai_duration_min: int | None = Field(None, description="AI-calculated route duration in minutes.")
    started_at: datetime | None = Field(None, description="Route start timestamp.")
    completed_at: datetime | None = Field(None, description="Route completion timestamp.")


class RouteCreate(RouteBase):
    pass


class RouteUpdate(BaseModel):
    """
    Schema for updating an existing collection route.

    Attributes:
        route_code (str | None): Unique code for the route.
        assigned_driver_id (UUID | None): ID of the driver assigned to the route.
        status (RouteStatus | None): Current status of the route.
        threshold_pct (float | None): Threshold percentage for the route.
        bin_count (int | None): Number of bins in the route.
        generated_at (datetime | None): Timestamp when the route was generated.
        ai_distance_km (float | None): AI-calculated distance for the route in kilometers
        baseline_distance_km (float | None): Baseline distance for the route in kilometers.
        ai_duration_min (int | None): AI-calculated duration for the route in minutes.
        started_at (datetime | None): Timestamp when the route was started.
        completed_at (datetime | None): Timestamp when the route was completed.
    """
    route_code: str | None = Field(None, max_length=20)
    assigned_driver_id: UUID | None = None
    status: RouteStatus | None = None
    threshold_pct: float | None = None
    bin_count: int | None = None
    generated_at: datetime | None = None
    ai_distance_km: float | None = None
    baseline_distance_km: float | None = None
    ai_duration_min: int | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None


class RouteRead(RouteBase):
    """
    Schema for reading a collection route.
    """
    id: UUID

    model_config = ConfigDict(from_attributes=True)


class RouteWayPoints(BaseModel):
    """
    Schema for representing waypoints in a collection route.

    Attributes:
        route_id (UUID): ID of the associated route.
        bin_id (UUID): ID of the bin at the waypoint.
        sequence (int): Sequence number of the waypoint in the route.
        latitude (float): Latitude coordinate of the waypoint.
        longitude (float): Longitude coordinate of the waypoint.
    """
    route_id: UUID = Field(..., description="ID of the associated route.")
    bin_id: UUID = Field(..., description="ID of the bin at the waypoint.")
    stop_order: int = Field(..., description="Sequence number of the waypoint in the route.")
    fill_pct_at_generation: float | None = Field(None, description="Fill percentage of the bin at the time of route generation.")
    status: WayPointStatus = Field(default=WayPointStatus.PENDING, description="Status of the waypoint.")
    collected_at: datetime | None = Field(None, description="Timestamp when the bin was collected.")
    skip_reason: str | None = Field(None, max_length=200, description="Reason for skipping the bin, if applicable.")