/**
 * PathSense India — Map Module (Enhanced)
 * ========================================
 * Multiple tile layers, animated markers, route flow effects, layer switcher.
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
  let currentBaselayer = null;

  /* ── Tile layer providers ── */
  const TILES = {
    'OSM Detailed': {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      options: { maxZoom: 19 }
    },
    'Voyager': {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      options: { subdomains: 'abcd', maxZoom: 19 }
    },
    'Voyager Labels': {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png',
      attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      options: { subdomains: 'abcd', maxZoom: 19 }
    },
    'Dark Mode': {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      options: { subdomains: 'abcd', maxZoom: 19 }
    },
    'Satellite': {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attr: 'Tiles &copy; Esri, Maxar, Earthstar Geographics',
      options: { maxZoom: 18 }
    },
    'Terrain': {
      url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png',
      attr: 'Map tiles by <a href="http://stamen.com">Stamen</a>, <a href="http://openstreetmap.org">OSM</a>',
      options: { subdomains: 'abcd', maxZoom: 18 }
    }
  };

  /**
   * Initialize the Leaflet map with multiple base layers and layer control.
   */
  MapModule.init = function () {
    map = L.map('map', {
      center: [28.6139, 77.2090],
      zoom: 12,
      zoomControl: false,
      attributionControl: true,
      minZoom: 5,
      maxZoom: 18,
      zoomAnimation: true,
      fadeAnimation: true
    });

    // Build base layers for the layer control
    var baseLayers = {};
    var defaultLayer = null;

    for (var name in TILES) {
      var t = TILES[name];
      var layer = L.tileLayer(t.url, { attribution: t.attr, ...t.options });
      baseLayers[name] = layer;
      if (name === 'Voyager Labels') {
        defaultLayer = layer;
      }
    }

    // Add default layer
    defaultLayer.addTo(map);
    currentBaselayer = 'Voyager Labels';

    // Add zoom control (bottom-right)
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Add layer control (top-right with custom styling)
    var layerControl = L.control.layers(baseLayers, null, {
      position: 'topright',
      collapsed: true
    }).addTo(map);

    // Track layer changes
    map.on('baselayerchange', function (e) {
      currentBaselayer = e.name;
      // Adjust popup styling based on dark/light mode
      var isDark = (e.name === 'Dark Mode');
      document.body.classList.toggle('map-dark-mode', isDark);
    });

    // Add a scale control
    L.control.scale({
      position: 'bottomleft',
      imperial: false,
      maxWidth: 150
    }).addTo(map);

    return map;
  };

  /**
   * Get the Leaflet map instance.
   */
  MapModule.getMap = function () {
    return map;
  };

  /**
   * Get current base layer name.
   */
  MapModule.getCurrentLayer = function () {
    return currentBaselayer;
  };

  /**
   * Set source marker with pulsing animation.
   */
  MapModule.setSourceMarker = function (lat, lng, name) {
    if (sourceMarker) map.removeLayer(sourceMarker);

    var icon = L.divIcon({
      className: 'ps-marker-source',
      html: '<div class="ps-marker-pulse ps-pulse-green"></div>' +
            '<div class="ps-marker-pin ps-pin-green">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>' +
            '</div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    sourceMarker = L.marker([lat, lng], { icon: icon, zIndexOffset: 1000 })
      .addTo(map)
      .bindTooltip(name || 'Source', {
        className: 'ps-tooltip ps-tooltip-green',
        direction: 'top',
        offset: [0, -24],
        permanent: false
      });

    return sourceMarker;
  };

  /**
   * Set destination marker with pulsing animation.
   */
  MapModule.setDestMarker = function (lat, lng, name) {
    if (destMarker) map.removeLayer(destMarker);

    var icon = L.divIcon({
      className: 'ps-marker-dest',
      html: '<div class="ps-marker-pulse ps-pulse-cyan"></div>' +
            '<div class="ps-marker-pin ps-pin-cyan">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
            '</div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    destMarker = L.marker([lat, lng], { icon: icon, zIndexOffset: 1000 })
      .addTo(map)
      .bindTooltip(name || 'Destination', {
        className: 'ps-tooltip ps-tooltip-cyan',
        direction: 'top',
        offset: [0, -24],
        permanent: false
      });

    return destMarker;
  };

  /**
   * Clear all routes from the map.
   */
  MapModule.clearRoutes = function () {
    routeLayers.forEach(function (l) { map.removeLayer(l); });
    segmentLayers.forEach(function (l) { map.removeLayer(l); });
    routeLayers = [];
    segmentLayers = [];
  };

  /**
   * Clear all markers.
   */
  MapModule.clearMarkers = function () {
    if (sourceMarker) { map.removeLayer(sourceMarker); sourceMarker = null; }
    if (destMarker) { map.removeLayer(destMarker); destMarker = null; }
    markerLayers.forEach(function (l) { map.removeLayer(l); });
    markerLayers = [];
  };

  /**
   * Draw a route polyline with outline and optional dash animation.
   */
  MapModule.drawRoute = function (coordinates, color, isSelected, routeIndex) {
    // Shadow / glow outline
    var shadow = L.polyline(coordinates, {
      color: '#000',
      weight: isSelected ? 12 : 7,
      opacity: isSelected ? 0.25 : 0.1,
      smoothFactor: 1.5,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Color outline
    var outline = L.polyline(coordinates, {
      color: color,
      weight: isSelected ? 9 : 5,
      opacity: isSelected ? 0.35 : 0.15,
      smoothFactor: 1.5,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Main route line
    var line = L.polyline(coordinates, {
      color: color,
      weight: isSelected ? 5 : 3,
      opacity: isSelected ? 1 : 0.55,
      smoothFactor: 1.5,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: isSelected ? null : '10 8',
      className: isSelected ? 'route-line-selected' : 'route-line-alt'
    }).addTo(map);

    // Animated flow overlay for selected route
    if (isSelected) {
      var flowLine = L.polyline(coordinates, {
        color: '#ffffff',
        weight: 2,
        opacity: 0.6,
        smoothFactor: 1.5,
        lineCap: 'round',
        dashArray: '6 18',
        className: 'route-flow-animated'
      }).addTo(map);
      routeLayers.push(flowLine);
    }

    // Click handler
    var clickHandler = function () {
      if (window.PathSense.App && window.PathSense.App.selectRoute) {
        window.PathSense.App.selectRoute(routeIndex);
      }
    };
    line.on('click', clickHandler);
    outline.on('click', clickHandler);

    // Hover cursor
    line.on('mouseover', function () {
      line.getElement && line.getElement() && (line.getElement().style.cursor = 'pointer');
    });

    routeLayers.push(shadow, outline, line);
    return { shadow: shadow, outline: outline, line: line };
  };

  /**
   * Draw color-coded TEI segments for the selected route.
   */
  MapModule.drawSegments = function (segments) {
    segmentLayers.forEach(function (l) { map.removeLayer(l); });
    segmentLayers = [];

    segments.forEach(function (seg, idx) {
      var color = window.PathSense.TEI.getColor(seg.tei);

      // Glow underlay
      var glow = L.polyline(seg.coordinates, {
        color: color,
        weight: 14,
        opacity: 0.15,
        smoothFactor: 1.5,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Segment line
      var line = L.polyline(seg.coordinates, {
        color: color,
        weight: 6,
        opacity: 0.9,
        smoothFactor: 1.5,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Border line for contrast on light maps
      var border = L.polyline(seg.coordinates, {
        color: '#000',
        weight: 8,
        opacity: 0.12,
        smoothFactor: 1.5,
        lineCap: 'round',
        lineJoin: 'round'
      });
      border.addTo(map);
      border.bringToBack();

      // Popup on click
      line.on('click', function (e) {
        var popup = createSegmentPopup(seg);
        L.popup({
          maxWidth: 320,
          closeButton: true,
          className: 'ps-segment-popup'
        })
        .setLatLng(e.latlng)
        .setContent(popup)
        .openOn(map);
      });

      // Hover effects
      line.on('mouseover', function () {
        line.setStyle({ weight: 8, opacity: 1 });
        glow.setStyle({ weight: 18, opacity: 0.3 });
      });
      line.on('mouseout', function () {
        line.setStyle({ weight: 6, opacity: 0.9 });
        glow.setStyle({ weight: 14, opacity: 0.15 });
      });

      // TEI label at segment midpoint
      if (seg.coordinates.length > 2) {
        var midIdx = Math.floor(seg.coordinates.length / 2);
        var midCoord = seg.coordinates[midIdx];
        var teiLabel = L.divIcon({
          className: 'ps-tei-label',
          html: '<div class="ps-tei-badge" style="background:' + color + ';box-shadow:0 2px 8px ' + color + '44;">' + seg.tei + '</div>',
          iconSize: [32, 20],
          iconAnchor: [16, 10]
        });
        var labelMarker = L.marker(midCoord, { icon: teiLabel, interactive: false, zIndexOffset: 500 }).addTo(map);
        segmentLayers.push(labelMarker);
      }

      segmentLayers.push(border, glow, line);
    });
  };

  /**
   * Add a report marker to the map.
   */
  MapModule.addReportMarker = function (lat, lng, type, severity) {
    var typeEmoji = {
      pothole: '🕳️', damage: '🔨', lighting: '💡',
      flooding: '🌊', construction: '🚧', other: '⚠️'
    };
    var typeColors = {
      pothole: '#ef4444', damage: '#f59e0b', lighting: '#3b82f6',
      flooding: '#6366f1', construction: '#f97316', other: '#6b7280'
    };

    var color = typeColors[type] || '#6b7280';
    var icon = L.divIcon({
      className: 'ps-report-marker',
      html: '<div class="ps-report-pin" style="background:' + color + ';box-shadow:0 2px 10px ' + color + '66;">' +
            '<span>' + (typeEmoji[type] || '⚠️') + '</span></div>' +
            '<div class="ps-report-stem" style="background:' + color + ';"></div>',
      iconSize: [30, 42],
      iconAnchor: [15, 42]
    });

    var marker = L.marker([lat, lng], { icon: icon })
      .addTo(map)
      .bindPopup(
        '<div style="padding:10px 14px;min-width:180px;">' +
        '<strong style="font-size:0.85rem;">' + (typeEmoji[type] || '⚠️') + ' ' +
        type.charAt(0).toUpperCase() + type.slice(1) + '</strong><br>' +
        '<span style="font-size:0.75rem;color:#666;">Severity: ' +
        '●'.repeat(severity) + '○'.repeat(5 - severity) + '</span></div>'
      );

    reportMarkers.push(marker);
    return marker;
  };

  /**
   * Fit bounds to show all routes.
   */
  MapModule.fitBounds = function (coordinates) {
    if (!coordinates || coordinates.length === 0) return;
    var allCoords = coordinates.flat ? coordinates.flat() : coordinates;
    if (allCoords.length === 0) return;
    var bounds = L.latLngBounds(allCoords);
    map.fitBounds(bounds, {
      padding: [80, 420],
      maxZoom: 15,
      animate: true,
      duration: 0.8
    });
  };

  /**
   * Focus on a specific segment.
   */
  MapModule.focusSegment = function (segment) {
    var bounds = L.latLngBounds(segment.coordinates);
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

  function createSegmentPopup(seg) {
    var TEI = window.PathSense.TEI;
    var grade = seg.grade;
    var factors = seg.factors;

    var factorsHTML = '';
    for (var _entry of Object.entries(TEI.FACTORS)) {
      var key = _entry[0], meta = _entry[1];
      var val = factors[key] || 0;
      var color = TEI.getColor(val);
      factorsHTML +=
        '<div style="display:flex;align-items:center;gap:8px;margin:3px 0;">' +
        '<span style="width:20px;text-align:center;font-size:0.75rem;">' + meta.icon + '</span>' +
        '<span style="flex:1;min-width:70px;font-size:0.72rem;color:#555;">' + meta.name + '</span>' +
        '<div style="flex:2;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;">' +
        '<div style="width:' + val + '%;height:100%;background:' + color + ';border-radius:3px;transition:width 0.4s;"></div></div>' +
        '<span style="width:26px;text-align:right;font-size:0.72rem;font-weight:600;color:' + color + ';">' + val + '</span>' +
        '</div>';
    }

    var issuesHTML = '';
    if (seg.issues && seg.issues.length > 0) {
      issuesHTML = '<div style="margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;">' +
        '<span style="font-size:0.65rem;color:#999;text-transform:uppercase;letter-spacing:0.05em;">Issues:</span> ' +
        seg.issues.map(function (i) {
          return '<span style="display:inline-block;margin:2px 4px 0 0;font-size:0.65rem;padding:2px 8px;border-radius:99px;background:rgba(239,68,68,0.08);color:#ef4444;">' + i.type + '</span>';
        }).join('') +
        '</div>';
    }

    return '<div style="padding:12px 16px;min-width:260px;font-family:Inter,system-ui,sans-serif;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
      '<span style="font-weight:700;font-size:0.85rem;color:#1f2937;">' + seg.name + '</span>' +
      '<span style="font-size:1.1rem;font-weight:800;color:' + grade.color + ';">' + seg.tei + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:10px;margin-bottom:8px;font-size:0.7rem;color:#6b7280;">' +
      '<span>📏 ' + seg.distance.toFixed(1) + ' km</span>' +
      '<span style="padding:1px 8px;border-radius:99px;background:' + grade.color + '18;color:' + grade.color + ';font-weight:600;">' + grade.grade + ' — ' + grade.label + '</span>' +
      '</div>' +
      '<div>' + factorsHTML + '</div>' +
      issuesHTML +
      '</div>';
  }


  // Export
  window.PathSense = window.PathSense || {};
  window.PathSense.Map = MapModule;
})();
