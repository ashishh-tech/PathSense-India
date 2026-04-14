"""
Pydantic models for request/response validation.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ══════════════════════════════════════════
#  Request Models
# ══════════════════════════════════════════

class RouteRequest(BaseModel):
    source_lat: float = Field(..., ge=-90, le=90)
    source_lng: float = Field(..., ge=-180, le=180)
    dest_lat: float = Field(..., ge=-90, le=90)
    dest_lng: float = Field(..., ge=-180, le=180)
    source_name: Optional[str] = ""
    dest_name: Optional[str] = ""


class ReportCreate(BaseModel):
    type: str = Field(..., pattern="^(pothole|damage|lighting|flooding|construction|other)$")
    severity: int = Field(3, ge=1, le=5)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    description: Optional[str] = ""


class ReportVote(BaseModel):
    vote: str = Field(..., pattern="^(up|down)$")


class NearbyQuery(BaseModel):
    lat: float
    lng: float
    radius_km: float = 5.0


# ══════════════════════════════════════════
#  Response Models
# ══════════════════════════════════════════

class FactorScores(BaseModel):
    congestion: float
    surface_quality: float
    pothole_density: float
    safety: float
    emission: float
    infrastructure: float
    comfort: float


class GradeInfo(BaseModel):
    grade: str
    label: str
    color: str
    score: int


class SegmentAnalysis(BaseModel):
    index: int
    name: str
    distance_km: float
    tei: int
    grade: GradeInfo
    factors: FactorScores
    issues: List[dict]
    start_coord: List[float]
    end_coord: List[float]


class EmissionData(BaseModel):
    co2_per_km: int
    total_co2: int
    nox_per_km: float
    avg_speed: int


class WearCost(BaseModel):
    per_km: float
    total: int


class RouteAnalysis(BaseModel):
    route_index: int
    name: str
    distance_km: float
    duration_min: float
    overall_tei: int
    overall_grade: GradeInfo
    factors: FactorScores
    emissions: EmissionData
    wear_cost: WearCost
    segments: List[SegmentAnalysis]
    coordinates: List[List[float]]


class ReportResponse(BaseModel):
    id: int
    type: str
    severity: int
    latitude: float
    longitude: float
    description: str
    created_at: str
    upvotes: int
    downvotes: int
    status: str


class HeatmapPoint(BaseModel):
    lat: float
    lng: float
    intensity: float


class StatsResponse(BaseModel):
    roads_analyzed: int
    potholes_reported: int
    active_contributors: int
    cities_covered: int
    total_reports: int
    avg_tei: float
    worst_zones: List[dict]
