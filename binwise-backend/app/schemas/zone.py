"""
Schemas for zones.
"""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field
from typing import Optional

class ZoneBase(BaseModel):
    """
    Base schema for the Zone model.

    Attributes:
        zone_code (str): The unique code of the zone.
        zone_name (str): The name of the zone.
        description (Optional[str]): A brief description of the zone.
        created_at (datetime): The timestamp when the zone was created.
    """
    zone_code: str = Field(..., max_length=20, description="The unique code of the zone.")
    zone_name: str = Field(..., max_length=100, description="The name of the zone.")
    description: Optional[str] = Field(None, max_length=255, description="A brief description of the zone.")
    created_at: datetime = Field(..., description="The timestamp when the zone was created.")

class ZoneCreate(ZoneBase):
    """
    Schema for creating a new Zone instance.

    Inherits all attributes from ZoneBase.
    """
    pass

class ZoneUpdate(BaseModel):
    """
    Schema for updating an existing Zone instance.

    Attributes:
        zone_code (Optional[str]): The unique code of the zone.
        zone_name (Optional[str]): The name of the zone.
        description (Optional[str]): A brief description of the zone.
    """
    zone_code: Optional[str] = Field(None, max_length=20, description="The unique code of the zone.")
    zone_name: Optional[str] = Field(None, max_length=100, description="The name of the zone.")
    description: Optional[str] = Field(None, max_length=255, description="A brief description of the zone.")

class ZoneRead(ZoneBase):
    """
    Schema for reading a Zone instance.

    Inherits all attributes from ZoneBase.
    """
    id: UUID

    class Config:
        orm_mode = True
