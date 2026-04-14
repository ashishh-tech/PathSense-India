"""
PathSense India — API Routes
==============================
All REST API endpoints for routing, TEI, crowdsource, heatmap, and stats.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
import httpx
import math

from database import get_db
from models import (
    RouteRequest, ReportCreate, ReportVote,
    RouteAnalysis, ReportResponse, HeatmapPoint, StatsResponse
)
from tei_engine import analyze_route, get_grade

router = APIRouter(tags=["PathSense API"])

# ── External API endpoints ──
OSRM_URL = "https://router.project-osrm.org/route/v1/driving"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"


# ══════════════════════════════════════════════
#  Route Analysis
# ══════════════════════════════════════════════

@router.post("/routes", summary="Analyze routes between two points")
async def analyze_routes(req: RouteRequest):
    """
    Get up to 3 route alternatives between source and destination,
    each fully analyzed with TEI (Traffic Environment Index) scores.
    """
    try:
        url = (
            f"{OSRM_URL}/{req.source_lng},{req.source_lat};"
            f"{req.dest_lng},{req.dest_lat}"
            f"?alternatives=true&overview=full&geometries=geojson&steps=true"
        )

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers={"User-Agent": "PathSenseIndia/1.0"})
            resp.raise_for_status()
            data = resp.json()

        if data.get("code") != "Ok" or not data.get("routes"):
            raise HTTPException(status_code=404, detail="No routes found between these points")

        results = []
        for idx, route in enumerate(data["routes"][:3]):
            # Convert GeoJSON [lng, lat] → [lat, lng]
            coordinates = [[c[1], c[0]] for c in route["geometry"]["coordinates"]]

            # Extract road names from steps
            road_names = set()
            for step in route["legs"][0]["steps"]:
                if step.get("name"):
                    road_names.add(step["name"])
                if step.get("ref"):
                    road_names.add(step["ref"])

            route_name = _generate_route_name(list(road_names), idx)

            # Analyze with TEI engine
            analysis = analyze_route(coordinates, route_variant=idx)

            results.append({
                "route_index": idx,
                "name": route_name,
                "distance_km": round(route["distance"] / 1000, 2),
                "duration_min": round(route["duration"] / 60, 1),
                "coordinates": coordinates,
                **analysis,
            })

        # Sort by TEI (best first)
        results.sort(key=lambda r: r["overall_tei"], reverse=True)

        # Save to route history
        try:
            conn = get_db()
            conn.execute(
                "INSERT INTO route_history (source_name, dest_name, source_lat, source_lng, dest_lat, dest_lng, best_tei) VALUES (?,?,?,?,?,?,?)",
                (req.source_name, req.dest_name, req.source_lat, req.source_lng,
                 req.dest_lat, req.dest_lng, results[0]["overall_tei"] if results else 0)
            )
            conn.commit()
            conn.close()
        except Exception:
            pass

        return {
            "status": "success",
            "source": {"lat": req.source_lat, "lng": req.source_lng, "name": req.source_name},
            "destination": {"lat": req.dest_lat, "lng": req.dest_lng, "name": req.dest_name},
            "routes": results,
            "count": len(results),
        }

    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Routing service error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tei/analyze", summary="Analyze TEI for custom coordinates")
async def analyze_tei(coordinates: List[List[float]], variant: int = 0):
    """
    Calculate TEI analysis for a custom set of coordinates.
    Each coordinate should be [lat, lng].
    """
    if len(coordinates) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 coordinates")

    analysis = analyze_route(coordinates, route_variant=variant)
    return {"status": "success", **analysis}


# ══════════════════════════════════════════════
#  Geocoding
# ══════════════════════════════════════════════

@router.get("/geocode", summary="Geocode a place name to coordinates")
async def geocode(q: str = Query(..., min_length=3), limit: int = 5):
    """Search for a place name and return coordinates (India only)."""
    try:
        params = {
            "q": q,
            "format": "json",
            "countrycodes": "in",
            "limit": str(limit),
            "addressdetails": "1",
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                NOMINATIM_URL, params=params,
                headers={"User-Agent": "PathSenseIndia/1.0"}
            )
            resp.raise_for_status()
            data = resp.json()

        results = []
        for item in data:
            parts = item["display_name"].split(",")
            short_name = ", ".join(p.strip() for p in parts[:3])
            results.append({
                "lat": float(item["lat"]),
                "lng": float(item["lon"]),
                "display_name": item["display_name"],
                "short_name": short_name,
                "type": item.get("type", "place"),
            })

        return {"status": "success", "results": results}

    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Geocoding error: {str(e)}")


# ══════════════════════════════════════════════
#  Crowdsource Reports
# ══════════════════════════════════════════════

@router.get("/reports", summary="Get all crowdsource reports")
async def get_reports(
    type: Optional[str] = None,
    status: str = "active",
    limit: int = 200,
):
    """Get crowdsource road issue reports, optionally filtered by type."""
    conn = get_db()

    query = "SELECT * FROM reports WHERE status = ?"
    params = [status]

    if type:
        query += " AND type = ?"
        params.append(type)

    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)

    rows = conn.execute(query, params).fetchall()
    conn.close()

    reports = [dict(row) for row in rows]
    return {"status": "success", "reports": reports, "count": len(reports)}


@router.get("/reports/nearby", summary="Get reports near coordinates")
async def get_nearby_reports(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(5.0, ge=0.1, le=50),
):
    """Get reports within a radius (km) of given coordinates."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM reports WHERE status = 'active' ORDER BY created_at DESC"
    ).fetchall()
    conn.close()

    # Filter by distance
    nearby = []
    for row in rows:
        d = _haversine(lat, lng, row["latitude"], row["longitude"])
        if d <= radius_km:
            r = dict(row)
            r["distance_km"] = round(d, 2)
            nearby.append(r)

    nearby.sort(key=lambda x: x["distance_km"])

    return {"status": "success", "reports": nearby, "count": len(nearby), "radius_km": radius_km}


