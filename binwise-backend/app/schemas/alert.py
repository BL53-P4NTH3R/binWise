"""
Schemas for alert related classes.
"""
from datetime import datetime, date
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from enum import Enum

class AlertType(str, Enum):
    """
    Enum representing the type of alert.
    """
    OVERFLOW = "overflow"
    OFFLINE = "offline"
    LOW_BATTERY = "low_battery"

class AlertSeverity(str, Enum):
    """
    Enum representing the severity of an alert.
    """
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"

class AlertStatus(str, Enum):
    """
    Enum representing the status of an alert.
    """
    OPEN = "open"
    RESOLVED = "resolved"


class AlertBase(BaseModel):
    """
    Base schema for the Alert model.

    Attributes:
        alert_type (AlertType): The type of the alert.
        severity (AlertSeverity): The severity level of the alert.
        status (AlertStatus): The current status of the alert.
        bin_id (UUID): The ID of the bin associated with the alert.
        message (str): A descriptive message about the alert.
        created_at (datetime): The timestamp when the alert was created.
    """
    bin_id: UUID = Field(..., description="The ID of the bin associated with the alert.")
    alert_type: AlertType = Field(..., description="The type of the alert.")
    severity: AlertSeverity = Field(..., description="The severity level of the alert.")
    status: AlertStatus = Field(..., description="The current status of the alert.")
    message: str | None = Field(None, max_length=200, description="A descriptive message about the alert.")
    resolved_by: UUID | None = Field(None, description="The ID of the user who resolved the alert.")
    resolved_at: datetime | None = Field(None, description="The timestamp when the alert was resolved.")
    created_at: datetime = Field(..., description="The timestamp when the alert was created.")

class AlertCreate(AlertBase):
    """
    Schema for creating a new Alert instance.

    Inherits all attributes from AlertBase.
    """
    pass

class AlertUpdate(BaseModel):
    """
    Schema for updating an existing Alert instance.

    Attributes:
        alert_type (AlertType | None): The type of the alert.
        severity (AlertSeverity | None): The severity level of the alert.
        status (AlertStatus | None): The current status of the alert.
        message (str | None): A descriptive message about the alert.
        resolved_by (UUID | None): The ID of the user who resolved the alert.
        resolved_at (datetime | None): The timestamp when the alert was resolved.
    """
    alert_type: AlertType | None = Field(None, description="The type of the alert.")
    severity: AlertSeverity | None = Field(None, description="The severity level of the alert.")
    status: AlertStatus | None = Field(None, description="The current status of the alert.")
    message: str | None = Field(None, max_length=200, description="A descriptive message about the alert.")
    resolved_by: UUID | None = Field(None, description="The ID of the user who resolved the alert.")
    resolved_at: datetime | None = Field(None, description="The timestamp when the alert was resolved.")


class AlertRead(AlertBase):
    """
    Schema for reading an Alert instance.

    Inherits all attributes from AlertBase.
    """
    id: UUID

    model_config = ConfigDict(from_attributes=True)


class AlertSettings(BaseModel):
    """
    Schema for alert settings.

    Attributes:
        overflow_threshold (float): The fill percentage threshold for overflow alerts.
        offline_timeout_min (int): The duration in minutes after which an offline alert is triggered.
        low_battery_threshold (float): The battery percentage threshold for low battery alerts.
        notify_email (bool): Whether to send email notifications for alerts.
        notify_sms (bool): Whether to send SMS notifications for alerts.
        notify_inapp (bool): Whether to send in-app notifications for alerts.
        updated_at (datetime): The timestamp when the alert settings were last updated.
    """
    overflow_threshold: float = Field(..., description="The fill percentage threshold for overflow alerts.")
    offline_timeout_min: int = Field(..., description="The duration in minutes after which an offline alert is triggered.")
    low_battery_threshold: float = Field(..., description="The battery percentage threshold for low battery alerts.")
    notify_email: bool = Field(..., description="Whether to send email notifications for alerts.")
    notify_sms: bool = Field(..., description="Whether to send SMS notifications for alerts.")
    notify_inapp: bool = Field(..., description="Whether to send in-app notifications for alerts.")
    updated_at: datetime = Field(..., description="The timestamp when the alert settings were last updated.")

