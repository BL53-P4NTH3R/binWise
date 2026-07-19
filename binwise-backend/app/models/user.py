"""User models for BinWise."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import Column, Index
from sqlalchemy import Enum as saEnum
from pydantic import BaseModel, Field as PydanticField
from sqlmodel import Field, Relationship, SQLModel

class UserRole(str, Enum):
	admin = "admin"
	driver = "driver"


class UserBase(SQLModel):
	email: str = Field(max_length=120)
	full_name: str = Field(max_length=100)


class User(UserBase, table=True):
	id: UUID = Field(default_factory=uuid4, primary_key=True)
	hashed_pw: str = Field(max_length=256)
	role: UserRole = Field(default=UserRole.driver, sa_column=Column(saEnum(UserRole), nullable=False))
	is_active: bool = Field(default=True)
	last_login: Optional[datetime] = Field(default=None)
	created_at: datetime = Field(default_factory=datetime.utcnow)

	assigned_routes: List[Any] = Relationship(back_populates="driver")
	resolved_alerts: List[Any] = Relationship(back_populates="resolved_by_user")

	__table_args__ = (Index("ix_users_email", "email", unique=True),)


class UserCreate(UserBase):
	password: str = Field(min_length=8, max_length=128)
	role: UserRole = Field(default=UserRole.driver)


class UserRead(UserBase):
	id: UUID
	role: UserRole
	is_active: bool
	last_login: Optional[datetime] = None
	created_at: datetime

	model_config = {"from_attributes": True}


class UserUpdate(SQLModel):
	role: Optional[UserRole] = None
	is_active: Optional[bool] = None


class LoginForm(SQLModel):
	email: str
	password: str


class Token(BaseModel):
	access_token: str = PydanticField(...)
	token_type: str = PydanticField(default="bearer")


class TokenData(BaseModel):
	user_id: UUID
	role: UserRole
