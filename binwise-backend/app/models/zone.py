"""
Zone model for the BinWise application.
"""

from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.bin import Bin


class ZoneBase(SQLModel):
    """
    Shared zone fields used by the table and API schemas.
    """
    name: str = Field(max_length=100, description="The name of the zone.")
    description: Optional[str] = Field(
        default=None,
        max_length=255,
        description="A brief description of the zone.",
    )


class Zone(ZoneBase, table=True):
    """
    Database table model for zones.
    """
    id: Optional[UUID] = Field(
        default_factory=uuid4,
        primary_key=True,
        description="Unique identifier for the zone.",
    )
    created_at: Optional[datetime] = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when the zone was created.",
    )

    bins: List["Bin"] = Relationship(
        back_populates="zone",
        sa_relationship_kwargs={"lazy": "selectin"},
    )


class ZoneRead(ZoneBase):
    """
    Schema for reading zone data from the API.
    """
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class ZoneCreate(ZoneBase):
    """
    Schema for creating a zone.
    """
    pass


class ZoneUpdate(SQLModel):
    """
    Schema for updating a zone — all fields optional for PATCH.
    """
    name: Optional[str]        = Field(default=None, max_length=100)
    description: Optional[str] = Field(default=None, max_length=255)