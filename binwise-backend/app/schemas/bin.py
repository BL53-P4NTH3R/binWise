"""
Schemas for the Bin model.

These schemas define the structure of the data for the Bin model, including the fields and their types, 
as well as any validation rules that should be applied when creating or updating Bin instances.
"""
from datetime import datetime, date
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

class BinBase(BaseModel):
    """
    Base schema for the Bin model.

    Attributes:
        bin_code (str): The unique code of the bin.
        zone_id (UUID): The ID of the zone where the bin is located.
        location_name (str): The name of the location where the bin is placed.
        latitude (float): The latitude coordinate of the bin's location.
        longitude (float): The longitude coordinate of the bin's location.
        capacity_1 (int): The capacity of the bin for the first type of waste.
        height_cm (int): The height of the bin in centimeters.
        fill_pct (float): The fill percentage of the bin.
        fill_status (str): The fill status of the bin (e.g., 'Empty', 'Full').
        battery_pct (float): The battery percentage of the bin's sensor.
        last_reading (datetime | None): The timestamp of the last reading from the bin's sensor.
        installed_at (date): The date when the bin was installed.
    """
    bin_code: str = Field(..., max_length=20, description="The unique code of the bin.")
    zone_id: UUID
    location_name: str = Field(..., max_length=100, description="The name of the location where the bin is placed.")
    latitude: float = Field(..., description="The latitude coordinate of the bin's location.")
    longitude: float = Field(..., description="The longitude coordinate of the bin's location.")
    capacity_1: int = Field(..., description="The capacity of the bin for the first type of waste.")
    height_cm: int = Field(..., description="The height of the bin in centimeters.")
    fill_pct: float = Field(..., description="The fill percentage of the bin.")
    fill_status: str = Field(..., max_length=20, description="The fill status of the bin (e.g., 'Empty', 'Full').")
    battery_pct: float = Field(..., description="The battery percentage of the bin's sensor.")
    last_reading: datetime | None = Field(None, description="The timestamp of the last reading from the bin's sensor.")
    installed_at: date = Field(..., description="The date when the bin was installed.")

class BinCreate(BinBase):
    """
    Schema for creating a new Bin instance.

    Inherits all attributes from BinBase.
    """
    pass



class BinUpdate(BaseModel):
    """
    Schema for updating an existing Bin instance.

    Attributes:
        bin_code (Optional[str]): The unique code of the bin.
        zone_id (Optional[UUID]): The ID of the zone where the bin is located.
        location_name (Optional[str]): The name of the location where the bin is placed.
        latitude (Optional[float]): The latitude coordinate of the bin's location.
        longitude (Optional[float]): The longitude coordinate of the bin's location.
        capacity_1 (Optional[int]): The capacity of the bin for the first type of waste.
        height_cm (Optional[int]): The height of the bin in centimeters.
        fill_pct (Optional[float]): The fill percentage of the bin.
        fill_status (Optional[str]): The fill status of the bin (e.g., 'Empty', 'Full').
        battery_pct (Optional[float]): The battery percentage of the bin's sensor.
        last_reading (Optional[datetime]): The timestamp of the last reading from the bin's sensor.
        installed_at (Optional[date]): The date when the bin was installed.
    """
    bin_code: Optional[str] = Field(None, max_length=20, description="The unique code of the bin.")
    zone_id: Optional[UUID] = Field(None, description="The ID of the zone where the bin is located.")
    location_name: Optional[str] = Field(None, max_length=100, description="The name of the location where the bin is placed.")
    latitude: Optional[float] = Field(None, description="The latitude coordinate of the bin's location.")
    longitude: Optional[float] = Field(None, description="The longitude coordinate of the bin's location.")
    capacity_1: Optional[int] = Field(None, description="The capacity of the bin for the first type of waste.")
    height_cm: Optional[int] = Field(None, description="The height of the bin in centimeters.")
    fill_pct: Optional[float] = Field(None, description="The fill percentage of the bin.")
    fill_status: Optional[str] = Field(None, max_length=20, description="The fill status of the bin (e.g., 'Empty', 'Full').")
    battery_pct: Optional[float] = Field(None, description="The battery percentage of the bin's sensor.")
    last_reading: Optional[datetime] = Field(None, description="The timestamp of the last reading from the bin's sensor.")
    installed_at: Optional[date] = Field(None, description="The date when the bin was installed.")

    class Config:
        orm_mode = True


class BinLive(BaseModel):
    """
    Schema for live data of a Bin instance.

    Attributes:
        bin_code (str): The unique code of the bin.
        fill_pct (float): The fill percentage of the bin.
        fill_status (str): The fill status of the bin (e.g., 'Empty', 'Full').
        battery_pct (float): The battery percentage of the bin's sensor.
        last_reading (datetime | None): The timestamp of the last reading from the bin's sensor.
    """
    bin_code: str = Field(..., max_length=20, description="The unique code of the bin.")
    fill_pct: float = Field(..., description="The fill percentage of the bin.")
    fill_status: str = Field(..., max_length=20, description="The fill status of the bin (e.g., 'Empty', 'Full').")
    battery_pct: float = Field(..., description="The battery percentage of the bin's sensor.")
    last_reading: datetime | None = Field(None, description="The timestamp of the last reading from the bin's sensor.")

    class Config:
        orm_mode = True


class BinDetail(BaseModel):
    """
    Schema for detailed information of a Bin instance.
    
    Attributes:
        bin_code (str): The unique code of the bin.
        zone_id (UUID): The ID of the zone where the bin is located.
        location_name (str): The name of the location where the bin is placed.
        latitude (float): The latitude coordinate of the bin's location.
        longitude (float): The longitude coordinate of the bin's location.
        capacity_1 (int): The capacity of the bin for the first type of waste.
        height_cm (int): The height of the bin in centimeters.
        fill_pct (float): The fill percentage of the bin.
        fill_status (str): The fill status of the bin (e.g., 'Empty', 'Full').
        battery_pct (float): The battery percentage of the bin's sensor.
        last_reading (datetime | None): The timestamp of the last reading from the bin's sensor.
        installed_at (date): The date when the bin was installed.
    """
    bin_code: str = Field(..., max_length=20, description="The unique code of the bin.")
    zone_id: UUID = Field(..., description="The ID of the zone where the bin is located.")
    location_name: str = Field(..., max_length=100, description="The name of the location where the bin is placed.")
    latitude: float = Field(..., description="The latitude coordinate of the bin's location.")
    longitude: float = Field(..., description="The longitude coordinate of the bin's location.")
    capacity_1: int = Field(..., description="The capacity of the bin for the first type of waste.")
    height_cm: int = Field(..., description="The height of the bin in centimeters.")
    fill_pct: float = Field(..., description="The fill percentage of the bin.")
    fill_status: str = Field(..., max_length=20, description="The fill status of the bin (e.g., 'Empty', 'Full').")
    battery_pct: float = Field(..., description="The battery percentage of the bin's sensor.")
    last_reading: datetime | None = Field(None, description="The timestamp of the last reading from the bin's sensor.")
    installed_at: date = Field(..., description="The date when the bin was installed.")

    class Config:
        orm_mode = True
    

