"""Script to create an initial Admin user for BinWise."""

import sys
from pathlib import Path

# Add project root to python path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from sqlmodel import Session, select
from app.core.database import engine
from app.core.security import get_password_hash
from app.models.user import User, UserRole


def create_initial_admin():
    print("--- BinWise Initial Admin Setup ---")
    email = input("Enter admin email (e.g. admin@binwise.abu.edu.ng): ").strip()
    full_name = input("Enter admin full name: ").strip()
    password = input("Enter admin password: ").strip()

    if not email or not password or not full_name:
        print("Error: All fields are required.")
        return

    with Session(engine) as db:
        # Check for existing user
        existing_user = db.exec(select(User).where(User.email == email)).first()
        if existing_user:
            print(f"User with email '{email}' already exists.")
            return

        admin_user = User(
            email=email,
            full_name=full_name,
            hashed_pw=get_password_hash(password),
            role=UserRole.admin,
            is_active=True,
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        print(f"\nSuccess! Admin user '{full_name}' ({email}) created successfully.")


if __name__ == "__main__":
    create_initial_admin()