"""Schemas for authentication and authorization."""

from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.user import UserRole


class Token(BaseModel):
	"""Token response returned after successful authentication."""

	access_token: str = Field(..., description="JWT access token string.")
	token_type: str = Field(default="bearer", description="Type of token returned to the client.")


class TokenData(BaseModel):
	"""Data extracted from a JWT payload."""

	user_id: UUID = Field(..., description="Authenticated user ID extracted from the token.")
	role: UserRole = Field(..., description="Authenticated user role extracted from the token.")

