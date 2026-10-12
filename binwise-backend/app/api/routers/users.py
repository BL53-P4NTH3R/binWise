"""Admin-only user management routes for BinWise."""

from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlmodel import Session, select

from app.core.database import get_db
from app.core.security import get_password_hash, require_admin
from app.services.bulk_import import (
	BulkRowError,
	json_import_rows,
	process_import_rows,
	uploaded_import_rows,
)
from app.models.user import User, UserCreate, UserRead, UserRole, UserUpdate


router = APIRouter(tags=["users"])


def _create_bulk_user(data: dict[str, object], db: Session) -> User:
	payload = UserCreate.model_validate(data)
	if db.exec(select(User).where(User.email == payload.email)).first() is not None:
		raise BulkRowError("Email already exists")
	return User(
		email=payload.email,
		full_name=payload.full_name,
		hashed_pw=get_password_hash(payload.password),
		role=payload.role,
	)


@router.get("/", response_model=list[UserRead])
def list_users(
	_admin: User = Depends(require_admin),
	db: Session = Depends(get_db),
) -> list[User]:
	"""Return all users without exposing password hashes."""
	return list(db.exec(select(User)).all())


@router.post("/bulk")
def bulk_create_users(
	payload: list[object],
	_admin: User = Depends(require_admin),
	db: Session = Depends(get_db),
) -> dict[str, object]:
	"""Create valid users from a JSON array; report invalid rows individually."""
	rows = json_import_rows(payload)
	return process_import_rows(rows, db, lambda data: _create_bulk_user(data, db))


@router.post("/bulk/upload")
def bulk_upload_users(
	file: UploadFile = File(...),
	_admin: User = Depends(require_admin),
	db: Session = Depends(get_db),
) -> dict[str, object]:
	"""Create valid users from a CSV or XLSX file with one user per row."""
	rows = uploaded_import_rows(file)
	return process_import_rows(rows, db, lambda data: _create_bulk_user(data, db))


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
	payload: UserCreate,
	_admin: User = Depends(require_admin),
	db: Session = Depends(get_db),
) -> User:
	"""Create a new user after validating email uniqueness and hashing the password."""
	existing_user = db.exec(select(User).where(User.email == payload.email)).first()
	if existing_user is not None:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

	user = User(
		email=payload.email,
		full_name=payload.full_name,
		hashed_pw=get_password_hash(payload.password),
		role=payload.role,
	)
	db.add(user)
	db.commit()
	db.refresh(user)
	return user


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
	user_id: UUID,
	payload: UserUpdate,
	_admin: User = Depends(require_admin),
	db: Session = Depends(get_db),
) -> User:
	"""Update only the user's role and active status."""
	user = db.get(User, user_id)
	if user is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

	if payload.role is not None:
		user.role = payload.role
	if payload.is_active is not None:
		user.is_active = payload.is_active

	db.add(user)
	db.commit()
	db.refresh(user)
	return user
