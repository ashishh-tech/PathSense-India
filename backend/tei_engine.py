"""
Server-side TEI (Traffic Environment Index) calculation engine.
Mirrors the frontend tei.js logic for backend route analysis.
"""

import math
import random


# ── Factor weights (sum = 1.0) ──
WEIGHTS = {
    "congestion": 0.25,
    "surface_quality": 0.20,
    "pothole_density": 0.15,
    "safety": 0.15,
    "emission": 0.10,
    "infrastructure": 0.10,
    "comfort": 0.05,
}

# ── Grade scale ──
GRADES = [
    {"min": 90, "grade": "A+", "label": "Excellent", "color": "#10b981"},
    {"min": 75, "grade": "A",  "label": "Good",      "color": "#34d399"},
    {"min": 60, "grade": "B",  "label": "Average",   "color": "#fbbf24"},
    {"min": 40, "grade": "C",  "label": "Poor",      "color": "#f97316"},
    {"min": 20, "grade": "D",  "label": "Bad",       "color": "#ef4444"},
    {"min": 0,  "grade": "F",  "label": "Dangerous", "color": "#6b7280"},
]

# Delhi city center reference
DELHI_CENTER = (28.6139, 77.2090)


def get_grade(score: float) -> dict:
    score = round(max(0, min(100, score)))
    for g in GRADES:
        if score >= g["min"]:
            return {**g, "score": score}
    return {**GRADES[-1], "score": score}


def get_color(score: float) -> str:
    return get_grade(score)["color"]