@router.post("/reports", summary="Submit a new road issue report", status_code=201)
async def create_report(report: ReportCreate):
    """Submit a crowdsource report for a road issue (pothole, damage, etc.)."""
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO reports (type, severity, latitude, longitude, description) VALUES (?,?,?,?,?)",
        (report.type, report.severity, report.latitude, report.longitude, report.description)
    )
    conn.commit()
    report_id = cursor.lastrowid

    row = conn.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
    conn.close()

    return {"status": "success", "message": "Report submitted successfully", "report": dict(row)}


@router.post("/reports/{report_id}/vote", summary="Upvote or downvote a report")
async def vote_report(report_id: int, vote: ReportVote):
    """Community validation: upvote or downvote a report."""
    conn = get_db()
    row = conn.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Report not found")

    if vote.vote == "up":
        conn.execute("UPDATE reports SET upvotes = upvotes + 1 WHERE id = ?", (report_id,))
    else:
        conn.execute("UPDATE reports SET downvotes = downvotes + 1 WHERE id = ?", (report_id,))

    conn.commit()
    updated = conn.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
    conn.close()

    return {"status": "success", "report": dict(updated)}


# ══════════════════════════════════════════════
#  Heatmap Data
# ══════════════════════════════════════════════

@router.get("/heatmap", summary="Get road quality heatmap data")
async def get_heatmap(
    lat_min: float = Query(28.40),
    lat_max: float = Query(28.75),
    lng_min: float = Query(77.00),
    lng_max: float = Query(77.45),
):
    """Get road quality heatmap points for the given bounding box."""
    conn = get_db()
    rows = conn.execute(
        "SELECT lat, lng, tei_score FROM road_quality WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?",
        (lat_min, lat_max, lng_min, lng_max)
    ).fetchall()
    conn.close()

    # Format for Leaflet.heat: [lat, lng, intensity]
    # Invert score: low TEI = high heat intensity (red = bad)
    points = [[row["lat"], row["lng"], round((100 - row["tei_score"]) / 100, 2)] for row in rows]

    return {"status": "success", "points": points, "count": len(points)}


