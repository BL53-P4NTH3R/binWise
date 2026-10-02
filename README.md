# BinWise — Smart Waste Monitoring and Route Optimisation System

<p align="center">
  <img src="https://img.shields.io/badge/BinWise-v1.0.0-1D9E75?style=for-the-badge" alt="BinWise" />
  <img src="https://img.shields.io/badge/Python-3.12%2B-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-0.139-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
</p>

BinWise is an IoT-driven waste management and route optimisation platform for university campus operations. The system combines ultrasonic sensor nodes, a FastAPI backend, and a React dashboard to monitor bin fill levels in real time and generate smarter collection routes.

This repository contains the current implementation used for the final-year project: backend services, web dashboard, and the firmware files for the sensor node.

---

## Overview

The project was designed to solve a common inefficiency in campus waste collection: trucks still follow fixed schedules even when many bins are only partially full. BinWise uses sensor telemetry to identify which bins are near capacity, raises alerts when thresholds are exceeded, and helps admin staff plan a more efficient collection route.

The main data flow is:

```text
ESP32 sensor node -> HTTP payload -> FastAPI backend -> bin state updates + alerts
                               -> admin dashboard map
                               -> route optimisation engine
                               -> driver route view
```

---

## System Architecture

```text
┌───────────────────────────┐
│ Hardware layer           │
│ ESP32 + HC-SR04 + SIM800L │
└──────────────┬────────────┘
               │ telemetry
               ▼
┌───────────────────────────┐
│ Backend (FastAPI)        │
│ app/api/routers/*        │
│ app/models/*             │
│ app/services/*           │
│ app/scheduler.py          │
└──────────────┬────────────┘
               │ JSON API
               ▼
┌───────────────────────────┐
│ Frontend (React + Vite)  │
│ Admin + Driver dashboards │
└───────────────────────────┘
```

---

## Key Features

- Real-time bin fill monitoring from sensor readings
- Backend alerting for overflow and offline bins
- Admin dashboard with live bin status and KPI summaries
- Route optimisation using OR-Tools / nearest-neighbour logic
- Driver-facing route and history screens
- Role-based access and JWT-based authentication
- PostgreSQL-backed persistence and SQLModel modelling
- Firmware support for ESP32-based sensor nodes

---

## Technology Stack

### Backend

- Python 3.12+
- FastAPI 0.139.0
- SQLModel 0.0.39
- PostgreSQL 16+
- APScheduler
- OR-Tools
- Redis / Celery support included in configuration
- pytest for automated backend tests

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Leaflet + react-leaflet
- Recharts
- Axios

### Firmware

- ESP32 development board
- HC-SR04 ultrasonic sensor
- SIM800L GSM module
- PlatformIO / Arduino-compatible firmware workflow

---

## Repository Structure

```text
binWise/
├── README.md
├── docs/
│   ├── API_SPEC.md
│   ├── DESIGN.md
│   └── architecture/
├── firmware/
│   └── main/
│       ├── ARDUINO_SETUP_GUIDE.md
│       ├── config.h
│       ├── gsm_handler.cpp
│       ├── gsm_handler.h
│       ├── main.ino
│       ├── platformio.ini
│       ├── ultrasonic_handler.cpp
│       ├── ultrasonic_handler.h
│       ├── wifi_handler.cpp
│       └── wifi_handler.h
├── binwise-backend/
│   ├── .env
│   ├── .env.example
│   ├── alembic/
│   ├── alembic.ini
│   ├── app/
│   │   ├── api/
│   │   │   └── routers/
│   │   │       ├── alerts.py
│   │   │       ├── analytics.py
│   │   │       ├── auth.py
│   │   │       ├── bins.py
│   │   │       ├── driver.py
│   │   │       ├── ingest.py
│   │   │       ├── routes.py
│   │   │       ├── sensor_nodes.py
│   │   │       ├── users.py
│   │   │       ├── websocket.py
│   │   │       └── zones.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── security.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── alert.py
│   │   │   ├── alert_settings.py
│   │   │   ├── bin.py
│   │   │   ├── collection_route.py
│   │   │   ├── route_waypoint.py
│   │   │   ├── sensor_node.py
│   │   │   ├── sensor_reading.py
│   │   │   ├── user.py
│   │   │   └── zone.py
│   │   ├── services/
│   │   │   ├── alert_service.py
│   │   │   ├── notification_service.py
│   │   │   └── route_optimizer.py
│   │   ├── main.py
│   │   └── scheduler.py
│   ├── conftest.py
│   ├── pytest.ini
│   ├── requirements.txt
│   ├── scripts/
│   │   └── create_admin.py
│   └── tests/
│       ├── test_alerts.py
│       ├── test_analytics.py
│       ├── test_auth.py
│       ├── test_bins.py
│       ├── test_driver.py
│       ├── test_ingest.py
│       ├── test_routes.py
│       ├── test_users.py
│       └── __init__.py
└── binwise-frontend/
    ├── index.html
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── api/
        ├── components/
        ├── hooks/
        ├── index.css
        ├── main.tsx
        ├── pages/
        ├── types/
        └── utils/
```

