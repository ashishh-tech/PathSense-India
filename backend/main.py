"""
PathSense India — FastAPI Backend
==================================
REST API for route analysis, TEI scoring, crowdsource reports, and heatmap data.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
from pathlib import Path

from database import init_db
from routes.api import router as api_router

app = FastAPI(
    title="PathSense India API",
    description="AI-powered Road Quality & Route Intelligence System — Backend API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ── CORS (allow frontend) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include API routes ──
app.include_router(api_router, prefix="/api")

# ── Startup event: initialize database ──
@app.on_event("startup")
async def startup():
    init_db()
    print("[START] PathSense India API started")
    print("[DOCS] Docs: http://localhost:8000/docs")


@app.get("/", tags=["Root"])
async def root():
    return {
        "name": "PathSense India API",
        "version": "1.0.0",
        "tagline": "Don't just navigate. Know your road.",
        "docs": "/docs",
        "endpoints": {
            "routes": "/api/routes",
            "tei": "/api/tei/analyze",
            "reports": "/api/reports",
            "heatmap": "/api/heatmap",
            "stats": "/api/stats"
        }
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