@router.get("/heatmap/detailed", summary="Get detailed road quality grid")
async def get_heatmap_detailed(
    lat_min: float = Query(28.40),
    lat_max: float = Query(28.75),
    lng_min: float = Query(77.00),
    lng_max: float = Query(77.45),
):
    """Get detailed road quality data including all factor scores."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM road_quality WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?",
        (lat_min, lat_max, lng_min, lng_max)
    ).fetchall()
    conn.close()

    points = [dict(row) for row in rows]
    return {"status": "success", "points": points, "count": len(points)}


# ══════════════════════════════════════════════
#  Statistics
# ══════════════════════════════════════════════

@router.get("/stats", summary="Get platform statistics")
async def get_stats():
    """Get overall PathSense India platform statistics."""
    conn = get_db()

    total_reports = conn.execute("SELECT COUNT(*) as c FROM reports").fetchone()["c"]
    pothole_count = conn.execute("SELECT COUNT(*) as c FROM reports WHERE type = 'pothole'").fetchone()["c"]
    road_points = conn.execute("SELECT COUNT(*) as c FROM road_quality").fetchone()["c"]
    avg_tei = conn.execute("SELECT AVG(tei_score) as a FROM road_quality").fetchone()["a"] or 0
    route_count = conn.execute("SELECT COUNT(*) as c FROM route_history").fetchone()["c"]

    # Worst zones (lowest avg TEI by area)
    worst = conn.execute("""
        SELECT ROUND(lat, 2) as area_lat, ROUND(lng, 2) as area_lng,
               ROUND(AVG(tei_score), 1) as avg_tei, COUNT(*) as points
        FROM road_quality
        GROUP BY ROUND(lat, 2), ROUND(lng, 2)
        HAVING COUNT(*) >= 3
        ORDER BY avg_tei ASC
        LIMIT 5
    """).fetchall()

    # Report type breakdown
    type_breakdown = conn.execute("""
        SELECT type, COUNT(*) as count FROM reports GROUP BY type ORDER BY count DESC
    """).fetchall()

    conn.close()

    return {
        "status": "success",
        "stats": {
            "roads_analyzed": road_points,
            "potholes_reported": pothole_count,
            "total_reports": total_reports,
            "active_contributors": 8923,  # Simulated for demo
            "cities_covered": 23,
            "routes_analyzed": route_count,
            "avg_tei": round(avg_tei, 1),
            "worst_zones": [{"lat": dict(w)["area_lat"], "lng": dict(w)["area_lng"],
                            "avg_tei": dict(w)["avg_tei"]} for w in worst],
            "report_types": [{"type": dict(t)["type"], "count": dict(t)["count"]} for t in type_breakdown],
        }
    }


# ══════════════════════════════════════════════
#  Helpers
# ══════════════════════════════════════════════

def _haversine(lat1, lng1, lat2, lng2):
    R = 6371
    dLat = math.radians(lat2 - lat1)
    dLng = math.radians(lng2 - lng1)
    a = math.sin(dLat / 2) ** 2 + \
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
        math.sin(dLng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _generate_route_name(road_names, index):
    significant = [n for n in road_names if any(kw in n.upper() for kw in
        ["NH", "SH", "MG", "RING", "OUTER", "INNER", "GT", "MATHURA", "MEHRAULI",
         "AUROBINDO", "PATEL", "NEHRU", "LOK", "VIKAS"])]

    if significant:
        primary = next(
            (n for n in significant if any(k in n.upper() for k in ["NH", "SH", "RING", "GT"])),
            significant[0]
        )
        return f"Via {primary}"

    labels = ["Primary Route", "Alternative Route", "Scenic Route"]
    return labels[index] if index < len(labels) else f"Route {index + 1}"