---

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+
- PostgreSQL 16+
- Git
- PlatformIO or Arduino IDE for firmware flashing

### Backend setup

```bash
cd binWise/binwise-backend

python -m venv .venv

# Linux/macOS
source .venv/bin/activate

# Windows PowerShell
.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

Create the PostgreSQL database and configure the environment file:

```bash
cp .env.example .env
```

Then update `.env` with your local database credentials and secrets. The repository includes a working template in `.env.example`.

Start the backend:

```bash
uvicorn app.main:fastapi_app --reload --port 8000
```

The API is then available at:

- http://127.0.0.1:8000
- http://127.0.0.1:8000/docs
- http://127.0.0.1:8000/redoc

### Frontend setup

```bash
cd ../binwise-frontend
npm install
npm run dev
```

The frontend runs on:

- http://localhost:5173

### Firmware setup

```bash
cd ../firmware/main
pio run -t upload
```

If you are using Arduino IDE instead of PlatformIO, open the project files in `firmware/main` and follow the instructions in `ARDUINO_SETUP_GUIDE.md`.

---

## Environment Variables

Create a `.env` file in `binwise-backend` based on `.env.example`.

```env
PROJECT_NAME="BinWise API"
ENVIRONMENT=development
DEBUG=True
SECRET_KEY=replace_this_with_a_secure_random_string_32_chars_min
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120

POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_actual_postgres_password_here
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_DB=binwise_db
DATABASE_URL=postgresql://postgres:your_actual_postgres_password_here@localhost:5432/binwise_db

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379/0

TELEMETRY_API_KEY=binwise_gsm_node_secret_key_2026
DEFAULT_OVERFLOW_THRESHOLD_PCT=80.0
DEFAULT_COLLECTION_VEHICLE_CAPACITY=10
```

> Do not commit the `.env` file. Keep credentials and secrets local to your machine.

---

## API Documentation

The backend exposes the main routes through the FastAPI app.

### Main router groups

- `/api/auth`
- `/api/users`
- `/api/driver`
- `/api/zones`
- `/api/routes`
- `/api/bins`
- `/api/sensor-nodes`
- `/api/alerts`
- `/api/ingest`
- `/api/analytics`
- `/ws`

The interactive API reference is available in Swagger UI at `/docs` once the backend is running.

---

## Database and Model Structure

The application uses SQLModel and stores its core entities in `binwise-backend/app/models/`.

Key model groups include:

- `Zone`
- `Bin`
- `SensorNode`
- `SensorReading`
- `User`
- `CollectionRoute`
- `RouteWaypoint`
- `Alert`
- `AlertSettings`

The app keeps the primary logic for bin telemetry, alerts, and route generation in these model and service files.

---

## Testing

Run the backend test suite from the project root or inside `binwise-backend`:

```bash
cd binwise-backend
pytest -q
```

The repository includes tests covering authentication, ingest, bins, alerts, analytics, routes, users, and driver workflows.

---

## Firmware Notes

The firmware source is stored in `firmware/main` and contains the ESP32 implementation for ultrasonic sensing, GSM communication, and bin telemetry payload generation.

The codebase does not currently include a committed Wokwi project or screenshot gallery, so the hardware work is documented using the firmware source and setup guide in that folder.

---

## Screenshots

This repository does not currently include a committed screenshots directory. If the UI is later captured for demonstration or report purposes, screenshots can be added under a `docs/screenshots/` folder.

---

## Project Status

This project is a functional full-stack prototype for smart campus waste monitoring and route management, with the backend, frontend, and firmware components designed to work together.

---

## Author

Blue Panther

Final-year project, Department of Computer Science, Ahmadu Bello University, Zaria.

---

## License

This project is intended for academic and reference use as part of the final-year project submission. Please contact the author before using it for commercial or broader public deployment.

---

<div align="center">
  Built for smarter campus waste operations.
</div>
 