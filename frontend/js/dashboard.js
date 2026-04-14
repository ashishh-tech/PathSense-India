/**
 * PathSense India — Dashboard Module
 * ===================================
 * Visualizations: TEI gauge, factor bars, route comparison, emission stats, segment list.
 */
(function () {
  'use strict';

  const Dashboard = {};

  /**
   * Render the main TEI gauge (SVG donut).
   * @param {number} score - TEI score 0-100
   * @param {Object} routeData - Full route analysis data
   */
  Dashboard.renderGauge = function (score, routeData) {
    const container = document.getElementById('tei-gauge-container');
    if (!container) return;

    const TEI = window.PathSense.TEI;
    const grade = TEI.getGrade(score);

    // SVG donut parameters
    const radius = 72;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;
    const dashOffset = circumference - progress;

    container.innerHTML = `
      <svg class="gauge-svg" viewBox="0 0 180 180">
        <circle class="gauge-bg" cx="90" cy="90" r="${radius}" />
        <circle class="gauge-fill" cx="90" cy="90" r="${radius}"
          stroke="${grade.color}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${circumference}"
          style="transition: stroke-dashoffset 1200ms cubic-bezier(0.16,1,0.3,1);"
        />
      </svg>
      <div class="gauge-center">
        <div class="gauge-score" style="color:${grade.color};">
          <span id="gauge-score-num">0</span>
        </div>
        <div class="gauge-grade" style="color:${grade.color};">${grade.grade}</div>
        <div class="gauge-label">${grade.label}</div>
      </div>
      <div class="gauge-info">
        <div class="gauge-info-item">
          <div class="gauge-info-value">${routeData.totalDistance.toFixed(1)}<span style="font-size:0.7em;color:var(--text-muted);"> km</span></div>
          <div class="gauge-info-label">Distance</div>
        </div>
        <div class="gauge-info-item">
          <div class="gauge-info-value">${Math.round(routeData.totalDistance / ((routeData.emissions.avgSpeed || 30) / 60))}<span style="font-size:0.7em;color:var(--text-muted);"> min</span></div>
          <div class="gauge-info-label">Est. Duration</div>
        </div>
        <div class="gauge-info-item">
          <div class="gauge-info-value">${routeData.segments.length}</div>
          <div class="gauge-info-label">Segments</div>
        </div>
      </div>
    `;

    // Animate the gauge after a brief delay
    requestAnimationFrame(() => {
      setTimeout(() => {
        const fill = container.querySelector('.gauge-fill');
        if (fill) fill.setAttribute('stroke-dashoffset', dashOffset);
        animateCounter('gauge-score-num', 0, score, 1000);
      }, 100);
    });
  };

  /**
   * Render factor breakdown bars.
   * @param {Object} factors - Factor scores
   */
  Dashboard.renderFactors = function (factors) {
    const container = document.getElementById('factor-bars-container');
    if (!container) return;

    const TEI = window.PathSense.TEI;
    let html = '';

    for (const [key, meta] of Object.entries(TEI.FACTORS)) {
      const val = factors[key] || 0;
      const color = TEI.getColor(val);

      html += `
        <div class="factor-bar">
          <div class="factor-icon">${meta.icon}</div>
          <div class="factor-info">
            <div class="factor-name-row">
              <span class="factor-name">${meta.name}</span>
              <span class="factor-score" style="color:${color};">${val}/100</span>
            </div>
            <div class="factor-track">
              <div class="factor-fill" style="width:0%;background:${color};" data-target="${val}"></div>
            </div>
          </div>
        </div>`;
    }

    container.innerHTML = html;

    // Animate bars
    requestAnimationFrame(() => {
      setTimeout(() => {
        container.querySelectorAll('.factor-fill').forEach(bar => {
          bar.style.width = bar.dataset.target + '%';
        });
      }, 200);
    });
  };

  /**
   * Render route comparison mini-gauges.
   * @param {Array} routes - Array of analyzed routes
   * @param {number} selectedIndex - Currently selected route index
   */
  Dashboard.renderComparison = function (routes, selectedIndex) {
    const container = document.getElementById('comparison-grid-container');
    if (!container) return;

    const TEI = window.PathSense.TEI;

    const miniRadius = 22;
    const miniCircumference = 2 * Math.PI * miniRadius;

    let html = '';
    routes.forEach((route, idx) => {
      const grade = route.analysis.overallGrade;
      const score = route.analysis.overallTEI;
      const progress = (score / 100) * miniCircumference;
      const dashOffset = miniCircumference - progress;
      const isActive = idx === selectedIndex;

      html += `
        <div class="comparison-card ${isActive ? 'active' : ''}" data-route-index="${idx}">
          <div class="comparison-mini-gauge">
            <svg viewBox="0 0 56 56">
              <circle class="mini-gauge-bg" cx="28" cy="28" r="${miniRadius}" />
              <circle class="mini-gauge-fill" cx="28" cy="28" r="${miniRadius}"
                stroke="${grade.color}"
                stroke-dasharray="${miniCircumference}"
                stroke-dashoffset="${isActive ? dashOffset : miniCircumference}"
                style="transition: stroke-dashoffset 800ms cubic-bezier(0.16,1,0.3,1);"
              />
            </svg>
            <span class="comparison-score" style="color:${grade.color};">${score}</span>
          </div>
          <div class="comparison-name">${route.name}</div>
          <div class="comparison-distance">${route.analysis.totalDistance.toFixed(1)} km</div>
        </div>`;
    });

    container.innerHTML = html;

    // Animate non-active mini gauges
    requestAnimationFrame(() => {
      setTimeout(() => {
        container.querySelectorAll('.comparison-card:not(.active) .mini-gauge-fill').forEach(fill => {
          const card = fill.closest('.comparison-card');
          const idx = parseInt(card.dataset.routeIndex);
          const route = routes[idx];
          if (route) {
            const score = route.analysis.overallTEI;
            const progress = (score / 100) * miniCircumference;
            fill.setAttribute('stroke-dashoffset', miniCircumference - progress);
          }
        });
      }, 400);
    });

    // Click handlers
    container.querySelectorAll('.comparison-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.routeIndex);
        if (window.PathSense.App && window.PathSense.App.selectRoute) {
          window.PathSense.App.selectRoute(idx);
        }
      });
    });
  };

  /**
   * Render emission statistics.
   * @param {Object} emissions - Emission data
   * @param {Object} wearCost - Vehicle wear cost data
   * @param {Array} allRoutes - All routes for savings comparison
   * @param {number} selectedIndex - Selected route index
   */
  Dashboard.renderEmissions = function (emissions, wearCost, allRoutes, selectedIndex) {
    const container = document.getElementById('emission-grid-container');
    if (!container) return;

    // Calculate savings vs worst route
    const selectedCO2 = emissions.totalCO2;
    const worstCO2 = Math.max(...allRoutes.map(r => r.analysis.emissions.totalCO2));
    const savings = Math.max(0, worstCO2 - selectedCO2);
    const savingsPercent = worstCO2 > 0 ? Math.round((savings / worstCO2) * 100) : 0;

    container.innerHTML = `
      <div class="emission-card">
        <div class="emission-value" style="color:var(--text-primary);">${emissions.co2PerKm}</div>
        <div class="emission-label">g CO₂/km</div>
      </div>
      <div class="emission-card">
        <div class="emission-value" style="color:var(--text-primary);">${emissions.noxPerKm}</div>
        <div class="emission-label">g NOₓ/km</div>
      </div>
      <div class="emission-card">
        <div class="emission-value" style="color:var(--warning);">₹${wearCost.total}</div>
        <div class="emission-label">Est. Wear Cost</div>
      </div>
      <div class="emission-card">
        <div class="emission-value" style="color:var(--text-primary);">${emissions.avgSpeed}</div>
        <div class="emission-label">Avg Speed km/h</div>
      </div>
      ${savings > 0 ? `
        <div class="emission-card emission-savings">
          <div class="emission-value">-${Math.round(savings)}g CO₂</div>
          <div class="emission-label">vs worst route</div>
          <div class="savings-comparison">🌿 ${savingsPercent}% cleaner choice</div>
        </div>` : ''}
    `;
  };

  /**
   * Render segment detail list.
   * @param {Array} segments - Analyzed segments
   */
  Dashboard.renderSegments = function (segments) {
    const container = document.getElementById('segment-list-container');
    if (!container) return;

    const TEI = window.PathSense.TEI;
    let html = '';

    segments.forEach((seg, idx) => {
      const grade = seg.grade;
      const issueDots = (seg.issues || []).map(issue => {
        const colors = {
          pothole: '#ef4444', congestion: '#f97316',
          safety: '#fbbf24', surface: '#8b5cf6'
        };
        return `<div class="segment-issue-dot" style="background:${colors[issue.type] || '#6b7280'};"></div>`;
      }).join('');

      html += `
        <div class="segment-item" data-segment-index="${idx}" title="Click to focus on map">
          <div class="segment-color" style="background:${grade.color};"></div>
          <div class="segment-info">
            <div class="segment-name">${seg.name}</div>
            <div class="segment-meta">📏 ${seg.distance.toFixed(1)} km  ·  ${grade.grade} ${grade.label}</div>
          </div>
          ${issueDots ? `<div class="segment-issues">${issueDots}</div>` : ''}
          <div class="segment-score-badge" style="background:${grade.bgColor};color:${grade.color};">${seg.tei}</div>
        </div>`;
    });

    container.innerHTML = html;

    // Click handlers to focus segment on map
    container.querySelectorAll('.segment-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.segmentIndex);
        const seg = segments[idx];
        if (seg && window.PathSense.Map) {
          window.PathSense.Map.focusSegment(seg);
        }
      });
    });
  };

  /**
   * Show the dashboard panel.
   */
  Dashboard.show = function () {
    const panel = document.getElementById('dashboard-panel');
    if (panel) {
      panel.classList.remove('hidden');
    }
  };

  /**
   * Hide the dashboard panel.
   */
  Dashboard.hide = function () {
    const panel = document.getElementById('dashboard-panel');
    if (panel) {
      panel.classList.add('hidden');
    }
  };

  /**
   * Full render of the dashboard for a selected route.
   * @param {Object} routeData - Analyzed route data
   * @param {Array} allRoutes - All route options
   * @param {number} selectedIndex - Selected route index
   */
  Dashboard.render = function (routeData, allRoutes, selectedIndex) {
    const route = allRoutes[selectedIndex];

    // Update route name
    document.getElementById('route-name').textContent = route.name;

    // Render all sections
    Dashboard.renderGauge(routeData.overallTEI, routeData);
    Dashboard.renderFactors(routeData.factors);
    Dashboard.renderComparison(allRoutes, selectedIndex);
    Dashboard.renderEmissions(routeData.emissions, routeData.wearCost, allRoutes, selectedIndex);
    Dashboard.renderSegments(routeData.segments);

    // Show panel
    Dashboard.show();
  };


  /* ══════════════════════════════════════════
     Utility: Animated Counter
     ══════════════════════════════════════════ */
  function animateCounter(elementId, start, end, duration) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const range = end - start;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + range * eased);
      el.textContent = current;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }


  // Export
  window.PathSense = window.PathSense || {};
  window.PathSense.Dashboard = Dashboard;
})();
