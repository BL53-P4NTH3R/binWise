"""
Schemas for sensors
"""
from datetime import datetime, date
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

class SensorNode(BaseModel):
    """
    Base schema for the Sensor model.
    """
    node_id: str = Field(..., max_length=20, description="The unique ID of the sensor node.")
    bin_id: UUID = Field(..., description="The ID of the bin associated with the sensor node.")
    firmware_version: str = Field(..., max_length=20, description="The firmware version of the sensor node.")
    gsm_number: str = Field(..., max_length=20, description="The GSM number of the sensor node.")
    is_active: bool = Field(..., description="Indicates whether the sensor node is active.")
    last_communication: datetime | None = Field(None, description="The timestamp of the last communication from the sensor node.")
    created_at: datetime = Field(..., description="The timestamp when the sensor node was created.")


class SensorNodeCreate(SensorNode):
    """
    Schema for creating a new SensorNode instance.

    Inherits all attributes from SensorNode.
    """
    pass

class SensorNodeUpdate(BaseModel):
    """
    Schema for updating an existing SensorNode instance.

    Attributes:
        node_id (Optional[str]): The unique ID of the sensor node.
        bin_id (Optional[UUID]): The ID of the bin associated with the sensor node.
        firmware_version (Optional[str]): The firmware version of the sensor node.
        gsm_number (Optional[str]): The GSM number of the sensor node.
        is_active (Optional[bool]): Indicates whether the sensor node is active.
        last_communication (Optional[datetime]): The timestamp of the last communication from the sensor node.
    """
    node_id: Optional[str] = Field(None, max_length=20)
    bin_id: Optional[UUID] = None
    firmware_version: Optional[str] = Field(None, max_length=20)
    gsm_number: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None
    last_communication: Optional[datetime] = None

class SensorReadings(BaseModel):
    """
    Schema for representing sensor readings.

    Attributes:
        node_id (str): The unique ID of the sensor node.
        bin_id (UUID): The ID of the bin associated with the sensor node.
        fill_pct (float): The fill percentage of the bin.
        battery_pct (float): The battery percentage of the sensor node.
        temperature_c (float | None): The temperature reading from the sensor in Celsius.
        humidity_pct (float | None): The humidity reading from the sensor in percentage.
        last_reading (datetime): The timestamp of the last reading from the sensor node.
    """
    node_id: str = Field(..., max_length=20, description="The unique ID of the sensor node.")
    bin_id: UUID = Field(..., description="The ID of the bin associated with the sensor node.")
    fill_pct: float = Field(..., description="The fill percentage of the bin.")
    distance_cm: float | None = Field(None, description="The distance reading from the sensor in centimeters.")
    battery_pct: float | None = Field(None, description="The battery percentage of the sensor node.")
    rssi_dbm: int | None = Field(None, description="The RSSI (Received Signal Strength Indicator) in dBm.")
    created_at: datetime = Field(..., description="The timestamp of the last reading from the sensor node.")

