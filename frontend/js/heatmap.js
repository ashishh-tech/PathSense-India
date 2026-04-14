/**
 * PathSense India — Heatmap Module
 * =================================
 * Road quality heatmap overlay using Leaflet.heat.
 * Fetches data from backend API and renders a gradient heatmap.
 */
(function () {
  'use strict';

  const Heatmap = {};

  let heatLayer = null;
  let reportClusterLayer = null;
  let isVisible = false;
  let cachedPoints = null;

  const API_BASE = window.PathSense.API_BASE || 'http://localhost:8000';

  /**
   * Initialize heatmap (load data from backend).
   */
  Heatmap.init = async function () {
    try {
      const resp = await fetch(`${API_BASE}/api/heatmap`);
      if (!resp.ok) throw new Error('Heatmap API unavailable');
      const data = await resp.json();
      cachedPoints = data.points || [];
      console.log(`🗺️ Loaded ${cachedPoints.length} heatmap points`);
    } catch (err) {
      console.warn('⚠️ Backend not available, using generated heatmap data');
      cachedPoints = _generateFallbackPoints();
    }
  };

  /**
   * Toggle heatmap visibility.
   */
  Heatmap.toggle = function () {
    if (isVisible) {
      Heatmap.hide();
    } else {
      Heatmap.show();
    }
    return isVisible;
  };

  /**
   * Show the heatmap overlay.
   */
  Heatmap.show = function () {
    const map = window.PathSense.Map.getMap();
    if (!map || !cachedPoints) return;

    if (heatLayer) {
      map.removeLayer(heatLayer);
    }

    // L.heatLayer from leaflet.heat plugin
    if (typeof L.heatLayer === 'function') {
      heatLayer = L.heatLayer(cachedPoints, {
        radius: 20,
        blur: 25,
        maxZoom: 15,
        max: 1.0,
        minOpacity: 0.3,
        gradient: {
          0.0: '#10b981',   // Green = good TEI (low heat = good road)
          0.25: '#34d399',
          0.4: '#fbbf24',   // Yellow = average
          0.6: '#f97316',   // Orange = poor
          0.8: '#ef4444',   // Red = bad
          1.0: '#991b1b',   // Dark red = dangerous
        }
      }).addTo(map);
    }

    isVisible = true;
  };

  /**
   * Hide the heatmap overlay.
   */
  Heatmap.hide = function () {
    const map = window.PathSense.Map.getMap();
    if (heatLayer && map) {
      map.removeLayer(heatLayer);
      heatLayer = null;
    }
    isVisible = false;
  };

  /**
   * Check if heatmap is currently visible.
   */
  Heatmap.isVisible = function () {
    return isVisible;
  };

  /**
   * Load and display crowdsource report markers from the backend.
   */
  Heatmap.loadReports = async function () {
    const map = window.PathSense.Map.getMap();
    if (!map) return;

    let reports = [];
    try {
      const resp = await fetch(`${API_BASE}/api/reports`);
      if (resp.ok) {
        const data = await resp.json();
        reports = data.reports || [];
      }
    } catch {
      console.warn('⚠️ Could not load reports from backend, using fallback');
      reports = _fallbackReports();
    }

    // Remove old markers
    if (reportClusterLayer) {
      map.removeLayer(reportClusterLayer);
    }

    // Create a layer group for report markers
    const markers = [];
    const typeEmoji = {
      pothole: '🕳️', damage: '🔨', lighting: '💡',
      flooding: '🌊', construction: '🚧', other: '⚠️'
    };
    const typeColors = {
      pothole: '#ef4444', damage: '#f59e0b', lighting: '#3b82f6',
      flooding: '#6366f1', construction: '#f97316', other: '#6b7280'
    };

    reports.forEach(function (r) {
      const color = typeColors[r.type] || '#6b7280';
      const emoji = typeEmoji[r.type] || '⚠️';

      const icon = L.divIcon({
        className: 'report-cluster-marker',
        html: '<div style="width:24px;height:24px;border-radius:50%;background:' + color +
              ';display:flex;align-items:center;justify-content:center;font-size:0.7rem;' +
              'box-shadow:0 2px 6px rgba(0,0,0,0.4);border:2px solid rgba(255,255,255,0.2);">' +
              emoji + '</div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const severity = r.severity || 3;
      const severityBar = '●'.repeat(severity) + '○'.repeat(5 - severity);
      const timeAgo = _timeAgo(r.created_at);

      const marker = L.marker([r.latitude, r.longitude], { icon: icon })
        .bindPopup(
          '<div class="segment-popup" style="padding:12px 16px;min-width:200px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
          '<strong style="font-size:0.85rem;">' + emoji + ' ' + _capitalize(r.type) + '</strong>' +
          '<span style="font-size:0.7rem;padding:2px 8px;border-radius:99px;background:' + color + '22;color:' + color + ';">' +
          severityBar + '</span></div>' +
          (r.description ? '<p style="font-size:0.75rem;color:var(--text-secondary);margin:4px 0 6px;">' + r.description + '</p>' : '') +
          '<div style="display:flex;justify-content:space-between;font-size:0.65rem;color:var(--text-muted);">' +
          '<span>📍 ' + r.latitude.toFixed(4) + ', ' + r.longitude.toFixed(4) + '</span>' +
          '<span>' + timeAgo + '</span></div>' +
          '<div style="display:flex;gap:8px;margin-top:8px;">' +
          '<button onclick="PathSense.Heatmap.vote(' + r.id + ',\'up\')" style="flex:1;padding:4px 8px;border-radius:6px;background:rgba(16,185,129,0.1);color:#10b981;font-size:0.7rem;font-weight:600;cursor:pointer;border:1px solid rgba(16,185,129,0.2);">👍 ' + (r.upvotes || 0) + '</button>' +
          '<button onclick="PathSense.Heatmap.vote(' + r.id + ',\'down\')" style="flex:1;padding:4px 8px;border-radius:6px;background:rgba(239,68,68,0.1);color:#ef4444;font-size:0.7rem;font-weight:600;cursor:pointer;border:1px solid rgba(239,68,68,0.2);">👎 ' + (r.downvotes || 0) + '</button>' +
          '</div></div>'
        );

      markers.push(marker);
    });

    reportClusterLayer = L.layerGroup(markers).addTo(map);

    console.log('📍 Loaded ' + reports.length + ' crowdsource reports on map');
    return reports.length;
  };

  /**
   * Vote on a report (upvote/downvote).
   */
  Heatmap.vote = async function (reportId, direction) {
    try {
      await fetch(API_BASE + '/api/reports/' + reportId + '/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote: direction }),
      });
      if (window.PathSense.App) {
        window.PathSense.App.showToast('success', 'Vote Recorded', 'Thank you for your feedback!');
      }
    } catch {
      if (window.PathSense.App) {
        window.PathSense.App.showToast('info', 'Offline', 'Vote will sync when backend is available.');
      }
    }
  };

  /**
   * Toggle report markers visibility.
   */
  Heatmap.toggleReports = function () {
    const map = window.PathSense.Map.getMap();
    if (!map || !reportClusterLayer) return false;

    if (map.hasLayer(reportClusterLayer)) {
      map.removeLayer(reportClusterLayer);
      return false;
    } else {
      map.addLayer(reportClusterLayer);
      return true;
    }
  };

  /**
   * Load platform stats from backend and update UI.
   */
  Heatmap.loadStats = async function () {
    try {
      const resp = await fetch(API_BASE + '/api/stats');
      if (!resp.ok) return;
      const data = await resp.json();
      const s = data.stats;

      const update = function (id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = (typeof val === 'number') ? val.toLocaleString() : val;
      };

      update('stat-roads', s.roads_analyzed);
      update('stat-potholes', s.potholes_reported);
      update('stat-users', s.active_contributors);
      update('stat-cities', s.cities_covered);
    } catch {
      // Fallback: keep default values
    }
  };


  /* ══════════════════════════════════════════
     Fallback Data (when backend is offline)
     ══════════════════════════════════════════ */

  function _generateFallbackPoints() {
    var points = [];
    var centerLat = 28.6139, centerLng = 77.2090;

    for (var i = 0; i < 400; i++) {
      var lat = centerLat + (Math.random() - 0.5) * 0.35;
      var lng = centerLng + (Math.random() - 0.5) * 0.45;
      var dist = Math.sqrt(Math.pow(lat - centerLat, 2) + Math.pow(lng - centerLng, 2));
      var intensity = Math.min(1, 0.2 + dist * 3 + Math.random() * 0.3);
      points.push([lat, lng, parseFloat(intensity.toFixed(2))]);
    }
    return points;
  }

  function _fallbackReports() {
    return [
      {id:1,type:"pothole",severity:4,latitude:28.6508,longitude:77.2313,description:"Large pothole near Chandni Chowk",created_at:"2026-04-10",upvotes:12,downvotes:1},
      {id:2,type:"flooding",severity:5,latitude:28.6358,longitude:77.2489,description:"Waterlogging near Yamuna bank",created_at:"2026-04-12",upvotes:8,downvotes:0},
      {id:3,type:"damage",severity:3,latitude:28.6127,longitude:77.2295,description:"Road surface crumbling near India Gate",created_at:"2026-04-11",upvotes:5,downvotes:2},
      {id:4,type:"lighting",severity:4,latitude:28.5245,longitude:77.1855,description:"Poor lighting near Qutub Minar",created_at:"2026-04-09",upvotes:15,downvotes:0},
      {id:5,type:"construction",severity:2,latitude:28.6350,longitude:77.2250,description:"Metro construction ongoing",created_at:"2026-04-13",upvotes:3,downvotes:1},
      {id:6,type:"pothole",severity:5,latitude:28.5672,longitude:77.2100,description:"Crater-sized pothole",created_at:"2026-04-08",upvotes:22,downvotes:0},
      {id:7,type:"pothole",severity:3,latitude:28.5446,longitude:77.1921,description:"Chain of potholes near Saket",created_at:"2026-04-10",upvotes:7,downvotes:1},
      {id:8,type:"other",severity:4,latitude:28.6519,longitude:77.2315,description:"Open manhole near Red Fort",created_at:"2026-04-11",upvotes:18,downvotes:0},
    ];
  }

  function _capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

  function _timeAgo(dateStr) {
    if (!dateStr) return '';
    try {
      var diff = Date.now() - new Date(dateStr).getTime();
      var days = Math.floor(diff / 86400000);
      if (days < 1) return 'Today';
      if (days === 1) return 'Yesterday';
      if (days < 7) return days + 'd ago';
      if (days < 30) return Math.floor(days / 7) + 'w ago';
      return Math.floor(days / 30) + 'mo ago';
    } catch { return ''; }
  }


  // Export
  window.PathSense = window.PathSense || {};
  window.PathSense.Heatmap = Heatmap;
})();
