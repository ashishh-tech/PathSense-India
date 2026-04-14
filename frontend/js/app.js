/**
 * PathSense India — Main Application
 * ====================================
 * Orchestrates all modules: map, routing, TEI analysis, dashboard, and crowdsource.
 */
(function () {
  'use strict';

  const App = {};

  /* ── State ── */
  let state = {
    source: null,       // { lat, lng, name }
    destination: null,   // { lat, lng, name }
    routes: [],          // Array of { name, coordinates, distance, duration, analysis }
    selectedRoute: -1,
    isLoading: false
  };

  /**
   * Initialize the application.
   */
  App.init = function () {
    // Initialize map
    window.PathSense.Map.init();

    // Initialize crowdsource
    window.PathSense.Crowdsource.init();

    // Setup event listeners
    setupSearchInputs();
    setupButtons();
    setupDemoButtons();
    setupKeyboardShortcuts();

    // Animate stats on load
    animateStats();

    console.log('🛣️ PathSense India initialized');
  };


  /* ══════════════════════════════════════════
     Search Autocomplete
     ══════════════════════════════════════════ */

  function setupSearchInputs() {
    const sourceInput = document.getElementById('source-input');
    const destInput = document.getElementById('dest-input');
    const sourceSuggestions = document.getElementById('source-suggestions');
    const destSuggestions = document.getElementById('dest-suggestions');

    // Debounced geocoding
    const debouncedGeocode = window.PathSense.Route.debounce(async (query, dropdown, type) => {
      if (query.length < 3) {
        dropdown.classList.remove('active');
        return;
      }

      const results = await window.PathSense.Route.geocode(query);
      renderSuggestions(results, dropdown, type);
    }, 400);

    // Source input
    sourceInput.addEventListener('input', (e) => {
      debouncedGeocode(e.target.value, sourceSuggestions, 'source');
      updateAnalyzeButton();
    });

    // Destination input
    destInput.addEventListener('input', (e) => {
      debouncedGeocode(e.target.value, destSuggestions, 'destination');
      updateAnalyzeButton();
    });

    // Close dropdowns on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.input-wrapper')) {
        sourceSuggestions.classList.remove('active');
        destSuggestions.classList.remove('active');
      }
    });

    // Focus handling
    sourceInput.addEventListener('focus', () => {
      if (sourceSuggestions.children.length > 0) {
        sourceSuggestions.classList.add('active');
      }
    });

    destInput.addEventListener('focus', () => {
      if (destSuggestions.children.length > 0) {
        destSuggestions.classList.add('active');
      }
    });
  }

  /**
   * Render geocode suggestions in a dropdown.
   */
  function renderSuggestions(results, dropdown, type) {
    if (!results || results.length === 0) {
      dropdown.classList.remove('active');
      return;
    }

    dropdown.innerHTML = results.map((r, i) => `
      <div class="suggestion-item" data-index="${i}" data-lat="${r.lat}" data-lng="${r.lng}" data-name="${r.shortName}">
        <span class="suggestion-icon">📍</span>
        <span class="suggestion-text">${r.shortName}</span>
      </div>
    `).join('');

    dropdown.classList.add('active');

    // Click handlers
    dropdown.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        const lat = parseFloat(item.dataset.lat);
        const lng = parseFloat(item.dataset.lng);
        const name = item.dataset.name;

        if (type === 'source') {
          state.source = { lat, lng, name };
          document.getElementById('source-input').value = name;
          window.PathSense.Map.setSourceMarker(lat, lng, name);
        } else {
          state.destination = { lat, lng, name };
          document.getElementById('dest-input').value = name;
          window.PathSense.Map.setDestMarker(lat, lng, name);
        }

        dropdown.classList.remove('active');
        updateAnalyzeButton();

        // If both are set, fit bounds
        if (state.source && state.destination) {
          window.PathSense.Map.fitBounds([
            [state.source.lat, state.source.lng],
            [state.destination.lat, state.destination.lng]
          ]);
        }
      });
    });
  }


  /* ══════════════════════════════════════════
     Buttons & Controls
     ══════════════════════════════════════════ */

  function setupButtons() {
    // Analyze button
    document.getElementById('analyze-btn').addEventListener('click', handleAnalyze);

    // Swap button
    document.getElementById('swap-btn').addEventListener('click', () => {
      const temp = state.source;
      state.source = state.destination;
      state.destination = temp;

      const sourceInput = document.getElementById('source-input');
      const destInput = document.getElementById('dest-input');
      const tempVal = sourceInput.value;
      sourceInput.value = destInput.value;
      destInput.value = tempVal;

      // Update markers
      if (state.source) window.PathSense.Map.setSourceMarker(state.source.lat, state.source.lng, state.source.name);
      if (state.destination) window.PathSense.Map.setDestMarker(state.destination.lat, state.destination.lng, state.destination.name);
    });

    // Close dashboard
    document.getElementById('close-dashboard').addEventListener('click', () => {
      window.PathSense.Dashboard.hide();
      state.selectedRoute = -1;
      // Deselect route cards
      document.querySelectorAll('.route-card').forEach(c => c.classList.remove('selected'));
    });

    // Toggle panel
    document.getElementById('toggle-panel-btn').addEventListener('click', () => {
      document.getElementById('search-panel').classList.toggle('collapsed');
    });

    // Toggle legend
    document.getElementById('toggle-legend-btn').addEventListener('click', () => {
      document.getElementById('map-legend').classList.toggle('visible');
    });
  }

  function setupDemoButtons() {
    document.querySelectorAll('.demo-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sourceName = btn.dataset.source;
        const destName = btn.dataset.dest;

        document.getElementById('source-input').value = sourceName;
        document.getElementById('dest-input').value = destName;

        // Geocode both
        showLoading('Finding locations...');

        try {
          const [sourceResults, destResults] = await Promise.all([
            window.PathSense.Route.geocode(sourceName),
            window.PathSense.Route.geocode(destName)
          ]);

          if (sourceResults.length > 0 && destResults.length > 0) {
            state.source = {
              lat: sourceResults[0].lat,
              lng: sourceResults[0].lng,
              name: sourceResults[0].shortName
            };
            state.destination = {
              lat: destResults[0].lat,
              lng: destResults[0].lng,
              name: destResults[0].shortName
            };

            document.getElementById('source-input').value = state.source.name;
            document.getElementById('dest-input').value = state.destination.name;

            window.PathSense.Map.setSourceMarker(state.source.lat, state.source.lng, state.source.name);
            window.PathSense.Map.setDestMarker(state.destination.lat, state.destination.lng, state.destination.name);

            updateAnalyzeButton();
            hideLoading();

            // Auto-analyze
            await handleAnalyze();
          } else {
            hideLoading();
            App.showToast('danger', 'Location Not Found', 'Could not find one of the demo locations.');
          }
        } catch (err) {
          hideLoading();
          App.showToast('danger', 'Error', err.message);
        }
      });
    });
  }

  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Enter to analyze
      if (e.key === 'Enter' && (e.target.id === 'source-input' || e.target.id === 'dest-input')) {
        if (state.source && state.destination) {
          handleAnalyze();
        }
      }
      // Escape to close modals
      if (e.key === 'Escape') {
        document.getElementById('report-modal').classList.add('hidden');
        window.PathSense.Dashboard.hide();
      }
    });
  }


  /* ══════════════════════════════════════════
     Route Analysis
     ══════════════════════════════════════════ */

  async function handleAnalyze() {
    if (!state.source || !state.destination) {
      App.showToast('warning', 'Missing Location', 'Please enter both source and destination.');
      return;
    }

    if (state.isLoading) return;
    state.isLoading = true;

    showLoading('Analyzing road quality...');

    try {
      // Get routes from OSRM
      const routes = await window.PathSense.Route.getRoutes(state.source, state.destination);

      // Analyze each route with TEI engine
      state.routes = routes.map((route, idx) => {
        const analysis = window.PathSense.TEI.analyzeRoute(route.coordinates, idx);
        return { ...route, analysis };
      });

      // Sort by TEI score (best first)
      state.routes.sort((a, b) => b.analysis.overallTEI - a.analysis.overallTEI);

      // Clear old routes from map
      window.PathSense.Map.clearRoutes();

      // Draw routes on map (non-selected first, then selected)
      for (let i = state.routes.length - 1; i >= 0; i--) {
        const route = state.routes[i];
        const grade = route.analysis.overallGrade;
        const isSelected = i === 0;
        window.PathSense.Map.drawRoute(
          route.coordinates,
          grade.color,
          isSelected,
          i
        );
      }

      // Render route cards in search panel
      renderRouteCards();

      // Auto-select best route
      App.selectRoute(0);

      // Fit map to show all routes
      const allCoords = state.routes.flatMap(r => r.coordinates);
      window.PathSense.Map.fitBounds(allCoords);

      // Show legend
      document.getElementById('map-legend').classList.add('visible');

      hideLoading();

      App.showToast('success', 'Analysis Complete',
        `${state.routes.length} route${state.routes.length > 1 ? 's' : ''} analyzed with TEI scoring.`);

    } catch (err) {
      hideLoading();
      console.error('Analysis error:', err);
      App.showToast('danger', 'Analysis Failed', 'Could not calculate routes. Please try again.');
    } finally {
      state.isLoading = false;
    }
  }

  /**
   * Select a specific route.
   */
  App.selectRoute = function (index) {
    if (index < 0 || index >= state.routes.length) return;

    state.selectedRoute = index;
    const route = state.routes[index];

    // Update route card selection
    document.querySelectorAll('.route-card').forEach((card, i) => {
      card.classList.toggle('selected', i === index);
    });

    // Redraw routes with correct styling
    window.PathSense.Map.clearRoutes();

    // Draw non-selected routes first (behind)
    for (let i = state.routes.length - 1; i >= 0; i--) {
      const r = state.routes[i];
      const isSelected = i === index;
      window.PathSense.Map.drawRoute(
        r.coordinates,
        r.analysis.overallGrade.color,
        isSelected,
        i
      );
    }

    // Draw segments for selected route
    window.PathSense.Map.drawSegments(route.analysis.segments);

    // Render dashboard
    window.PathSense.Dashboard.render(route.analysis, state.routes, index);
  };


  /* ══════════════════════════════════════════
     Route Cards (Search Panel)
     ══════════════════════════════════════════ */

  function renderRouteCards() {
    const container = document.getElementById('route-cards-container');
    const resultsSection = document.getElementById('route-results');
    if (!container || !resultsSection) return;

    const TEI = window.PathSense.TEI;
    let html = '';

    state.routes.forEach((route, idx) => {
      const grade = route.analysis.overallGrade;
      const isRecommended = idx === 0;
      const duration = Math.round(route.analysis.totalDistance / ((route.analysis.emissions.avgSpeed || 30) / 60));

      // Mini factor bars
      const factors = route.analysis.factors;
      const factorKeys = Object.keys(TEI.WEIGHTS);
      const miniBars = factorKeys.map(key => {
        const val = factors[key] || 0;
        const color = TEI.getColor(val);
        return `<div class="mini-factor"><div class="mini-factor-fill" style="width:${val}%;background:${color};" data-target="${val}"></div></div>`;
      }).join('');

      html += `
        <div class="route-card ${idx === 0 ? 'selected' : ''}" data-route-index="${idx}">
          ${isRecommended ? '<div class="recommended-badge">★ Recommended</div>' : ''}
          <div class="route-card-header">
            <span class="route-card-name">${route.name}</span>
            <div class="route-card-tei">
              <span class="tei-badge" style="background:${grade.bgColor};color:${grade.color};">
                ${grade.grade} · ${grade.score}
              </span>
            </div>
          </div>
          <div class="route-card-details">
            <span>📏 ${route.analysis.totalDistance.toFixed(1)} km</span>
            <span>⏱️ ${duration} min</span>
            <span>🌿 ${route.analysis.emissions.co2PerKm}g/km</span>
          </div>
          <div class="route-card-factors">${miniBars}</div>
        </div>`;
    });

    container.innerHTML = html;
    resultsSection.classList.remove('hidden');

    // Animate mini bars
    requestAnimationFrame(() => {
      setTimeout(() => {
        container.querySelectorAll('.mini-factor-fill').forEach(bar => {
          bar.style.width = bar.dataset.target + '%';
        });
      }, 300);
    });

    // Click handlers
    container.querySelectorAll('.route-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.routeIndex);
        App.selectRoute(idx);
      });
    });
  }


  /* ══════════════════════════════════════════
     Loading & Toasts
     ══════════════════════════════════════════ */

  function showLoading(message) {
    const overlay = document.getElementById('loading-overlay');
    const msgEl = overlay.querySelector('p');
    if (msgEl) msgEl.textContent = message || 'Analyzing road quality...';
    overlay.classList.remove('hidden');
  }

  function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
  }

  App.showToast = function (type, title, message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: '✅', warning: '⚠️', danger: '❌', info: 'ℹ️' };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>`;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  };

  function updateAnalyzeButton() {
    const btn = document.getElementById('analyze-btn');
    btn.disabled = !(state.source && state.destination);
  }


  /* ══════════════════════════════════════════
     Stats Animation (on load)
     ══════════════════════════════════════════ */

  function animateStats() {
    const stats = [
      { id: 'stat-roads', target: 12847 },
      { id: 'stat-potholes', target: 3421 },
      { id: 'stat-users', target: 8923 },
      { id: 'stat-cities', target: 23 }
    ];

    stats.forEach((stat, idx) => {
      setTimeout(() => {
        animateNumber(stat.id, 0, stat.target, 1500);
      }, idx * 200);
    });
  }

  function animateNumber(elementId, start, end, duration) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * eased);
      el.textContent = current.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }


  // Export and auto-initialize
  window.PathSense = window.PathSense || {};
  window.PathSense.App = App;

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.init);
  } else {
    App.init();
  }
})();
