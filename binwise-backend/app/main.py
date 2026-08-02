"""FastAPI application wiring for BinWise."""

import sys
from contextlib import asynccontextmanager
from importlib import import_module
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel
from app.models import *

# Allow `uvicorn main:app --reload` to resolve `app.*` imports when this file is
# executed from inside the `app/` directory.
BASE_DIR = Path(__file__).resolve().parent
PARENT_DIR = BASE_DIR.parent
if str(PARENT_DIR) not in sys.path:
	sys.path.insert(0, str(PARENT_DIR))

import app.models  # noqa: F401 - registers SQLModel tables
from app.core.config import settings
from app.core.database import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
	SQLModel.metadata.create_all(engine)
	scheduler_module = import_module("app.scheduler")
	start_scheduler = getattr(scheduler_module, "start_scheduler", None)
	if callable(start_scheduler):
		start_scheduler()
	yield


fastapi_app = FastAPI(
	title=settings.PROJECT_NAME,
	description="BinWise API",
	version="1.0.0",
	lifespan=lifespan,
)

app = fastapi_app

fastapi_app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


def _include_router(module_name: str, prefix: str) -> None:
	module = import_module(f"app.api.routers.{module_name}")
	router = getattr(module, "router", None)
	if router is not None:
		fastapi_app.include_router(router, prefix=prefix)


for module_name, prefix in [
	("auth", "/api/auth"),
	("bins", "/api/bins"),
	("ingest", "/api/ingest"),
	("alerts", "/api/alerts"),
	("analytics", "/api/analytics"),
	("driver", "/api/driver"),
	("routes", "/api/routes"),
	("users", "/api/users"),
]:
	_include_router(module_name, prefix)
