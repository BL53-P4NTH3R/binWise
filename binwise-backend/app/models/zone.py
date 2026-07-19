"""
Zone model for the BinWise application.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional, TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

# TYPE_CHECKING is used to avoid circular imports when type hinting
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

	id: Optional[int] = Field(default=None, primary_key=True)
	created_at: Optional[datetime] = Field(
		default_factory=datetime.utcnow,
		description="Timestamp when the zone was created.",
	)

	bins: List["Bin"] = Relationship(back_populates="zone")


class ZoneRead(ZoneBase):
	"""
	Schema for reading zone data from the API.
	"""

	id: int
	created_at: datetime

	model_config = {"from_attributes": True}


class ZoneCreate(ZoneBase):
	"""
	Schema for creating a zone.
	"""

	pass