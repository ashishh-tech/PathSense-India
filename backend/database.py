"""
Database module — SQLite setup & helper functions.
"""

import sqlite3
import json
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent / "data" / "pathsense.db"


def get_db():
    """Get a database connection."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    """Initialize database tables and seed sample data."""
    conn = get_db()
    cursor = conn.cursor()

    # ── Reports table ──
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            severity INTEGER DEFAULT 3 CHECK(severity BETWEEN 1 AND 5),
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            description TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now')),
            upvotes INTEGER DEFAULT 0,
            downvotes INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',
            user_agent TEXT DEFAULT ''
        )
    ''')

    # ── Road quality cache ──
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS road_quality (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            tei_score REAL DEFAULT 50,
            congestion REAL DEFAULT 50,
            surface_quality REAL DEFAULT 50,
            pothole_density REAL DEFAULT 50,
            safety REAL DEFAULT 50,
            infrastructure REAL DEFAULT 50,
            updated_at TEXT DEFAULT (datetime('now'))
        )
    ''')

    # ── Route history ──
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS route_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_name TEXT,
            dest_name TEXT,
            source_lat REAL,
            source_lng REAL,
            dest_lat REAL,
            dest_lng REAL,
            best_tei REAL,
            created_at TEXT DEFAULT (datetime('now'))
        )
    ''')

    conn.commit()

    # Seed sample data if reports table is empty
    cursor.execute("SELECT COUNT(*) FROM reports")
    count = cursor.fetchone()[0]
    if count == 0:
        _seed_reports(conn)
        _seed_road_quality(conn)

    conn.close()
    print(f"[OK] Database initialized at {DB_PATH}")


def _seed_reports(conn):
    """Insert sample crowdsource reports for Delhi."""
    reports = [
        ("pothole", 4, 28.6508, 77.2313, "Large pothole near Chandni Chowk metro"),
        ("pothole", 3, 28.6332, 77.2197, "Multiple potholes on Asaf Ali Rd"),
        ("pothole", 5, 28.5672, 77.2100, "Crater-sized pothole, very dangerous"),
        ("damage", 3, 28.6127, 77.2295, "Road surface crumbling near India Gate"),
        ("damage", 4, 28.5919, 77.2484, "Broken road edge on Mathura Rd"),
        ("damage", 2, 28.6442, 77.2162, "Minor cracks on Chandni Chowk Rd"),
        ("lighting", 3, 28.5562, 77.1855, "No street lights for 500m stretch"),
        ("lighting", 4, 28.5245, 77.1855, "Very poor lighting near Qutub Minar approach"),
        ("lighting", 2, 28.6062, 77.2382, "Dim streetlights on Pragati Maidan flyover"),
        ("flooding", 5, 28.6358, 77.2489, "Waterlogging during rain near Yamuna bank"),
        ("flooding", 4, 28.5731, 77.2109, "Chronic flooding at INA underpass"),
        ("flooding", 3, 28.6289, 77.2065, "Water stagnation after light rain"),
        ("construction", 2, 28.6350, 77.2250, "Metro construction ongoing, lane closed"),
        ("construction", 3, 28.5500, 77.2000, "Flyover under construction, diversions"),
        ("construction", 1, 28.5800, 77.1700, "Road resurfacing, slow traffic"),
        ("pothole", 3, 28.5446, 77.1921, "Chain of potholes near Saket"),
        ("pothole", 4, 28.6155, 77.3897, "Deep potholes on NH24 near Noida border"),
        ("damage", 3, 28.5703, 77.3211, "Broken speed breaker near Kalindi Kunj"),
        ("other", 2, 28.6293, 77.2170, "Stray cattle on road causing jam"),
        ("other", 3, 28.6519, 77.2315, "Open manhole near Red Fort"),
        ("pothole", 5, 28.5876, 77.3120, "Massive pothole on Noida Link Rd"),
        ("flooding", 4, 28.6912, 77.1518, "Severe waterlogging at Azadpur underpass"),
        ("lighting", 3, 28.6764, 77.2121, "Dark stretch near GTB Nagar"),
        ("damage", 4, 28.5100, 77.1750, "Road collapsed partially near Chhatarpur"),
        ("pothole", 3, 28.6280, 77.0500, "Potholes on Dwarka Expressway"),
        ("construction", 4, 28.4595, 77.0266, "DMIC corridor construction, heavy diversions"),
        ("damage", 3, 28.5683, 77.2572, "Cracked road near Nehru Place flyover"),
        ("flooding", 3, 28.6131, 77.2086, "Low-lying area floods in monsoon"),
        ("pothole", 2, 28.7041, 77.1025, "Small potholes on Rohini main rd"),
        ("other", 4, 28.6345, 77.2270, "Overloaded trucks damaging road surface"),
    ]

    cursor = conn.cursor()
    for r in reports:
        cursor.execute(
            "INSERT INTO reports (type, severity, latitude, longitude, description) VALUES (?, ?, ?, ?, ?)",
            r
        )
    conn.commit()
    print(f"[SEED] Seeded {len(reports)} sample reports")


def _seed_road_quality(conn):
    """Generate a grid of road quality data points across Delhi NCR for heatmap."""
    import math
    import random
    random.seed(42)

    # Delhi NCR bounding box
    lat_min, lat_max = 28.40, 28.75
    lng_min, lng_max = 77.00, 77.45

    # City center (for urbanness calculation)
    center_lat, center_lng = 28.6139, 77.2090

    points = []
    step = 0.008  # ~800m grid

    lat = lat_min
    while lat <= lat_max:
        lng = lng_min
        while lng <= lng_max:
            # Distance from city center
            dist = math.sqrt((lat - center_lat) ** 2 + (lng - center_lng) ** 2) * 111
            urbanness = max(0, min(1, 1 - dist / 20))

            # Base scores influenced by location
            seed_val = abs(math.sin(lat * 1000 + lng * 2000)) * 10000
            rand_offset = (seed_val - int(seed_val))

            congestion = max(15, min(95, 40 + urbanness * 30 - rand_offset * 25))
            surface = max(20, min(95, 60 + (1 - urbanness) * 15 - rand_offset * 20))
            pothole = max(10, min(95, 55 - urbanness * 15 - rand_offset * 30))
            safety = max(25, min(95, 55 + rand_offset * 25))
            infra = max(30, min(95, 50 + urbanness * 20 - rand_offset * 15))

            tei = (congestion * 0.25 + surface * 0.20 + pothole * 0.15 +
                   safety * 0.15 + (congestion * 0.7 + rand_offset * 20) * 0.10 +
                   infra * 0.10 + (surface * 0.5 + infra * 0.3) * 0.05)
            tei = max(0, min(100, tei))

            points.append((lat, lng, round(tei, 1), round(congestion, 1),
                           round(surface, 1), round(pothole, 1),
                           round(safety, 1), round(infra, 1)))

            lng += step + random.uniform(-0.001, 0.001)
        lat += step + random.uniform(-0.001, 0.001)

    cursor = conn.cursor()
    cursor.executemany(
        "INSERT INTO road_quality (lat, lng, tei_score, congestion, surface_quality, pothole_density, safety, infrastructure) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        points
    )
    conn.commit()
    print(f"[SEED] Seeded {len(points)} road quality heatmap points")
