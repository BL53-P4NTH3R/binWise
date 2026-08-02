"""User models for BinWise."""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import Column, Index
from sqlalchemy import Enum as SAEnum
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.collection_route import CollectionRoute
    from app.models.alert import Alert


class UserRole(str, Enum):
    admin  = "admin"
    driver = "driver"


class UserBase(SQLModel):
    email     : str = Field(max_length=120)
    full_name : str = Field(max_length=100)


class User(UserBase, table=True):
    id         : Optional[UUID]      = Field(default_factory=uuid4, primary_key=True)
    hashed_pw  : str                 = Field(max_length=256)
    role       : UserRole            = Field(
        default=UserRole.driver,
        sa_column=Column(SAEnum(UserRole, name="userrole", create_constraint=True), nullable=False),
    )
    is_active  : bool                = Field(default=True)
    last_login : Optional[datetime]  = Field(default=None)
    created_at : datetime            = Field(default_factory=datetime.utcnow)

    assigned_routes : List["CollectionRoute"] = Relationship(
        back_populates="assigned_driver",
        sa_relationship_kwargs={"lazy": "selectin"},
    )
    resolved_alerts : List["Alert"] = Relationship(
        back_populates="resolver",
        sa_relationship_kwargs={"lazy": "selectin"},
    )

    __table_args__ = (
        Index("ix_users_email", "email", unique=True),
    )


class UserCreate(UserBase):
    password : str       = Field(min_length=8, max_length=128)
    role     : UserRole  = Field(default=UserRole.driver)


class UserRead(UserBase):
    id         : UUID
    role       : UserRole
    is_active  : bool
    last_login : Optional[datetime] = None
    created_at : datetime

    model_config = {"from_attributes": True}


class UserUpdate(SQLModel):
    role      : Optional[UserRole] = None
    is_active : Optional[bool]     = None


class LoginForm(SQLModel):
    email    : str
    password : str

class ForgotPasswordRequest(SQLModel):
    email: str

class Token(SQLModel):
    access_token : str = Field(...)
    token_type   : str = Field(default="bearer")


class TokenData(SQLModel):
    user_id : Optional[UUID] = None
    role    : Optional[UserRole] = None