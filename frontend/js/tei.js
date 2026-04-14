/**
 * PathSense India — TEI (Traffic Environment Index) Engine
 * ========================================================
 * Core scoring calculation & simulation engine.
 * TEI is a weighted composite score (0-100) quantifying road segment health.
 */
(function () {
  'use strict';

  const TEI = {};

  /* ── Factor weights (must sum to 1.0) ── */
  TEI.WEIGHTS = {
    congestion:     0.25,
    surfaceQuality: 0.20,
    potholeDensity: 0.15,
    safety:         0.15,
    emission:       0.10,
    infrastructure: 0.10,
    comfort:        0.05
  };

  /* ── Factor metadata ── */
  TEI.FACTORS = {
    congestion:     { name: 'Congestion',        icon: '🚗', color: '#3b82f6' },
    surfaceQuality: { name: 'Surface Quality',   icon: '🛣️', color: '#8b5cf6' },
    potholeDensity: { name: 'Pothole Density',   icon: '🕳️', color: '#f97316' },
    safety:         { name: 'Safety',            icon: '🛡️', color: '#10b981' },
    emission:       { name: 'Emission Impact',   icon: '🌿', color: '#06b6d4' },
    infrastructure: { name: 'Infrastructure',    icon: '🏗️', color: '#f59e0b' },
    comfort:        { name: 'Ride Comfort',      icon: '💺', color: '#ec4899' }
  };

  /* ── Grade scale ── */
  TEI.GRADES = [
    { min: 90, grade: 'A+', label: 'Excellent', color: '#10b981', bgColor: 'rgba(16,185,129,0.12)' },
    { min: 75, grade: 'A',  label: 'Good',      color: '#34d399', bgColor: 'rgba(52,211,153,0.12)' },
    { min: 60, grade: 'B',  label: 'Average',   color: '#fbbf24', bgColor: 'rgba(251,191,36,0.12)' },
    { min: 40, grade: 'C',  label: 'Poor',      color: '#f97316', bgColor: 'rgba(249,115,22,0.12)' },
    { min: 20, grade: 'D',  label: 'Bad',        color: '#ef4444', bgColor: 'rgba(239,68,68,0.12)' },
    { min: 0,  grade: 'F',  label: 'Dangerous', color: '#6b7280', bgColor: 'rgba(107,114,128,0.12)' }
  ];

  /**
   * Get grade info for a TEI score.
   */
  TEI.getGrade = function (score) {
    score = Math.round(Math.max(0, Math.min(100, score)));
    for (const g of TEI.GRADES) {
      if (score >= g.min) return { ...g, score };
    }
    return TEI.GRADES[TEI.GRADES.length - 1];
  };

  /**
   * Get interpolated color for a TEI score (for polylines).
   */
  TEI.getColor = function (score) {
    return TEI.getGrade(score).color;
  };

  /**
   * Calculate composite TEI score from individual factor scores.
   * @param {Object} factors - { congestion, surfaceQuality, potholeDensity, safety, emission, infrastructure, comfort }
   * @returns {number} TEI score 0-100
   */
  TEI.calculate = function (factors) {
    let total = 0;
    for (const [key, weight] of Object.entries(TEI.WEIGHTS)) {
      const value = factors[key] ?? 50;
      total += value * weight;
    }
    return Math.round(Math.max(0, Math.min(100, total)));
  };

  /**
   * Simulate realistic factor scores for a route segment.
   * Uses segment position, coordinates, and randomness to produce
   * realistic-looking scores for the hackathon demo.
   *
   * @param {Object} opts
   * @param {Array} opts.startCoord - [lat, lng]
   * @param {Array} opts.endCoord   - [lat, lng]
   * @param {number} opts.segmentIndex - position in route
   * @param {number} opts.totalSegments - total segments
   * @param {number} opts.routeVariant - route variant (0,1,2) for differentiation
   * @returns {Object} { factors, tei, grade }
   */
  TEI.simulateSegment = function (opts) {
    const { startCoord, endCoord, segmentIndex, totalSegments, routeVariant = 0 } = opts;

    // Delhi city center (reference point for urban/suburban classification)
    const delhiCenter = [28.6139, 77.2090];
    const midLat = (startCoord[0] + endCoord[0]) / 2;
    const midLng = (startCoord[1] + endCoord[1]) / 2;

    // Distance from city center (rough km)
    const distFromCenter = haversine(midLat, midLng, delhiCenter[0], delhiCenter[1]);

    // Urbanness factor (0 = rural, 1 = dense urban)
    const urbanness = Math.max(0, Math.min(1, 1 - (distFromCenter / 30)));

    // Segment position factor (0-1, middle segments tend to be worse)
    const positionFactor = segmentIndex / Math.max(1, totalSegments - 1);

    // Pseudo-random but deterministic based on coordinates
    const seed = Math.abs(Math.sin(midLat * 1000 + midLng * 2000 + segmentIndex * 100 + routeVariant * 50)) * 10000;
    const rand = (offset = 0) => {
      const s = Math.abs(Math.sin(seed + offset * 137.507)) * 10000;
      return s - Math.floor(s);
    };

    // Route variant adjustments (so different routes have different characteristics)
    const variantBonus = [0, -8, -15][routeVariant] || 0;
    const variantSpread = [1, 1.1, 0.9][routeVariant] || 1;

    // ── Generate individual factor scores ──

    // Congestion: worse near city center, random variation
    const congestion = clamp(
      (1 - urbanness * 0.6) * 100 - rand(1) * 25 + variantBonus * 0.5 + (1 - positionFactor) * 10,
      15, 98
    );

    // Surface Quality: generally worse in urban areas, random spots
    const surfaceQuality = clamp(
      65 + (1 - urbanness) * 20 - rand(2) * 30 + variantBonus * 0.7,
      20, 95
    );

    // Pothole Density: higher in urban areas, random hotspots
    const potholeDensity = clamp(
      70 - urbanness * 20 - rand(3) * 35 + (rand(4) > 0.7 ? -25 : 0) + variantBonus * 0.6,
      10, 95
    );

    // Safety: moderate everywhere, slightly better on highways
    const safety = clamp(
      60 + (1 - urbanness) * 15 + rand(5) * 20 - 10 + variantBonus * 0.4,
      25, 95
    );

    // Emission: correlated with congestion
    const emission = clamp(
      congestion * 0.7 + rand(6) * 25 + variantBonus * 0.3,
      20, 95
    );

    // Infrastructure: better near city center
    const infrastructure = clamp(
      55 + urbanness * 25 - rand(7) * 20 + variantBonus * 0.3,
      30, 95
    );

    // Comfort: mix of surface quality and infrastructure
    const comfort = clamp(
      (surfaceQuality * 0.5 + infrastructure * 0.3 + rand(8) * 20) * variantSpread,
      15, 95
    );

    const factors = {
      congestion: Math.round(congestion),
      surfaceQuality: Math.round(surfaceQuality),
      potholeDensity: Math.round(potholeDensity),
      safety: Math.round(safety),
      emission: Math.round(emission),
      infrastructure: Math.round(infrastructure),
      comfort: Math.round(comfort)
    };

    const tei = TEI.calculate(factors);
    const grade = TEI.getGrade(tei);

    // Determine issues for this segment
    const issues = [];
    if (potholeDensity < 40) issues.push({ type: 'pothole', severity: potholeDensity < 25 ? 'high' : 'medium' });
    if (congestion < 35) issues.push({ type: 'congestion', severity: 'high' });
    if (safety < 40) issues.push({ type: 'safety', severity: safety < 25 ? 'high' : 'medium' });
    if (surfaceQuality < 35) issues.push({ type: 'surface', severity: 'high' });

    return { factors, tei, grade, issues };
  };

  /**
   * Analyze an entire route, dividing it into segments and scoring each.
   * @param {Array} coordinates - Array of [lat, lng] coordinates from OSRM
   * @param {number} routeVariant - Route variant index (0,1,2)
   * @returns {Object} { segments, overallTEI, overallGrade, totalDistance, factors }
   */
  TEI.analyzeRoute = function (coordinates, routeVariant = 0) {
    // Determine number of segments based on route length
    const totalDistance = calculateRouteDistance(coordinates);
    const numSegments = Math.max(3, Math.min(12, Math.round(totalDistance / 2)));

    // Divide coordinates into segments
    const segments = [];
    const segLen = Math.floor(coordinates.length / numSegments);

    for (let i = 0; i < numSegments; i++) {
      const startIdx = i * segLen;
      const endIdx = i === numSegments - 1 ? coordinates.length - 1 : (i + 1) * segLen;
      const segCoords = coordinates.slice(startIdx, endIdx + 1);

      const startCoord = segCoords[0];
      const endCoord = segCoords[segCoords.length - 1];

      const analysis = TEI.simulateSegment({
        startCoord,
        endCoord,
        segmentIndex: i,
        totalSegments: numSegments,
        routeVariant
      });

      const segDistance = calculateRouteDistance(segCoords);

      segments.push({
        index: i,
        name: `Segment ${i + 1}`,
        coordinates: segCoords,
        startCoord,
        endCoord,
        distance: segDistance,
        ...analysis
      });
    }

    // Calculate overall TEI (distance-weighted average)
    let weightedSum = 0;
    let totalDist = 0;
    const avgFactors = {};

    for (const key of Object.keys(TEI.WEIGHTS)) {
      avgFactors[key] = 0;
    }

    for (const seg of segments) {
      weightedSum += seg.tei * seg.distance;
      totalDist += seg.distance;

      for (const key of Object.keys(TEI.WEIGHTS)) {
        avgFactors[key] += seg.factors[key] * seg.distance;
      }
    }

    for (const key of Object.keys(avgFactors)) {
      avgFactors[key] = Math.round(avgFactors[key] / totalDist);
    }

    const overallTEI = Math.round(weightedSum / totalDist);
    const overallGrade = TEI.getGrade(overallTEI);

    // Estimate emissions (g CO2 per km based on congestion)
    const avgSpeed = 20 + (avgFactors.congestion / 100) * 40; // 20-60 km/h
    const co2PerKm = estimateCO2(avgSpeed);
    const totalCO2 = co2PerKm * totalDistance;

    // Vehicle wear cost estimation (INR per km)
    const wearCostPerKm = estimateWearCost(avgFactors.surfaceQuality, avgFactors.potholeDensity);
    const totalWearCost = wearCostPerKm * totalDistance;

    return {
      segments,
      overallTEI,
      overallGrade,
      totalDistance,
      factors: avgFactors,
      emissions: {
        co2PerKm: Math.round(co2PerKm),
        totalCO2: Math.round(totalCO2),
        avgSpeed: Math.round(avgSpeed),
        noxPerKm: Math.round(co2PerKm * 0.005 * 10) / 10
      },
      wearCost: {
        perKm: Math.round(wearCostPerKm * 10) / 10,
        total: Math.round(totalWearCost)
      }
    };
  };


  /* ══════════════════════════════════════════
     Helper Functions
     ══════════════════════════════════════════ */

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  /**
   * Haversine distance in km between two points.
   */
  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function toRad(deg) { return deg * Math.PI / 180; }

  /**
   * Calculate total distance of a coordinate array in km.
   */
  function calculateRouteDistance(coords) {
    let total = 0;
    for (let i = 1; i < coords.length; i++) {
      total += haversine(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
    }
    return total;
  }

  /**
   * Estimate CO2 emissions (g/km) based on average speed.
   * Lower speed = more stop-and-go = higher emissions.
   */
  function estimateCO2(avgSpeed) {
    // Typical petrol car emission curve
    if (avgSpeed < 20) return 280;
    if (avgSpeed < 30) return 220;
    if (avgSpeed < 40) return 180;
    if (avgSpeed < 50) return 160;
    if (avgSpeed < 60) return 150;
    return 145;
  }

  /**
   * Estimate vehicle wear cost (INR/km) based on surface and pothole scores.
   */
  function estimateWearCost(surfaceScore, potholeScore) {
    const baseRate = 1.5; // INR/km on perfect road
    const surfacePenalty = ((100 - surfaceScore) / 100) * 3;
    const potholePenalty = ((100 - potholeScore) / 100) * 4;
    return baseRate + surfacePenalty + potholePenalty;
  }

  // Export to global namespace
  window.PathSense = window.PathSense || {};
  window.PathSense.TEI = TEI;
})();
