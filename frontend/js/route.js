/**
 * PathSense India — Route Module
 * ==============================
 * Geocoding via Nominatim & routing via OSRM.
 * Handles address search, route calculation, and coordinate processing.
 */
(function () {
  'use strict';

  const Route = {};

  /* ── API Endpoints (free, no keys needed) ── */
  const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
  const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

  /* ── Rate limiting for Nominatim (1 req/sec policy) ── */
  let lastNominatimCall = 0;
  const NOMINATIM_DELAY = 1100; // ms between calls

  /**
   * Geocode a search query to coordinates.
   * @param {string} query - Address or place name
   * @returns {Promise<Array>} Array of { lat, lng, displayName, type }
   */
  Route.geocode = async function (query) {
    if (!query || query.trim().length < 3) return [];

    // Rate limit
    const now = Date.now();
    const wait = NOMINATIM_DELAY - (now - lastNominatimCall);
    if (wait > 0) {
      await new Promise(r => setTimeout(r, wait));
    }
    lastNominatimCall = Date.now();

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        countrycodes: 'in',
        limit: '5',
        addressdetails: '1'
      });

      const response = await fetch(`${NOMINATIM_URL}?${params}`, {
        headers: {
          'User-Agent': 'PathSenseIndia/1.0 (hackathon demo)'
        }
      });

      if (!response.ok) throw new Error(`Geocoding failed: ${response.status}`);

      const data = await response.json();

      return data.map(item => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        displayName: item.display_name,
        shortName: formatShortName(item),
        type: item.type || 'place'
      }));
    } catch (err) {
      console.error('Geocode error:', err);
      return [];
    }
  };

  /**
   * Get route alternatives between two points using OSRM.
   * @param {Object} source - { lat, lng }
   * @param {Object} dest - { lat, lng }
   * @returns {Promise<Array>} Array of route objects
   */
  Route.getRoutes = async function (source, dest) {
    try {
      const url = `${OSRM_URL}/${source.lng},${source.lat};${dest.lng},${dest.lat}?alternatives=true&overview=full&geometries=geojson&steps=true`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Routing failed: ${response.status}`);

      const data = await response.json();

      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error('No routes found');
      }

      // Process routes (up to 3)
      const routes = data.routes.slice(0, 3).map((route, idx) => {
        // Convert GeoJSON [lng, lat] to [lat, lng] for Leaflet
        const coordinates = route.geometry.coordinates.map(c => [c[1], c[0]]);

        // Extract road names from steps for route naming
        const roadNames = extractRoadNames(route.legs[0].steps);
        const routeName = generateRouteName(roadNames, idx);

        return {
          index: idx,
          name: routeName,
          coordinates: coordinates,
          distance: route.distance / 1000, // km
          duration: route.duration / 60,    // minutes
          roadNames: roadNames
        };
      });

      return routes;
    } catch (err) {
      console.error('Routing error:', err);
      throw err;
    }
  };

  /**
   * Debounce helper for autocomplete input.
   */
  Route.debounce = function (fn, delay) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  };


  /* ══════════════════════════════════════════
     Private Helpers
     ══════════════════════════════════════════ */

  /**
   * Format a short name from Nominatim response.
   */
  function formatShortName(item) {
    const parts = item.display_name.split(',').map(s => s.trim());
    if (parts.length >= 3) {
      return parts.slice(0, 3).join(', ');
    }
    return parts.join(', ');
  }

  /**
   * Extract significant road names from OSRM route steps.
   */
  function extractRoadNames(steps) {
    const names = new Set();
    for (const step of steps) {
      if (step.name && step.name.trim() && step.name !== '') {
        names.add(step.name.trim());
      }
      if (step.ref) {
        names.add(step.ref.trim());
      }
    }
    return [...names];
  }

  /**
   * Generate a human-friendly route name.
   */
  function generateRouteName(roadNames, index) {
    // Filter for significant roads (highways, named roads)
    const significant = roadNames.filter(n =>
      n.match(/NH|SH|MG|Ring|Outer|Inner|GT|Mathura|Mehrauli|Aurobindo|Patel|Nehru/i) ||
      n.length > 3
    );

    if (significant.length > 0) {
      // Pick the most prominent road name
      const primary = significant.find(n => n.match(/NH|SH|Ring|GT|Mathura/i)) || significant[0];
      return `Via ${primary}`;
    }

    const labels = ['Primary Route', 'Alternative Route', 'Scenic Route'];
    return labels[index] || `Route ${index + 1}`;
  }


  // Export
  window.PathSense = window.PathSense || {};
  window.PathSense.Route = Route;
})();
