"""
This module contains the configuration settings for the application. It defines various constants and parameters that are used throughout the application to control its behavior and functionality.
The configuration settings include parameters for database connections, API endpoints, authentication settings, and other application-specific
    configurations. By centralizing these settings in a single module, it allows for easier management and modification of the application's configuration without having to change multiple parts of the codebase.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator

class Settings(BaseSettings):
    """
    Application configuration settings.

    Attributes:
        DATABASE_URL (str): The URL for the database connection.
        SECRET_KEY (str): The secret key used for cryptographic operations.
        ALGORITHM (str): The algorithm used for hashing and encryption.
        ACCESS_TOKEN_EXPIRE_MINUTES (int): The expiration time for access tokens in minutes.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database configuration
    DATABASE_URL: str = Field(..., description="The URL for the database connection.")
    SECRET_KEY: str = Field(..., description="The secret key used for cryptographic operations.")
    ALGORITHM: str = Field("HS256", description="The algorithm used for hashing and encryption.")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(30, description="The expiration time for access tokens in minutes.")

    # Cache configuration
    REDIS_HOST: str = Field("localhost", description="The hostname of the Redis server.")
    REDIS_PORT: int = Field(6379, description="The port number of the Redis server.")
    REDIS_URL: str = Field(..., description="The URL for the Redis connection.")

    # AI Route Engine configuration
    DEFAULT_OVERFLOW_THRESHOLD_PCT: float = Field(80.0, description="The default overflow threshold percentage for bins.")
    DEFAULT_COLLECTION_VEHICLE_CAPACITY: float = Field(1000.0, description="The default capacity of collection vehicles in kilograms.")

    # Application configuration
    ENVIRONMENT: str = Field("development", description="The current environment of the application (e.g., development, production).")
    DEBUG: bool = Field(True, description="Indicates whether the application is running in debug mode.")
    API_V1: str = Field("/api/v1", description="The base path for the API v1 endpoints.")
    PROJECT_NAME: str = Field("BinWise API", description="The title of the API.")

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        if not v.startswith("postgresql://"):
            raise ValueError("DATABASE_URL must be a valid PostgreSQL URL")
        return v

settings = Settings()   # type: ignore[arg-type]
