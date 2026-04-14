# 🛣️ PathSense India

> *"Don't just navigate. Know your road."*

**AI-powered Road Quality & Route Intelligence System** for smarter, safer commutes across India.

![PathSense India](https://img.shields.io/badge/SDG_11-Sustainable_Cities-10b981?style=for-the-badge)
![Tech](https://img.shields.io/badge/HTML%2FCSS%2FJS-Leaflet.js-06b6d4?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-MVP-fbbf24?style=for-the-badge)

## 🌐 Live Application

Explore the fully functional MVP deployed via Cloudflare Pages:
🔗 **[Live Demo: PathSense India](https://pathsense-india.pages.dev/)**

---

## 🎯 What is PathSense?

When you enter **Source → Destination**, PathSense doesn't just show the fastest route — it shows the **healthiest route** with a comprehensive **Traffic Environment Index (TEI)** score covering:

- 🚗 **Congestion Level** — Real-time traffic flow analysis
- 🛣️ **Surface Quality** — Road roughness (IRI-based)
- 🕳️ **Pothole Density** — Pothole count per km
- 🛡️ **Safety Score** — Lighting, accidents, infrastructure
- 🌿 **Emission Impact** — CO₂/NOₓ per route
- 🏗️ **Infrastructure** — Signage, dividers, drainage
- 💺 **Ride Comfort** — Speed bumps, sharp turns

## 🚀 Quick Start

### Option 1: Open directly
```
Open frontend/index.html in your browser
```

### Option 2: Local server (recommended)
```bash
npx serve frontend -l 3000
# Then open http://localhost:3000
```

## 🎮 Demo

1. Open the app
2. Click any **Quick Demo** button (e.g., "CP → Airport")
3. Watch as PathSense analyzes route alternatives
4. Compare routes by TEI scores
5. Click route segments for detailed breakdowns
6. Use the **Report Issue** button to crowdsource road problems

## 🧠 TEI Score

TEI (Traffic Environment Index) is our custom composite score (0-100):

| Score | Grade | Meaning |
|-------|-------|---------|
| 90-100 | A+ 🟢 | Excellent — Smooth, safe, efficient |
| 75-89 | A 🟢 | Good — Minor issues only |
| 60-74 | B 🟡 | Average — Some caution needed |
| 40-59 | C 🟠 | Poor — Significant issues |
| 20-39 | D 🔴 | Bad — Major problems |
| 0-19 | F ⚫ | Dangerous — Avoid if possible |

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML/CSS/JS (Vanilla) |
| Map | Leaflet.js + CartoDB Dark Tiles |
| Routing | OSRM (Open Source Routing Machine) |
| Geocoding | Nominatim (OpenStreetMap) |
| Design | Dark glassmorphic UI |

## 📁 Project Structure

```
PathSense India/
├── frontend/
│   ├── index.html          # Main application
│   ├── css/
│   │   ├── index.css       # Design system & tokens
│   │   ├── map.css         # Map-specific styles
│   │   └── dashboard.css   # Dashboard & gauge styles
│   └── js/
│       ├── tei.js          # TEI scoring engine
│       ├── map.js          # Leaflet map module
│       ├── route.js        # Routing & geocoding
│       ├── dashboard.js    # Visualizations
│       ├── crowdsource.js  # User reporting
│       └── app.js          # Main orchestrator
└── README.md
```

## 🏆 SDG 11 Alignment

- **Target 11.2** — Improve road transport systems
- **Target 11.6** — Reduce environmental impact via emission-aware routing
- **Target 11.7** — Safer public spaces through safety scoring

## 🔗 Part of the GLOSA-BHARAT Ecosystem

- **GLOSA-BHARAT** optimizes traffic signals to reduce emissions
- **PathSense India** optimizes route selection based on road quality
- Together: **Sustainable Urban Mobility Intelligence Platform**

---

Built with ❤️ for India's roads.
