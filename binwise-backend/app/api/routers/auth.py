"""Authentication routes for BinWise."""

from __future__ import annotations

import secrets
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.database import get_db
from app.core.security import create_access_token, verify_password
from app.models.user import LoginForm, Token, User
from app.services.notification_service import send_password_reset_email


router = APIRouter(tags=["auth"])


@router.post("/login", response_model=Token)
def login(payload: LoginForm, db: Session = Depends(get_db)) -> Token:
	"""Authenticate a user and return a JWT access token."""
	user = db.exec(select(User).where(User.email == payload.email)).first()
	if user is None or not verify_password(payload.password, user.hashed_pw):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

	user.last_login = datetime.now(timezone.utc)
	db.add(user)
	db.commit()

	token = create_access_token({"user_id": str(user.id), "role": user.role.value}, timedelta(minutes=30))
	return Token(access_token=token, token_type="bearer")


@router.post("/forgot-password")
def forgot_password(payload: LoginForm, db: Session = Depends(get_db)) -> dict[str, str]:
	"""Trigger a password-reset email without revealing whether the email exists."""
	user = db.exec(select(User).where(User.email == payload.email)).first()
	if user is not None:
		reset_token = secrets.token_urlsafe(32)
		send_password_reset_email(user.email, reset_token)
	return {"message": "If the email exists, a reset link has been sent."}
