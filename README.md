# 🛣️ PathSense India

> *"Don't just navigate. Know your road."*

**AI-powered Road Quality & Route Intelligence System** for smarter, safer commutes across India.

![SDG 11](https://img.shields.io/badge/SDG_11-Sustainable_Cities-10b981?style=for-the-badge)
![Frontend](https://img.shields.io/badge/Frontend-HTML%2FCSS%2FJS-06b6d4?style=for-the-badge)
![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge)
![Map](https://img.shields.io/badge/Map-Leaflet.js-199900?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-MVP-fbbf24?style=for-the-badge)

<br>

## 🌐 Live Application

🔗 **[https://pathsense-india.pages.dev](https://pathsense-india.pages.dev/)**

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [TEI Methodology](#-tei-methodology)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [API Endpoints](#-api-endpoints)
- [Project Structure](#-project-structure)
- [SDG 11 Alignment](#-sdg-11-alignment)

---

## 🎯 Overview

PathSense India goes beyond simple navigation. When you enter **Source → Destination**, it analyzes every road segment along each route alternative and scores them using a proprietary **Traffic Environment Index (TEI)**. The system recommends the **healthiest route** — factoring in road surface quality, congestion, pothole severity, safety conditions, emission impact, and infrastructure adequacy.

### The Problem
- **62% of Indian roads** lack adequate quality monitoring
- Commuters waste **45+ minutes daily** on poor-condition routes
- Vehicle wear costs from potholes average **₹12,000/year** per vehicle
- No navigation app considers **road health** alongside travel time

### Our Solution
A real-time, crowdsource-enhanced road intelligence platform that scores, compares, and recommends routes based on holistic road quality — not just distance or time.

---

## ✨ Key Features

| Feature | Description |
|---------|------------|
| 🗺️ **TEI Route Analysis** | Composite 0-100 scoring across 7 road quality factors |
| 🔀 **Multi-Route Comparison** | Side-by-side comparison of up to 3 route alternatives |
| 🌡️ **Road Quality Heatmap** | 2,500+ data points visualized as a color-coded city overlay |
| 📍 **Crowdsource Reporting** | GPS-enabled hazard reporting (potholes, flooding, damage) |
| 🌿 **Emission Estimation** | CO₂/NOₓ per-route calculations with "cleaner choice" badges |
| 🔧 **Vehicle Wear Cost** | Estimated maintenance cost per route based on road conditions |
| 👍 **Community Validation** | Upvote/downvote crowdsource reports for accuracy |
| 📊 **Segment Drill-Down** | Click any road segment for factor-level breakdown popups |
| 🎨 **Dark Glassmorphic UI** | Premium dark theme with animations and micro-interactions |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    FRONTEND (Vanilla JS)                 │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ Map.js  │ │Route.js │ │Dashboard │ │  Heatmap.js  │  │
│  │(Leaflet)│ │(OSRM)   │ │  .js     │ │(Leaflet.heat)│  │
│  └────┬────┘ └────┬────┘ └────┬─────┘ └──────┬───────┘  │
│       └───────────┼───────────┼───────────────┘          │
│                   │     App.js (Orchestrator)             │
│                   │     TEI.js (Scoring Engine)           │
└───────────────────┼──────────────────────────────────────┘
                    │ REST API
┌───────────────────┼──────────────────────────────────────┐
│                   ▼    BACKEND (FastAPI + Python)         │
│  ┌──────────────────────────────────────────────────┐    │
│  │  /api/routes    → OSRM proxy + TEI scoring       │    │
│  │  /api/reports   → CRUD + voting + nearby search   │    │
│  │  /api/heatmap   → 2,500+ road quality grid points │    │
│  │  /api/geocode   → Nominatim proxy (India)         │    │
│  │  /api/stats     → Platform analytics              │    │
│  └──────────────────────────────────────────────────┘    │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ tei_engine │  │  database.py │  │   models.py     │  │
│  │   .py      │  │  (SQLite)    │  │  (Pydantic)     │  │
│  └────────────┘  └──────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## 🧠 TEI Methodology

**TEI (Traffic Environment Index)** is a weighted composite score from 0 to 100:

| Factor | Weight | Source | Metric |
|--------|--------|--------|--------|
| 🚗 Congestion | 25% | Traffic density | Flow rate vs. capacity |
| 🛣️ Surface Quality | 20% | IRI roughness model | International Roughness Index |
| 🕳️ Pothole Density | 15% | Crowdsource reports | Potholes per km |
| 🛡️ Safety | 15% | Infra + accident data | Lighting, signage, history |
| 🌿 Emissions | 10% | Speed-emission model | g CO₂/km estimate |
| 🏗️ Infrastructure | 10% | Road audit data | Dividers, drainage, signals |
| 💺 Comfort | 5% | Composite | Speed bumps, turns, surface |

### Grading Scale

| Score | Grade | Color | Interpretation |
|-------|-------|-------|---------------|
| 90-100 | A+ | 🟢 `#10b981` | Excellent — smooth, safe, efficient |
| 75-89 | A | 🟢 `#34d399` | Good — minor issues only |
| 60-74 | B | 🟡 `#fbbf24` | Average — some caution needed |
| 40-59 | C | 🟠 `#f97316` | Poor — significant issues |
| 20-39 | D | 🔴 `#ef4444` | Bad — major problems |
| 0-19 | F | ⚫ `#6b7280` | Dangerous — avoid if possible |

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| HTML5 / CSS3 / Vanilla JS | Core application (no framework dependencies) |
| [Leaflet.js](https://leafletjs.com/) | Interactive map with CartoDB dark tiles |
| [Leaflet.heat](https://github.com/Leaflet/Leaflet.heat) | Road quality heatmap overlay |
| Google Fonts (Inter, Outfit) | Modern typography |

### Backend
| Technology | Purpose |
|-----------|---------|
| [FastAPI](https://fastapi.tiangolo.com/) | REST API framework |
| [Uvicorn](https://www.uvicorn.org/) | ASGI server with hot reload |
| SQLite | Lightweight database for reports & road quality |
| [Pydantic](https://docs.pydantic.dev/) | Request/response validation |
| [httpx](https://www.python-httpx.org/) | Async HTTP client for OSRM/Nominatim |

### External APIs (No Keys Required)
| API | Purpose |
|-----|---------|
| [OSRM](http://project-osrm.org/) | Open-source routing with alternatives |
| [Nominatim](https://nominatim.org/) | OpenStreetMap geocoding (India) |
| [CartoDB](https://carto.com/) | Dark map tile provider |

### Deployment
| Platform | Purpose |
|----------|---------|
| [Cloudflare Pages](https://pages.cloudflare.com/) | Frontend CDN hosting |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+ (for `npx serve`)

### One-Click Start (Windows)
```bash
# Double-click run.bat or:
.\run.bat
```

### Manual Start

**1. Backend:**
```bash
cd backend
pip install -r requirements.txt
python main.py
# API starts at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

**2. Frontend:**
```bash
npx -y serve frontend -l 3000
# Opens at http://localhost:3000
```

### Demo
1. Open `http://localhost:3000`
2. Click any **Quick Demo** button (e.g., "CP → Airport")
3. Toggle the **heatmap** 🌡️ button in the navbar
4. Toggle **report markers** 📍 to see crowdsourced issues
5. Click route segments on the map for detailed TEI breakdowns
6. Compare routes in the dashboard sidebar
7. Submit a road issue via the **Report Issue** FAB

---

## 📡 API Endpoints

Base URL: `http://localhost:8000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API info & health check |
| `POST` | `/api/routes` | Analyze routes with TEI scoring |
| `GET` | `/api/geocode?q=` | Geocode place names (India) |
| `GET` | `/api/reports` | List all crowdsource reports |
| `GET` | `/api/reports/nearby?lat=&lng=&radius_km=` | Reports near a location |
| `POST` | `/api/reports` | Submit a new road issue report |
| `POST` | `/api/reports/{id}/vote` | Upvote/downvote a report |
| `GET` | `/api/heatmap` | Road quality heatmap data (2,550 points) |
| `GET` | `/api/heatmap/detailed` | Full factor scores per grid point |
| `GET` | `/api/stats` | Platform statistics & analytics |

📖 **Interactive API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📁 Project Structure

```
PathSense India/
├── frontend/
│   ├── index.html              # Main SPA
│   ├── css/
│   │   ├── index.css           # Design system (650+ lines)
│   │   ├── map.css             # Leaflet overrides & markers
│   │   └── dashboard.css       # Gauges, bars, comparisons
│   └── js/
│       ├── tei.js              # TEI scoring engine (client)
│       ├── map.js              # Leaflet map + segments
│       ├── route.js            # OSRM routing + Nominatim
│       ├── dashboard.js        # SVG gauge + factor bars
│       ├── heatmap.js          # Heatmap overlay + reports
│       ├── crowdsource.js      # Report form + GPS
│       └── app.js              # Main orchestrator
│
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── database.py             # SQLite + seed data
│   ├── models.py               # Pydantic schemas
│   ├── tei_engine.py           # TEI scoring (server)
│   ├── requirements.txt        # Python dependencies
│   ├── routes/
│   │   └── api.py              # REST API endpoints
│   └── data/
│       └── pathsense.db        # SQLite database (auto-generated)
│
├── .gitignore
├── run.bat                     # One-click startup (Windows)
└── README.md
```

---

## 🏆 SDG 11 Alignment

PathSense India directly supports **UN Sustainable Development Goal 11: Sustainable Cities and Communities**.

| Target | How PathSense Contributes |
|--------|--------------------------|
| **11.2** — Sustainable transport | Routes users via highest-quality roads, reducing travel stress |
| **11.6** — Environmental impact | Emission-aware routing recommends lower CO₂ paths |
| **11.7** — Safe public spaces | Safety scoring highlights poorly-lit and hazardous stretches |
| **11.b** — Disaster resilience | Crowdsource flooding reports enable real-time hazard avoidance |

---

## 🔗 Part of the GLOSA-BHARAT Ecosystem

| Project | Role |
|---------|------|
| **GLOSA-BHARAT** | Optimizes traffic signals to reduce idle emissions |
| **PathSense India** | Optimizes route selection based on road health |
| **Together** | Sustainable Urban Mobility Intelligence Platform |

---

<p align="center">
  Built with ❤️ for India's roads
  <br>
  <b>PathSense India</b> — Road Quality Intelligence
</p>
