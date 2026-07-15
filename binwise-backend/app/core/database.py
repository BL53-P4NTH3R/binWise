from sqlmodel import SQLModel, create_engine, Session
from app.core.config import settings

# Create the databaase 
engine = create_engine(
    settings.DATABASE_URL, 
    echo=True, 
    pool_pre_ping=True
)

# Dependency to get a database session
def get_db():
    """
    Dependency function to get a database session.
    
    Yields:
        Session: A SQLAlchemy session connected to the database.
    """
    with Session(engine) as session:
        yield session
 