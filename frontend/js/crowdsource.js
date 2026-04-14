/**
 * PathSense India — Crowdsource Module
 * =====================================
 * User reporting system for road issues.
 */
(function () {
  'use strict';

  const Crowdsource = {};

  let selectedType = null;
  let reportLocation = null;

  /**
   * Initialize the crowdsource report system.
   */
  Crowdsource.init = function () {
    const fab = document.getElementById('report-fab');
    const modal = document.getElementById('report-modal');
    const overlay = document.getElementById('report-overlay');
    const closeBtn = document.getElementById('close-report');
    const submitBtn = document.getElementById('submit-report');
    const typeButtons = document.querySelectorAll('.report-type');

    // Open modal
    if (fab) {
      fab.addEventListener('click', () => {
        modal.classList.remove('hidden');
        selectedType = null;
        reportLocation = null;
        document.getElementById('report-description').value = '';
        document.getElementById('severity-range').value = 3;
        typeButtons.forEach(b => b.classList.remove('selected'));
        updateLocationText();
        tryGetLocation();
      });
    }

    // Close modal
    if (closeBtn) {
      closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }
    if (overlay) {
      overlay.addEventListener('click', () => modal.classList.add('hidden'));
    }

    // Type selection
    typeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        typeButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedType = btn.dataset.type;
      });
    });

    // Submit report
    if (submitBtn) {
      submitBtn.addEventListener('click', handleSubmit);
    }
  };

  /**
   * Try to get user's GPS location.
   */
  function tryGetLocation() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          reportLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          updateLocationText(`📍 ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        },
        () => {
          // Fallback: use map center
          const map = window.PathSense.Map.getMap();
          if (map) {
            const center = map.getCenter();
            reportLocation = { lat: center.lat, lng: center.lng };
            updateLocationText('📍 Using map center location');
          }
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      // Fallback: map center
      const map = window.PathSense.Map.getMap();
      if (map) {
        const center = map.getCenter();
        reportLocation = { lat: center.lat, lng: center.lng };
        updateLocationText('📍 Using map center location');
      }
    }
  }

  /**
   * Update the location display text.
   */
  function updateLocationText(text) {
    const el = document.getElementById('report-location');
    if (el) {
      el.innerHTML = `<span>${text || '📍 Detecting location...'}</span>`;
    }
  }

  /**
   * Handle report submission.
   */
  async function handleSubmit() {
    if (!selectedType) {
      showToast('warning', 'Select Issue Type', 'Please select the type of road issue.');
      return;
    }

    if (!reportLocation) {
      showToast('warning', 'Location Required', 'Location could not be determined. Try again.');
      return;
    }

    const severity = parseInt(document.getElementById('severity-range').value) || 3;
    const description = document.getElementById('report-description').value;

    // Add marker to map
    window.PathSense.Map.addReportMarker(
      reportLocation.lat,
      reportLocation.lng,
      selectedType,
      severity
    );

    // POST to backend API
    const API_BASE = window.PathSense.API_BASE || 'http://localhost:8000';
    try {
      await fetch(API_BASE + '/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          severity: severity,
          latitude: reportLocation.lat,
          longitude: reportLocation.lng,
          description: description
        })
      });
    } catch (err) {
      console.warn('Backend offline, report saved locally only:', err.message);
    }

    // Close modal
    document.getElementById('report-modal').classList.add('hidden');

    // Show success toast
    showToast('success', 'Report Submitted!',
      `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} reported successfully. Thank you for contributing!`
    );

    // Increment stats counter
    const potholeEl = document.getElementById('stat-potholes');
    if (potholeEl) {
      const current = parseInt(potholeEl.textContent.replace(/,/g, '')) || 0;
      potholeEl.textContent = (current + 1).toLocaleString();
    }
  }

  /**
   * Show a toast notification.
   */
  function showToast(type, title, message) {
    if (window.PathSense.App && window.PathSense.App.showToast) {
      window.PathSense.App.showToast(type, title, message);
    }
  }


  // Export
  window.PathSense = window.PathSense || {};
  window.PathSense.Crowdsource = Crowdsource;
})();
