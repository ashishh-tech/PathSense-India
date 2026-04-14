/**
 * PathSense India — Map Module
 * ============================
 * Leaflet map initialization, tile layers, markers, and route rendering.
 */
(function () {
  'use strict';

  const MapModule = {};

  let map = null;
  let routeLayers = [];
  let markerLayers = [];
  let segmentLayers = [];
  let sourceMarker = null;
  let destMarker = null;
  let reportMarkers = [];

  /* ── Dark map tile providers ── */
  const TILE_URLS = {
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    darkNolabel: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
    voyager: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
  };

  const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

  /**
   * Initialize the Leaflet map.
   */
  MapModule.init = function () {
    map = L.map('map', {
      center: [28.6139, 77.2090], // Delhi center
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
      minZoom: 5,
      maxZoom: 18
    });

    // Add dark tile layer
    L.tileLayer(TILE_URLS.dark, {
      attribution: TILE_ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    // Move zoom control to bottom-right
    map.zoomControl.setPosition('bottomright');

    return map;
  };

  /**
   * Get the Leaflet map instance.
   */
  MapModule.getMap = function () {
    return map;
  };

  /**
   * Set source marker on the map.
   */
  MapModule.setSourceMarker = function (lat, lng, name) {
    if (sourceMarker) map.removeLayer(sourceMarker);

    const icon = L.divIcon({
      className: 'marker-source marker-animated',
      html: '<div style="width:28px;height:28px;border-radius:50%;background:#10b981;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;color:#050a18;box-shadow:0 0 12px rgba(16,185,129,0.5);">S</div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    sourceMarker = L.marker([lat, lng], { icon })
      .addTo(map)
      .bindTooltip(name || 'Source', {
        className: 'custom-tooltip',
        direction: 'top',
        offset: [0, -18]
      });

    return sourceMarker;
  };

  /**
   * Set destination marker on the map.
   */
  MapModule.setDestMarker = function (lat, lng, name) {
    if (destMarker) map.removeLayer(destMarker);

    const icon = L.divIcon({
      className: 'marker-dest marker-animated',
      html: '<div style="width:28px;height:28px;border-radius:50%;background:#06b6d4;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;color:#050a18;box-shadow:0 0 12px rgba(6,182,212,0.5);">D</div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    destMarker = L.marker([lat, lng], { icon })
      .addTo(map)
      .bindTooltip(name || 'Destination', {
        className: 'custom-tooltip',
        direction: 'top',
        offset: [0, -18]
      });

    return destMarker;
  };

  /**
   * Clear all routes from the map.
   */
  MapModule.clearRoutes = function () {
    routeLayers.forEach(l => map.removeLayer(l));
    segmentLayers.forEach(l => map.removeLayer(l));
    routeLayers = [];
    segmentLayers = [];
  };

  /**
   * Clear all markers.
   */
  MapModule.clearMarkers = function () {
    if (sourceMarker) { map.removeLayer(sourceMarker); sourceMarker = null; }
    if (destMarker) { map.removeLayer(destMarker); destMarker = null; }
    markerLayers.forEach(l => map.removeLayer(l));
    markerLayers = [];
  };

  /**
   * Draw a full route as a background outline.
   * @param {Array} coordinates - [[lat, lng], ...]
   * @param {string} color - CSS color
   * @param {boolean} isSelected - Whether this is the selected route
   * @param {number} routeIndex - Route index for click handling
   */
  MapModule.drawRoute = function (coordinates, color, isSelected, routeIndex) {
    // Background outline (thicker, semi-transparent)
    const outline = L.polyline(coordinates, {
      color: color,
      weight: isSelected ? 8 : 5,
      opacity: isSelected ? 0.3 : 0.15,
      smoothFactor: 1.5,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Main route line
    const line = L.polyline(coordinates, {
      color: color,
      weight: isSelected ? 5 : 3,
      opacity: isSelected ? 0.9 : 0.5,
      smoothFactor: 1.5,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: isSelected ? null : '8 6'
    }).addTo(map);

    // Click handler
    line.on('click', function () {
      if (window.PathSense.App && window.PathSense.App.selectRoute) {
        window.PathSense.App.selectRoute(routeIndex);
      }
    });

    outline.on('click', function () {
      if (window.PathSense.App && window.PathSense.App.selectRoute) {
        window.PathSense.App.selectRoute(routeIndex);
      }
    });

    routeLayers.push(outline, line);
    return { outline, line };
  };

  /**
   * Draw color-coded segments on the map for the selected route.
   * @param {Array} segments - Array of segment objects with coordinates and TEI scores
   */
  MapModule.drawSegments = function (segments) {
    // Remove old segments
    segmentLayers.forEach(l => map.removeLayer(l));
    segmentLayers = [];

    segments.forEach((seg, idx) => {
      const color = window.PathSense.TEI.getColor(seg.tei);

      // Segment polyline
      const line = L.polyline(seg.coordinates, {
        color: color,
        weight: 6,
        opacity: 0.85,
        smoothFactor: 1.5,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Glow effect
      const glow = L.polyline(seg.coordinates, {
        color: color,
        weight: 12,
        opacity: 0.2,
        smoothFactor: 1.5,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Popup on click
      line.on('click', function (e) {
        const popup = createSegmentPopup(seg);
        L.popup({
          maxWidth: 300,
          closeButton: true,
          className: 'segment-popup-container'
        })
        .setLatLng(e.latlng)
        .setContent(popup)
        .openOn(map);
      });

      // Hover effect
      line.on('mouseover', function () {
        line.setStyle({ weight: 8, opacity: 1 });
        glow.setStyle({ weight: 16, opacity: 0.35 });
      });

      line.on('mouseout', function () {
        line.setStyle({ weight: 6, opacity: 0.85 });
        glow.setStyle({ weight: 12, opacity: 0.2 });
      });

      segmentLayers.push(line, glow);
    });
  };

  /**
   * Add a report marker to the map.
   */
  MapModule.addReportMarker = function (lat, lng, type, severity) {
    const typeEmoji = {
      pothole: '🕳️', damage: '🔨', lighting: '💡',
      flooding: '🌊', construction: '🚧', other: '⚠️'
    };
    const typeColors = {
      pothole: '#ef4444', damage: '#f59e0b', lighting: '#3b82f6',
      flooding: '#6366f1', construction: '#f97316', other: '#6b7280'
    };

    const icon = L.divIcon({
      className: 'marker-report marker-animated',
      html: `<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${typeColors[type] || '#6b7280'};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4);"><span style="transform:rotate(45deg);font-size:0.85rem;">${typeEmoji[type] || '⚠️'}</span></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    const marker = L.marker([lat, lng], { icon })
      .addTo(map)
      .bindPopup(`<div class="segment-popup" style="padding:12px 16px;"><strong>${type.charAt(0).toUpperCase() + type.slice(1)}</strong><br><span style="color:var(--text-secondary);font-size:0.8rem;">Severity: ${'●'.repeat(severity)}${'○'.repeat(5 - severity)}</span></div>`);

    reportMarkers.push(marker);
    return marker;
  };

  /**
   * Fit map bounds to show all routes.
   */
  MapModule.fitBounds = function (coordinates) {
    if (!coordinates || coordinates.length === 0) return;

    const allCoords = coordinates.flat ? coordinates.flat() : coordinates;
    if (allCoords.length === 0) return;

    // Check if it's array of coordinate arrays or flat
    const bounds = L.latLngBounds(allCoords);
    map.fitBounds(bounds, {
      padding: [80, 420], // Account for side panels
      maxZoom: 15,
      animate: true,
      duration: 0.8
    });
  };

  /**
   * Focus on a specific segment.
   */
  MapModule.focusSegment = function (segment) {
    const bounds = L.latLngBounds(segment.coordinates);
    map.fitBounds(bounds, {
      padding: [100, 200],
      maxZoom: 16,
      animate: true,
      duration: 0.5
    });
  };


  /* ══════════════════════════════════════════
     Private Helpers
     ══════════════════════════════════════════ */

  /**
   * Create popup HTML for a segment.
   */
  function createSegmentPopup(seg) {
    const TEI = window.PathSense.TEI;
    const grade = seg.grade;
    const factors = seg.factors;

    let factorsHTML = '';
    for (const [key, meta] of Object.entries(TEI.FACTORS)) {
      const val = factors[key] || 0;
      const color = TEI.getColor(val);
      factorsHTML += `
        <div class="segment-popup-factor">
          <span class="segment-popup-factor-name">${meta.icon} ${meta.name}</span>
          <div class="segment-popup-factor-bar">
            <div class="segment-popup-factor-fill" style="width:${val}%;background:${color};"></div>
          </div>
          <span class="segment-popup-factor-value" style="color:${color};">${val}</span>
        </div>`;
    }

    let issuesHTML = '';
    if (seg.issues && seg.issues.length > 0) {
      issuesHTML = `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06);">
        <span style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">Issues:</span>
        ${seg.issues.map(i => `<span style="display:inline-block;margin:2px 4px 0 0;font-size:0.7rem;padding:2px 8px;border-radius:99px;background:rgba(239,68,68,0.1);color:#ef4444;">${i.type}</span>`).join('')}
      </div>`;
    }

    return `
      <div class="segment-popup">
        <div class="segment-popup-header">
          <span class="segment-popup-name">${seg.name}</span>
          <span class="segment-popup-score" style="color:${grade.color};">${seg.tei}</span>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:8px;font-size:0.75rem;color:var(--text-muted);">
          <span>📏 ${seg.distance.toFixed(1)} km</span>
          <span style="padding:1px 8px;border-radius:99px;background:${grade.bgColor};color:${grade.color};font-weight:600;">${grade.grade} — ${grade.label}</span>
        </div>
        <div class="segment-popup-factors">${factorsHTML}</div>
        ${issuesHTML}
      </div>`;
  }


  // Export
  window.PathSense = window.PathSense || {};
  window.PathSense.Map = MapModule;
})();
