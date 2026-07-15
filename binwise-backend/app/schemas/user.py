"""
Schemas for users endpoints.
"""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict
from enum import Enum

class UserRole(str, Enum):
    """
    Enum representing the role of a user.
    """
    ADMIN = "admin"
    DRIVER = "driver"

class UserBase(BaseModel):
    """Shared user fields exposed in request and response payloads."""

    email: str = Field(..., max_length=120, description="The email address of the user.")
    full_name: str = Field(..., max_length=100, description="The full name of the user.")
    role: UserRole = Field(default=UserRole.DRIVER, description="The role of the user.")
    is_active: bool = Field(..., description="Indicates whether the user account is active.")


class UserCreate(UserBase):
    """Schema used when creating a user."""

    password: str = Field(..., min_length=8, max_length=128, description="Plain password to be hashed before storage.")


class UserUpdate(BaseModel):
    """Schema used for partial user updates."""

    email: str | None = Field(None, max_length=120)
    full_name: str | None = Field(None, max_length=100)
    role: UserRole | None = None
    is_active: bool | None = None
    last_login: datetime | None = None
    password: str | None = Field(None, min_length=8, max_length=128)


class UserRead(UserBase):
    """Schema returned to API clients."""

    id: UUID
    last_login: datetime | None = Field(None, description="The timestamp of the user's last login.")
    created_at: datetime = Field(..., description="The timestamp when the user account was created.")

    model_config = ConfigDict(from_attributes=True)


class UserInDB(UserRead):
    """Internal schema that includes database-only fields."""

    hashed_pw: str = Field(..., max_length=256, description="The hashed password stored in the database.")