/**
 * PathSense India — Map Module (Google-Quality Enhanced)
 * ======================================================
 * Premium map with multiple high-quality tile layers, animated markers,
 * traffic flow effects, mini-map, and GIS-level features.
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
  let currentBaselayer = 'Streets';
  let miniMap = null;

  /* ── High-quality tile providers (Google Maps level) ── */
  const TILES = {
    'Streets': {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png',
      attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      options: { subdomains: 'abcd', maxZoom: 20 }
    },
    'Detailed OSM': {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      options: { maxZoom: 19 }
    },
    'Light': {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      options: { subdomains: 'abcd', maxZoom: 20 }
    },
    'Dark': {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      options: { subdomains: 'abcd', maxZoom: 20 }
    },
    'Satellite': {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attr: 'Tiles &copy; Esri, Maxar, Earthstar Geographics',
      options: { maxZoom: 18 }
    },
    'Hybrid': {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attr: 'Tiles &copy; Esri, Maxar',
      options: { maxZoom: 18 },
      overlay: {
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
        attr: '&copy; CARTO',
        options: { subdomains: 'abcd', maxZoom: 20, pane: 'overlayPane' }
      }
    },
    'Topo': {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      attr: 'Tiles &copy; Esri, DeLorme, USGS',
      options: { maxZoom: 18 }
    }
  };

  let hybridOverlay = null;

  /**
   * Initialize the Leaflet map with Google-level quality.
   */
  MapModule.init = function () {
    map = L.map('map', {
      center: [28.6139, 77.2090],
      zoom: 12,
      zoomControl: false,
      attributionControl: true,
      minZoom: 4,
      maxZoom: 19,
      zoomAnimation: true,
      fadeAnimation: true,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 120
    });

    // Build base layers
    var baseLayers = {};
    var defaultLayer = null;

    for (var name in TILES) {
      if (name === 'Hybrid') continue; // Special handling
      var t = TILES[name];
      var layer = L.tileLayer(t.url, { attribution: t.attr, ...t.options });
      baseLayers[name] = layer;
      if (name === 'Streets') defaultLayer = layer;
    }

    // Hybrid layer (satellite + labels overlay)
    var hybridConfig = TILES['Hybrid'];
    var hybridBase = L.tileLayer(hybridConfig.url, { attribution: hybridConfig.attr, ...hybridConfig.options });
    baseLayers['Hybrid'] = hybridBase;

    // Add default
    defaultLayer.addTo(map);

    // Zoom control bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Layer control
    var layerControl = L.control.layers(baseLayers, null, {
      position: 'topright',
      collapsed: true
    }).addTo(map);

    // Handle hybrid overlay on layer change
    map.on('baselayerchange', function (e) {
      currentBaselayer = e.name;
      // Remove old hybrid overlay
      if (hybridOverlay) {
        map.removeLayer(hybridOverlay);
        hybridOverlay = null;
      }
      // Add labels overlay for hybrid mode
      if (e.name === 'Hybrid') {
        hybridOverlay = L.tileLayer(
          hybridConfig.overlay.url,
          { attribution: hybridConfig.overlay.attr, ...hybridConfig.overlay.options }
        ).addTo(map);
      }
      // Toggle dark mode class
      var isDark = (e.name === 'Dark');
      document.body.classList.toggle('map-dark-mode', isDark);
    });

    // Scale control
    L.control.scale({ position: 'bottomleft', imperial: false, maxWidth: 150 }).addTo(map);

    // Locate control (GPS button)
    _addLocateControl();

    // Minimap
    _addMiniMap();

    // Coordinates display
    _addCoordDisplay();

    return map;
  };

  /**
   * Add GPS locate button.
   */
  function _addLocateControl() {
    var LocateControl = L.Control.extend({
      options: { position: 'bottomright' },
      onAdd: function () {
        var btn = L.DomUtil.create('div', 'leaflet-bar ps-locate-btn');
        btn.innerHTML = '<a href="#" title="My Location"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg></a>';
        btn.onclick = function (e) {
          e.preventDefault();
          e.stopPropagation();
          map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true });
        };
        L.DomEvent.disableClickPropagation(btn);
        return btn;
      }
    });
    new LocateControl().addTo(map);

    // Handle location found
    map.on('locationfound', function (e) {
      L.circleMarker(e.latlng, {
        radius: 8, color: '#4285f4', fillColor: '#4285f4',
        fillOpacity: 0.9, weight: 3, opacity: 1
      }).addTo(map).bindPopup('You are here').openPopup();
      // Accuracy circle
      L.circle(e.latlng, {
        radius: e.accuracy / 2, color: '#4285f4',
        fillColor: '#4285f4', fillOpacity: 0.08, weight: 1
      }).addTo(map);
    });
  }

  /**
   * Add mini overview map (bottom-left).
   */
  function _addMiniMap() {
    var MiniMapControl = L.Control.extend({
      options: { position: 'bottomleft' },
      onAdd: function () {
        var container = L.DomUtil.create('div', 'ps-minimap-container');
        container.id = 'ps-minimap';
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        // Create mini map after container is in DOM
        setTimeout(function () {
          miniMap = L.map('ps-minimap', {
            center: map.getCenter(),
            zoom: Math.max(map.getZoom() - 5, 3),
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            touchZoom: false,
            boxZoom: false,
            keyboard: false
          });
          L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
            subdomains: 'abcd', maxZoom: 19
          }).addTo(miniMap);

          // Viewport rectangle
          var viewRect = L.rectangle(map.getBounds(), {
            color: '#06b6d4', weight: 2, fillOpacity: 0.12,
            dashArray: '4 4'
          }).addTo(miniMap);

          // Sync
          map.on('move', function () {
            miniMap.setView(map.getCenter(), Math.max(map.getZoom() - 5, 3), { animate: false });
            viewRect.setBounds(map.getBounds());
          });
        }, 500);

        return container;
      }
    });
    new MiniMapControl().addTo(map);
  }

  /**
   * Add coordinate display.
   */
  function _addCoordDisplay() {
    var CoordControl = L.Control.extend({
      options: { position: 'bottomleft' },
      onAdd: function () {
        var div = L.DomUtil.create('div', 'ps-coord-display');
        div.innerHTML = '28.6139°N, 77.2090°E';
        map.on('mousemove', function (e) {
          div.innerHTML = e.latlng.lat.toFixed(4) + '°N, ' + e.latlng.lng.toFixed(4) + '°E';
        });
        return div;
      }
    });
    new CoordControl().addTo(map);
  }

  /**
   * Get the Leaflet map instance.
   */
  MapModule.getMap = function () { return map; };

  /**
   * Get current base layer name.
   */
  MapModule.getCurrentLayer = function () { return currentBaselayer; };

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

  MapModule.clearRoutes = function () {
    routeLayers.forEach(function (l) { map.removeLayer(l); });
    segmentLayers.forEach(function (l) { map.removeLayer(l); });
    routeLayers = [];
    segmentLayers = [];
  };

  MapModule.clearMarkers = function () {
    if (sourceMarker) { map.removeLayer(sourceMarker); sourceMarker = null; }
    if (destMarker) { map.removeLayer(destMarker); destMarker = null; }
    markerLayers.forEach(function (l) { map.removeLayer(l); });
    markerLayers = [];
  };

  /**
   * Draw a route polyline with Google Maps-level styling.
   */
  MapModule.drawRoute = function (coordinates, color, isSelected, routeIndex) {
    console.log('[Map] drawRoute:', coordinates.length, 'pts, color:', color, 'selected:', isSelected);

    if (!coordinates || coordinates.length < 2) {
      console.warn('[Map] drawRoute: Not enough coordinates');
      return null;
    }

    // Shadow/outline for depth (Google Maps style thick outline)
    var shadow = L.polyline(coordinates, {
      color: '#000000',
      weight: isSelected ? 12 : 7,
      opacity: isSelected ? 0.2 : 0.08,
      smoothFactor: 1,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Color border
    var borderColor = _darkenColor(color, 40);
    var border = L.polyline(coordinates, {
      color: borderColor,
      weight: isSelected ? 8 : 5,
      opacity: isSelected ? 0.8 : 0.35,
      smoothFactor: 1,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Main visible route line
    var line = L.polyline(coordinates, {
      color: color,
      weight: isSelected ? 5 : 3,
      opacity: isSelected ? 1 : 0.55,
      smoothFactor: 1,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: isSelected ? null : '10 6'
    }).addTo(map);

    // White animated flow dashes for selected route
    if (isSelected) {
      var flow = L.polyline(coordinates, {
        color: '#ffffff',
        weight: 2,
        opacity: 0.45,
        smoothFactor: 1,
        lineCap: 'round',
        dashArray: '4 14'
      }).addTo(map);
      // Apply animation via DOM
      var flowEl = flow.getElement && flow.getElement();
      if (flowEl) {
        flowEl.style.animation = 'route-flow 1.2s linear infinite';
      }
      routeLayers.push(flow);

      // Direction arrows along the route
      _addDirectionArrows(coordinates, color);
    }

    // Click to select this route
    var clickHandler = function () {
      if (window.PathSense.App && window.PathSense.App.selectRoute) {
        window.PathSense.App.selectRoute(routeIndex);
      }
    };
    line.on('click', clickHandler);
    border.on('click', clickHandler);
    line.on('mouseover', function () { document.body.style.cursor = 'pointer'; });
    line.on('mouseout', function () { document.body.style.cursor = ''; });

    routeLayers.push(shadow, border, line);
    return { shadow: shadow, border: border, line: line };
  };

  /**
   * Add direction arrows along a route (like Google Maps).
   */
  function _addDirectionArrows(coordinates, color) {
    var totalDist = 0;
    var arrowInterval = 0.03; // ~3km in degrees
    var lastArrow = 0;

    for (var i = 1; i < coordinates.length; i++) {
      var dx = coordinates[i][1] - coordinates[i - 1][1];
      var dy = coordinates[i][0] - coordinates[i - 1][0];
      totalDist += Math.sqrt(dx * dx + dy * dy);

      if (totalDist - lastArrow > arrowInterval) {
        lastArrow = totalDist;
        var angle = Math.atan2(dx, dy) * (180 / Math.PI);
        var arrowIcon = L.divIcon({
          className: 'ps-direction-arrow',
          html: '<div style="transform:rotate(' + angle + 'deg);color:' + color + ';">▲</div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
        var arrowMarker = L.marker(coordinates[i], { icon: arrowIcon, interactive: false, zIndexOffset: 400 }).addTo(map);
        routeLayers.push(arrowMarker);
      }
    }
  }

  /**
   * Draw color-coded TEI segments.
   */
  MapModule.drawSegments = function (segments) {
    segmentLayers.forEach(function (l) { map.removeLayer(l); });
    segmentLayers = [];

    segments.forEach(function (seg) {
      var color = window.PathSense.TEI.getColor(seg.tei);

      // Border for contrast
      var border = L.polyline(seg.coordinates, {
        color: '#000000', weight: 10, opacity: 0.08,
        smoothFactor: 1.5, lineCap: 'round', lineJoin: 'round'
      }).addTo(map);

      // Glow
      var glow = L.polyline(seg.coordinates, {
        color: color, weight: 14, opacity: 0.12,
        smoothFactor: 1.5, lineCap: 'round', lineJoin: 'round'
      }).addTo(map);

      // Main segment
      var line = L.polyline(seg.coordinates, {
        color: color, weight: 6, opacity: 0.92,
        smoothFactor: 1.5, lineCap: 'round', lineJoin: 'round'
      }).addTo(map);

      // Popup
      line.on('click', function (e) {
        L.popup({
          maxWidth: 320, closeButton: true, className: 'ps-segment-popup'
        }).setLatLng(e.latlng).setContent(createSegmentPopup(seg)).openOn(map);
      });

      // Hover
      line.on('mouseover', function () {
        line.setStyle({ weight: 8, opacity: 1 });
        glow.setStyle({ weight: 18, opacity: 0.25 });
      });
      line.on('mouseout', function () {
        line.setStyle({ weight: 6, opacity: 0.92 });
        glow.setStyle({ weight: 14, opacity: 0.12 });
      });

      // TEI badge at midpoint
      if (seg.coordinates.length > 2) {
        var midIdx = Math.floor(seg.coordinates.length / 2);
        var teiLabel = L.divIcon({
          className: 'ps-tei-label',
          html: '<div class="ps-tei-badge" style="background:' + color + ';box-shadow:0 2px 8px ' + color + '55;">' + seg.tei + '</div>',
          iconSize: [32, 20], iconAnchor: [16, 10]
        });
        var label = L.marker(seg.coordinates[midIdx], { icon: teiLabel, interactive: false, zIndexOffset: 500 }).addTo(map);
        segmentLayers.push(label);
      }

      segmentLayers.push(border, glow, line);
    });
  };

  /**
   * Add a report marker.
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
      iconSize: [30, 42], iconAnchor: [15, 42]
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

  MapModule.fitBounds = function (coordinates) {
    if (!coordinates || coordinates.length === 0) return;

    // coordinates is an array of [lat, lng] pairs — do NOT flatten
    // Filter out any invalid entries
    var validCoords = coordinates.filter(function (c) {
      return Array.isArray(c) && c.length >= 2 && !isNaN(c[0]) && !isNaN(c[1]);
    });

    if (validCoords.length === 0) {
      console.warn('[Map] fitBounds: No valid coordinates');
      return;
    }

    console.log('[Map] fitBounds:', validCoords.length, 'points');

    var bounds = L.latLngBounds(validCoords);
    map.fitBounds(bounds, {
      paddingTopLeft: [420, 80],
      paddingBottomRight: [60, 60],
      maxZoom: 15,
      animate: true,
      duration: 0.8
    });
  };

  MapModule.focusSegment = function (segment) {
    if (!segment || !segment.coordinates || segment.coordinates.length === 0) return;
    map.fitBounds(L.latLngBounds(segment.coordinates), {
      paddingTopLeft: [420, 80],
      paddingBottomRight: [60, 60],
      maxZoom: 16,
      animate: true,
      duration: 0.5
    });
  };


  /* ══════════════════════════════════════════
     Private Helpers
     ══════════════════════════════════════════ */

  function _darkenColor(hex, percent) {
    if (!hex || hex.charAt(0) !== '#') return hex;
    var num = parseInt(hex.slice(1), 16);
    var r = Math.max(0, (num >> 16) - percent);
    var g = Math.max(0, ((num >> 8) & 0x00FF) - percent);
    var b = Math.max(0, (num & 0x0000FF) - percent);
    return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

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
        '<span style="width:26px;text-align:right;font-size:0.72rem;font-weight:600;color:' + color + ';">' + val + '</span></div>';
    }

    var issuesHTML = '';
    if (seg.issues && seg.issues.length > 0) {
      issuesHTML = '<div style="margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;">' +
        '<span style="font-size:0.65rem;color:#999;text-transform:uppercase;letter-spacing:0.05em;">Issues:</span> ' +
        seg.issues.map(function (i) {
          return '<span style="display:inline-block;margin:2px 4px 0 0;font-size:0.65rem;padding:2px 8px;border-radius:99px;background:rgba(239,68,68,0.08);color:#ef4444;">' + i.type + '</span>';
        }).join('') + '</div>';
    }

    return '<div style="padding:12px 16px;min-width:260px;font-family:Inter,system-ui,sans-serif;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
      '<span style="font-weight:700;font-size:0.85rem;color:#1f2937;">' + seg.name + '</span>' +
      '<span style="font-size:1.1rem;font-weight:800;color:' + grade.color + ';">' + seg.tei + '</span></div>' +
      '<div style="display:flex;gap:10px;margin-bottom:8px;font-size:0.7rem;color:#6b7280;">' +
      '<span>📏 ' + seg.distance.toFixed(1) + ' km</span>' +
      '<span style="padding:1px 8px;border-radius:99px;background:' + grade.color + '18;color:' + grade.color + ';font-weight:600;">' + grade.grade + ' — ' + grade.label + '</span></div>' +
      '<div>' + factorsHTML + '</div>' + issuesHTML + '</div>';
  }

  // Export
  window.PathSense = window.PathSense || {};
  window.PathSense.Map = MapModule;
})();