def haversine(lat1, lng1, lat2, lng2):
    R = 6371
    dLat = math.radians(lat2 - lat1)
    dLng = math.radians(lng2 - lng1)
    a = math.sin(dLat / 2) ** 2 + \
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
        math.sin(dLng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def calculate_tei(factors: dict) -> int:
    total = 0
    for key, weight in WEIGHTS.items():
        total += factors.get(key, 50) * weight
    return round(max(0, min(100, total)))


def _clamp(val, lo, hi):
    return max(lo, min(hi, val))


def _pseudo_random(seed, offset=0):
    s = abs(math.sin(seed + offset * 137.507)) * 10000
    return s - math.floor(s)


def simulate_segment(start_coord, end_coord, seg_index, total_segments, route_variant=0):
    """Generate realistic simulated factor scores for a road segment."""
    mid_lat = (start_coord[0] + end_coord[0]) / 2
    mid_lng = (start_coord[1] + end_coord[1]) / 2

    dist_from_center = haversine(mid_lat, mid_lng, DELHI_CENTER[0], DELHI_CENTER[1])
    urbanness = max(0, min(1, 1 - dist_from_center / 30))
    position = seg_index / max(1, total_segments - 1)

    seed = abs(math.sin(mid_lat * 1000 + mid_lng * 2000 + seg_index * 100 + route_variant * 50)) * 10000

    variant_bonus = [0, -8, -15][route_variant] if route_variant < 3 else 0

    congestion = _clamp(
        (1 - urbanness * 0.6) * 100 - _pseudo_random(seed, 1) * 25 +
        variant_bonus * 0.5 + (1 - position) * 10,
        15, 98
    )

    surface = _clamp(
        65 + (1 - urbanness) * 20 - _pseudo_random(seed, 2) * 30 + variant_bonus * 0.7,
        20, 95
    )

    pothole = _clamp(
        70 - urbanness * 20 - _pseudo_random(seed, 3) * 35 +
        (-25 if _pseudo_random(seed, 4) > 0.7 else 0) + variant_bonus * 0.6,
        10, 95
    )

    safety = _clamp(
        60 + (1 - urbanness) * 15 + _pseudo_random(seed, 5) * 20 - 10 + variant_bonus * 0.4,
        25, 95
    )

    emission = _clamp(
        congestion * 0.7 + _pseudo_random(seed, 6) * 25 + variant_bonus * 0.3,
        20, 95
    )

    infrastructure = _clamp(
        55 + urbanness * 25 - _pseudo_random(seed, 7) * 20 + variant_bonus * 0.3,
        30, 95
    )

    comfort = _clamp(
        surface * 0.5 + infrastructure * 0.3 + _pseudo_random(seed, 8) * 20,
        15, 95
    )

    factors = {
        "congestion": round(congestion),
        "surface_quality": round(surface),
        "pothole_density": round(pothole),
        "safety": round(safety),
        "emission": round(emission),
        "infrastructure": round(infrastructure),
        "comfort": round(comfort),
    }

    tei = calculate_tei(factors)
    grade = get_grade(tei)

    issues = []
    if pothole < 40:
        issues.append({"type": "pothole", "severity": "high" if pothole < 25 else "medium"})
    if congestion < 35:
        issues.append({"type": "congestion", "severity": "high"})
    if safety < 40:
        issues.append({"type": "safety", "severity": "high" if safety < 25 else "medium"})
    if surface < 35:
        issues.append({"type": "surface", "severity": "high"})

    return {
        "factors": factors,
        "tei": tei,
        "grade": grade,
        "issues": issues,
    }


def analyze_route(coordinates, route_variant=0):
    """
    Analyze a full route by dividing it into segments and scoring each.
    coordinates: list of [lat, lng]
    """
    total_distance = sum(
        haversine(coordinates[i][0], coordinates[i][1],
                  coordinates[i + 1][0], coordinates[i + 1][1])
        for i in range(len(coordinates) - 1)
    )

    num_segments = max(3, min(12, round(total_distance / 2)))
    seg_len = len(coordinates) // num_segments

    segments = []
    for i in range(num_segments):
        start_idx = i * seg_len
        end_idx = len(coordinates) - 1 if i == num_segments - 1 else (i + 1) * seg_len
        seg_coords = coordinates[start_idx:end_idx + 1]
        if len(seg_coords) < 2:
            continue

        start_c = seg_coords[0]
        end_c = seg_coords[-1]

        analysis = simulate_segment(start_c, end_c, i, num_segments, route_variant)

        seg_dist = sum(
            haversine(seg_coords[j][0], seg_coords[j][1],
                      seg_coords[j + 1][0], seg_coords[j + 1][1])
            for j in range(len(seg_coords) - 1)
        )

        segments.append({
            "index": i,
            "name": f"Segment {i + 1}",
            "distance_km": round(seg_dist, 2),
            "start_coord": list(start_c),
            "end_coord": list(end_c),
            **analysis,
        })

    # Distance-weighted averages
    total_dist = sum(s["distance_km"] for s in segments) or 1
    avg_factors = {}
    for key in WEIGHTS:
        avg_factors[key] = round(
            sum(s["factors"][key] * s["distance_km"] for s in segments) / total_dist
        )

    overall_tei = round(
        sum(s["tei"] * s["distance_km"] for s in segments) / total_dist
    )

    # Emission estimate
    avg_speed = 20 + (avg_factors["congestion"] / 100) * 40
    co2_per_km = _co2_from_speed(avg_speed)

    # Vehicle wear cost
    wear_per_km = _wear_cost(avg_factors["surface_quality"], avg_factors["pothole_density"])

    return {
        "overall_tei": overall_tei,
        "overall_grade": get_grade(overall_tei),
        "factors": avg_factors,
        "segments": segments,
        "total_distance": round(total_distance, 2),
        "emissions": {
            "co2_per_km": round(co2_per_km),
            "total_co2": round(co2_per_km * total_distance),
            "nox_per_km": round(co2_per_km * 0.005, 1),
            "avg_speed": round(avg_speed),
        },
        "wear_cost": {
            "per_km": round(wear_per_km, 1),
            "total": round(wear_per_km * total_distance),
        },
    }


def _co2_from_speed(speed):
    if speed < 20: return 280
    if speed < 30: return 220
    if speed < 40: return 180
    if speed < 50: return 160
    if speed < 60: return 150
    return 145


def _wear_cost(surface_score, pothole_score):
    base = 1.5
    surface_pen = ((100 - surface_score) / 100) * 3
    pothole_pen = ((100 - pothole_score) / 100) * 4
    return base + surface_pen + pothole_pen
