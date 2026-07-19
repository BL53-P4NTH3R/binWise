"""Security helpers for BinWise authentication."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt  # type: ignore[import-not-found]
from jose import JWTError  # type: ignore[import-not-found]
from passlib.context import CryptContext
from sqlmodel import Session, select

from app.core.config import settings
from app.core.database import get_db
from app.models.user import TokenData, User, UserRole


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
	"""Check whether a plaintext password matches a stored hash."""
	return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
	"""Hash a plaintext password for storage."""
	return pwd_context.hash(password)


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
	"""Create a signed JWT access token."""
	to_encode = data.copy()
	expires = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
	to_encode.update({"exp": expires})
	return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def get_current_user(
	credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
	db: Session = Depends(get_db),
) -> User:
	"""Resolve the authenticated user from the Bearer token."""
	if credentials is None:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
	try:
		payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
		user_id = payload.get("user_id")
		role = payload.get("role")
		if user_id is None or role is None:
			raise ValueError("Invalid token payload")
		token_data = TokenData(user_id=UUID(str(user_id)), role=UserRole(role))
	except (JWTError, ValueError, TypeError):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

	user = db.exec(select(User).where(User.id == token_data.user_id)).first()
	if user is None:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
	return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
	"""Require the authenticated user to have the admin role."""
	if current_user.role != UserRole.admin:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
	return current_user
