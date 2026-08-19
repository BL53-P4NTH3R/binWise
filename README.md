# BinWise — Smart Waste Management System
 
<p align="center">
        <img src="https://img.shields.io/badge/BinWise-v1.0.0-1D9E75?style=for-the-badge" alt="BinWise" />
        <img src="https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
        <img src="https://img.shields.io/badge/FastAPI-0.110-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
        <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
        <img src="https://img.shields.io/badge/TypeScript-5.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
        <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />

</p>

**An IoT-powered intelligent waste bin monitoring and collection optimisation system for Samaru Campus, Ahmadu Bello University, Zaria, Nigeria.**

*Final Year Project — Department of Computer Science, ABU Zaria, 2026*
---
 
## Table of Contents
 
- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Hardware Components](#hardware-components)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Firmware Setup](#firmware-setup)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Testing](#testing)
- [Hardware Simulation](#hardware-simulation)
- [Evaluation Results](#evaluation-results)
- [Screenshots](#screenshots)
- [Author](#author)
- [Acknowledgements](#acknowledgements)
- [License](#license)
---
 
## Overview
 
BinWise is a full-stack smart waste management system that combines IoT sensor hardware, a REST API backend, and a real-time web dashboard to monitor waste bin fill levels across Samaru Campus and optimise garbage collection routes using an AI-powered Nearest Neighbour algorithm.
 
The system addresses a core problem on large university campuses: collection trucks follow fixed schedules regardless of actual bin fill levels, wasting fuel, time, and labour on bins that are nearly empty while overflow bins go unattended. BinWise replaces fixed schedules with data-driven, on-demand collection triggered by real sensor readings.
 
### The core loop
 
```
ESP32 wakes from deep sleep every 5 minutes
        ↓
HC-SR04 measures distance to waste surface
        ↓
Fill percentage calculated from bin height
        ↓
SIM800L sends HTTP POST to FastAPI backend via MTN GPRS
        ↓
Backend updates bin fill level + triggers overflow alerts
        ↓
Admin dashboard shows live campus map with bin status
        ↓
Admin generates AI-optimised collection route
        ↓
Driver receives route on mobile app and marks bins collected
```
 
---
 
## System Architecture
 
```
┌─────────────────────────────────────────────────────────────────┐
│                         HARDWARE LAYER                          │
│                                                                 │
│   ESP32 DevKit V1 ──── HC-SR04 (fill level)                    │
│          │                                                      │
│   SIM800L GSM ──────── MTN Nigeria GPRS ────────────┐          │
│   18650 Battery                                     │          │
│   TP4056 Charger                                    │          │
└─────────────────────────────────────────────────────┼──────────┘
                                                      │ HTTP POST
                                                      ↓
┌─────────────────────────────────────────────────────────────────┐
│                          BACKEND LAYER                          │
│                                                                 │
│   FastAPI (Python 3.14)                                         │
│   ├── /api/ingest      ← sensor telemetry (no auth)            │
│   ├── /api/auth        ← JWT authentication                    │
│   ├── /api/bins        ← bin CRUD + live status                │
│   ├── /api/routes      ← AI route generation + management      │
│   ├── /api/alerts      ← overflow + offline alerts             │
│   ├── /api/analytics   ← fill trends + efficiency reports      │
│   ├── /api/users       ← admin + driver accounts               │
│   └── /api/driver      ← driver mobile endpoints               │
│                                                                 │
│   SQLModel ORM ──── PostgreSQL 16                               │
│   APScheduler ──── Sensor watchdog (every 10 min)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                    REST API (JSON)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                          │
│                                                                 │
│   React 18 + TypeScript + Vite + Tailwind CSS                   │
│                                                                 │
│   Admin Portal (desktop)        Driver Portal (mobile)          │
│   ├── Dashboard + live map      ├── Home (route summary)        │
│   ├── Full-screen map           ├── Route navigation + map      │
│   ├── Bin management            └── Collection history          │
│   ├── Route optimisation                                        │
│   ├── Analytics + reports                                       │
│   ├── Alerts centre                                             │
│   ├── User management                                           │
│   └── Settings                                                  │
└─────────────────────────────────────────────────────────────────┘
```
 
---
 
## Key Features
 
| Feature | Description |
|---|---|
| **Real-time IoT monitoring** | ESP32 + HC-SR04 nodes report bin fill levels every 5 minutes via MTN GPRS |
| **AI route optimisation** | Nearest Neighbour TSP algorithm generates collection routes that outperform fixed schedules |
| **Live campus map** | Leaflet.js map plots all bins colour-coded by fill status, auto-refreshes every 30 seconds |
| **Overflow alerts** | Automatic alerts fire when fill level exceeds threshold, with email notifications |
| **Driver mobile app** | Mobile-responsive interface guides collection drivers through optimised routes step-by-step |
| **Analytics dashboard** | Recharts visualisations comparing AI route efficiency vs manual baseline schedules |
| **Role-based access** | Admin (full dashboard) and Driver (mobile route app) portals with JWT authentication |
| **Sensor watchdog** | APScheduler background job detects offline sensors and fires alerts automatically |
| **Evaluation metrics** | AI route vs baseline distance comparison stored per route for project report data |
 
---
 
## Technology Stack
 
### Backend
| Layer | Technology |
|---|---|
| Framework | FastAPI 0.110 |
| Language | Python 3.12+ |
| ORM | SQLModel 0.0.16 |
| Database | PostgreSQL 16 |
| Auth | JWT via python-jose + bcrypt |
| Background jobs | APScheduler 3.10 |
| Route optimisation | Custom Nearest Neighbour + Google OR-Tools |
| Testing | pytest + FastAPI TestClient + SQLite in-memory |
 
### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 + Vite 5 |
| Language | TypeScript 5.2 |
| Styling | Tailwind CSS 3.4 |
| Map | react-leaflet 4 + Leaflet.js + OpenStreetMap |
| Charts | Recharts 2.12 |
| Routing | React Router v6 |
| HTTP | Axios 1.6 |
| Notifications | react-hot-toast |
 
### Hardware (per sensor node)
| Component | Purpose |
|---|---|
| ESP32 DevKit V1 | Microcontroller — firmware, WiFi/BT, deep sleep |
| HC-SR04 | Ultrasonic fill-level sensing (2–400cm range) |
| SIM800L + antenna | GSM/GPRS cellular data transmission |
| 18650 Li-Ion ×2 | Power supply (1S2P parallel, ~5200mAh) |
| TP4056 (with protection) | Battery management + USB charging |
| 1kΩ + 2kΩ resistors | Voltage divider (HC-SR04 5V ECHO → ESP32 3.3V GPIO) |
 
---
 
## Project Structure
 
```
binwise/
├── binwise-backend/               # FastAPI backend
│   ├── app/
│   │   ├── api/
│   │   │   └── routers/
│   │   │       ├── auth.py        # Login + forgot password
│   │   │       ├── bins.py        # Bin CRUD + live status
│   │   │       ├── ingest.py      # ESP32 telemetry endpoint
│   │   │       ├── routes.py      # AI route generation
│   │   │       ├── alerts.py      # Alert centre + thresholds
│   │   │       ├── analytics.py   # Charts + CSV export
│   │   │       ├── users.py       # User management
│   │   │       └── driver.py      # Driver mobile endpoints
│   │   ├── core/
│   │   │   ├── config.py          # Pydantic settings (.env)
│   │   │   ├── database.py        # SQLModel engine + session
│   │   │   └── security.py        # JWT + bcrypt helpers
│   │   ├── models/
│   │   │   ├── zone.py
│   │   │   ├── bin.py             # Central model + enums
│   │   │   ├── sensor_node.py
│   │   │   ├── sensor_reading.py  # Append-only telemetry log
│   │   │   ├── user.py            # Auth schemas + JWT types
│   │   │   ├── collection_route.py
│   │   │   ├── route_waypoint.py
│   │   │   ├── alert.py
│   │   │   └── alert_settings.py  # Singleton thresholds
│   │   ├── services/
│   │   │   ├── route_optimizer.py # Nearest Neighbour + haversine
│   │   │   ├── alert_service.py   # Alert creation + dedup
│   │   │   └── notification_service.py
│   │   ├── models/
│   │   │   └── __init__.py        # model_rebuild() calls
│   │   ├── scheduler.py           # APScheduler watchdog job
│   │   └── main.py                # FastAPI app wiring
│   ├── tests/
│   │   ├── conftest.py            # SQLite fixtures + TestClient
│   │   ├── test_auth.py
│   │   ├── test_ingest.py
│   │   ├── test_bins.py
│   │   ├── test_routes.py
│   │   ├── test_alerts.py
│   │   ├── test_users.py
│   │   ├── test_analytics.py
│   │   └── test_driver.py
│   ├── .env                       # Secret config (never commit)
│   ├── .env.example               # Template for team members
│   ├── alembic.ini
│   ├── pytest.ini
│   └── requirements.txt
│
├── binwise-frontend/              # React frontend
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts          # Axios + JWT interceptor
│   │   │   └── index.ts           # All API call functions
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── AdminLayout.tsx
│   │   │   ├── map/
│   │   │   │   └── BinMap.tsx     # Leaflet map component
│   │   │   └── ui/
│   │   │       └── index.tsx      # Shared UI primitives
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   ├── admin/             # 10 admin screens
│   │   │   └── driver/            # 3 driver screens
│   │   ├── types/
│   │   │   └── index.ts           # All TypeScript interfaces
│   │   ├── utils/
│   │   │   └── index.ts           # Helper functions
│   │   ├── App.tsx                # React Router routes
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts             # Vite + /api proxy
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── firmware/                      # ESP32 Arduino firmware
│   ├── main.cpp                   # Main loop + orchestration
│   ├── config.h                   # Pin definitions + constants
│   ├── gsm_handler.cpp            # SIM800L AT commands
│   ├── gsm_handler.h
│   ├── ultrasonic_handler.cpp     # HC-SR04 read + fill calc
│   ├── ultrasonic_handler.h
│   └── platformio.ini             # PlatformIO build config
│
└── README.md                      # This file
```
 
---
 
## Hardware Components
 
### MVP Sensor Node (1 unit — pilot deployment)
 
| # | Component | Qty | Purpose |
|---|---|---|---|
| 1 | ESP32 DevKit V1 (30-pin) | 1 | Microcontroller |
| 2 | HC-SR04 ultrasonic sensor | 1 | Fill-level detection |
| 3 | SIM800L GSM module + 2dBi antenna | 1 | GPRS data transmission |
| 4 | MTN Nigeria SIM card (data-enabled) | 1 | Cellular connectivity |
| 5 | 18650 Li-Ion battery cell (≥2600mAh) | 2 | Power supply (1S2P) |
| 6 | 18650 dual-cell parallel holder | 1 | Battery housing |
| 7 | TP4056 charger module (with protection) | 1 | BMS + USB charging |
| 8 | Resistor assortment (1kΩ + 2kΩ) | 1 pack | HC-SR04 voltage divider |
| 9 | Jumper wires (M-M, M-F, F-F) | 1 pack | Breadboard connections |
| 10 | Breadboard (830-point) | 1 | Prototype build surface |
 
### Wiring Summary
 
```
ESP32 3V3  ──────────────────────── HC-SR04 VCC
ESP32 GND  ──────────────────────── HC-SR04 GND  (common ground)
ESP32 D4   ──────────────────────── HC-SR04 TRIG
HC-SR04 ECHO ─── 1kΩ ─── (mid) ─── ESP32 D16
                           │
                          2kΩ
                           │
                          GND
 
Battery B+ ──── TP4056 B+
Battery B- ──── TP4056 B-
TP4056 OUT+ ─── ESP32 VIN  (and SIM800L VCC — direct battery rail)
TP4056 OUT- ─── GND
 
ESP32 D16 (UART2 RX) ── SIM800L TX
ESP32 D17 (UART2 TX) ── SIM800L RX
```
 
> **Critical:** SIM800L must be powered from the battery rail directly (3.7–4.2V),
> NOT from ESP32's 3.3V regulator. The SIM800L draws up to 2A during GSM
> burst transmission — far exceeding the 800mA limit of the AMS1117 regulator.
 
---
 
## Getting Started
 
### Prerequisites
 
- Python 3.12+
- Node.js 18+
- PostgreSQL 16
- Git
- Arduino IDE or PlatformIO (for firmware)
### Backend Setup
 
```bash
# 1. Clone the repository
git clone https://github.com/yourusername/binwise.git
cd binwise/binwise-backend
 
# 2. Create and activate virtual environment
python -m venv .venv

# Linux / macOS
source .venv/bin/activate

# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1

# Windows (CMD)
.venv\Scripts\activate.bat
 
# 3. Install dependencies
pip install -r requirements.txt
 
# 4. Create the PostgreSQL database
psql -U postgres
CREATE DATABASE binwise;
CREATE USER binwise_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE binwise TO binwise_user;
\q
 
# 5. Configure environment variables
# Copy `.env.example` to `.env` and edit the values.
# Unix/macOS:
cp .env.example .env
# Windows (PowerShell / CMD):
copy .env.example .env
 
# 6. Start the backend server
uvicorn app.main:fastapi_app --reload --port 8000
```
 
The API will be available at `http://127.0.0.1:8000`
Interactive docs at `http://127.0.0.1:8000/docs`
 
### Frontend Setup
 
```bash
# 1. Navigate to frontend directory
cd ../binwise-frontend
 
# 2. Install dependencies
npm install
 
# 3. Start the development server
npm run dev
```
 
The frontend will be available at `http://localhost:5173`
 
> The Vite dev server proxies all `/api/*` requests to `http://127.0.0.1:8000`
> automatically — no CORS configuration needed during development.
 
### Firmware Setup
 
```bash
# Using PlatformIO (recommended)
cd ../firmware
pio run --target upload
 
# Or using Arduino IDE:
# 1. Install ESP32 board support (Espressif Systems)
# 2. Install libraries: TinyGSM, ArduinoJson, NewPing
# 3. Update config.h with your API server IP and APN settings
# 4. Flash to ESP32 via USB
```
 
---
 
## Environment Variables
 
Create a `.env` file in `binwise-backend/` based on `.env.example`:
 
```env
# Database
DATABASE_URL=postgresql://binwise_user:your_password@localhost:5432/binwise
 
# Security
SECRET_KEY=your-long-random-secret-key-at-least-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
 
# Email notifications (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
 
# Application
PROJECT_NAME=BinWise
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:5173
```
 
> **Never commit your `.env` file.** It is listed in `.gitignore`.
 
---
 
## API Documentation
 
With the backend running, visit:
 
| URL | Description |
|---|---|
| `http://127.0.0.1:8000/docs` | Swagger UI — interactive API explorer |
| `http://127.0.0.1:8000/redoc` | ReDoc — clean API reference |
| `http://127.0.0.1:8000/openapi.json` | Raw OpenAPI 3.0 specification |
 
### Key endpoints
 
```
POST /api/auth/login              Authenticate + get JWT token
POST /api/ingest                  ESP32 telemetry (no auth required)
GET  /api/bins/live               Live bin fill levels for map
GET  /api/bins/summary            Dashboard KPI counts
POST /api/routes/generate         Generate AI-optimised collection route
GET  /api/analytics/trips         AI vs baseline distance comparison
GET  /api/analytics/export        Download CSV report
```
 
---
 
## Database Schema
 
The system uses **9 PostgreSQL tables**:
 
```
zones              Campus zones (Academic Core, Residential, etc.)
bins               Master bin records with live fill_pct cache
sensor_nodes       ESP32 node registry (1:1 with bins)
sensor_readings    Append-only telemetry log (time-series)
users              Admin and Driver accounts
collection_routes  AI-generated collection routes
route_waypoints    Junction table — bins per route in order
alerts             Overflow + offline + low battery alerts
alert_settings     Singleton threshold configuration table
```
 
Full DBML schema available at `binwise-backend/docs/schema.dbml`
Paste into [dbdiagram.io](https://dbdiagram.io) to visualise the ERD.
 
---
 
## Testing
 
```bash
cd binwise-backend
 
# Run all tests
pytest tests/ -v
 
# Run a specific test file
pytest tests/test_ingest.py -v
 
# Run with output (shows print statements)
pytest tests/ -v -s
 
# Run and show coverage
pytest tests/ -v --tb=short
```
 
### Test suite summary
 
| File | Tests | Coverage |
|---|---|---|
| `test_auth.py` | 10 | Login, forgot password, inactive user |
| `test_ingest.py` | 14 | Telemetry, fill status, alert creation, dedup |
| `test_bins.py` | 18 | CRUD, live map, summary KPIs, role guards |
| `test_routes.py` | 15 | Nearest Neighbour algorithm, AI vs baseline |
| `test_alerts.py` | 14 | Alert service, dedup, resolve, thresholds |
| `test_users.py` | 9 | User CRUD, password security, role change |
| `test_analytics.py` | 9 | Fill trends, trip comparison, CSV export |
| `test_driver.py` | 10 | Driver route, collect, history isolation |
| **Total** | **99** | |
 
> Tests use SQLite in-memory — no PostgreSQL required to run the test suite.
 
---
 
## Hardware Simulation
 
A Wokwi simulation is provided for testing firmware without physical hardware.
 
1. Go to [wokwi.com](https://wokwi.com) → New Project → ESP32
2. Paste `firmware/sketch.ino` into the code editor
3. Paste `firmware/diagram.json` into the diagram tab
4. Click **Play**
The Serial Monitor shows the full AT command sequence the SIM800L would send, and the distance slider on the HC-SR04 simulates different fill levels in real time. Status LEDs respond to fill level thresholds automatically.
 
> Note: Wokwi does not have a native SIM800L component.
> GSM transmission is simulated via Serial output showing the
> exact AT command sequence used in production hardware.
 
---
 
## Evaluation Results
 
The core academic contribution of BinWise is demonstrating that AI-optimised routes outperform fixed manual schedules. Results from the pilot evaluation:
 
| Metric | AI Route | Baseline (fixed schedule) | Improvement |
|---|---|---|---|
| Average distance per route | — km | — km | —% |
| Average collection time | — min | — min | —% |
| Overflow incidents detected | — | — | — |
| Sensor uptime | —% | N/A | — |
 
> Results will be populated from real pilot data during September evaluation phase.
 
---
 
## Screenshots
 
| Screen | Description |
|---|---|
| ![Login](docs/screenshots/login.png) | Login page — role-based authentication |
| ![Dashboard](docs/screenshots/dashboard.png) | Admin dashboard — live campus map + KPI cards |
| ![Live Map](docs/screenshots/map.png) | Full-screen bin map with status filters |
| ![Routes](docs/screenshots/routes.png) | AI route generation + efficiency comparison |
| ![Analytics](docs/screenshots/analytics.png) | Charts — AI vs baseline distance |
| ![Driver Home](docs/screenshots/driver-home.png) | Driver mobile home screen |
| ![Driver Route](docs/screenshots/driver-route.png) | Driver step-by-step route navigation |
 
> Add screenshots to `docs/screenshots/` directory.
 
---
 
## Author
 
**Blue Panther**
Final Year Student — Computer Science
Ahmadu Bello University, Zaria, Nigeria
 
- AI Lead, ABUDEV
- Secretary-General, NACOS ABU Chapter
- Zindi Community Ambassador, ABU
- Creator, PixelMind (52-week applied CV research series)
---
 
## Acknowledgements
 
- Ahmadu Bello University, Department of Computer Science
- Samaru Campus Municipal Services (waste collection data and field access)
- Data Science Nigeria (prior internship — ML foundations)
- The FastAPI, SQLModel, and React-Leaflet open-source communities
---
 
## License
 
This project is submitted as a final year undergraduate project at Ahmadu Bello
University, Zaria, Nigeria. All rights reserved.
 
For academic use and reference only. Contact the author for permissions
regarding reproduction or commercial use.
 
---
 
<div align="center">
Built with purpose for Samaru Campus · ABU Zaria · 2026
 
</div>
 