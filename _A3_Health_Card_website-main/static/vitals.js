// ==================== MY VITALS PAGE JAVASCRIPT ====================
// Uses /api/client/my-vitals for PatientVitals data (recorded by doctors/health workers)
// And /api/vitals for self-recorded vitals (client's own entries)

(function () {
  'use strict';

  let vitalsData = [];
  let currentDaysFilter = 7;
  let isLoading = false;
  let currentPage = 1;
  const rowsPerPage = 5;

  window.openVitalModal = function (type = 'general') {
    const modalEl = document.getElementById('vitalsEntryModal');
    if (!modalEl) return;
    const modal = new bootstrap.Modal(modalEl);
    const form = document.getElementById('vitalsEntryForm');
    if (form) form.reset();
    const bmiCalc = document.getElementById('bmiCalc');
    if (bmiCalc) bmiCalc.value = '';
    modal.show();
  };

  function calculateBMI() {
    const weightEl = document.getElementById('weight');
    const heightEl = document.getElementById('height');
    const bmiEl = document.getElementById('bmiCalc');
    if (weightEl && heightEl && bmiEl) {
      const weight = parseFloat(weightEl.value);
      const height = parseFloat(heightEl.value);
      if (weight && height && height > 0) {
        const heightM = height / 100;
        bmiEl.value = (weight / (heightM * heightM)).toFixed(1);
      }
    }
  }

  window.saveVitalRecord = async function () {
    const form = document.getElementById('vitalsEntryForm');
    if (!form) return;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const hasData = Object.keys(data).some(k =>
      k !== 'vital_type' && k !== 'notes' && k !== 'temperature_unit' && data[k]);
    if (!hasData) { alert('Please fill at least one vital measurement.'); return; }

    const btn = document.getElementById('saveVitalBtn');
    try {
      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Saving...'; }
      const res = await fetch('/api/vitals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await res.json();
      if (result.success) {
        const modalEl = document.getElementById('vitalsEntryModal');
        if (modalEl) { const mi = bootstrap.Modal.getInstance(modalEl); if (mi) mi.hide(); }
        currentPage = 1;
        loadVitalsData(currentDaysFilter);
        alert('Vital recorded successfully!');
      } else { alert('Error: ' + result.error); }
    } catch (e) { alert('Error: ' + e.message); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save me-1"></i> Save Vital'; } }
  };

  async function loadVitalsData(days = 7) {
    if (isLoading) return;
    isLoading = true;
    currentDaysFilter = days;
    const tbody = document.getElementById('vitalsHistoryBody');

    try {
      // Fetch from BOTH APIs and merge results
      const [patientVitalsRes, selfVitalsRes] = await Promise.all([
        fetch('/api/client/my-vitals'),
        fetch(days > 0 ? `/api/vitals?days=${days}` : '/api/vitals')
      ]);

      const patientVitalsData = await patientVitalsRes.json();
      const selfVitalsData = await selfVitalsRes.json();

      // Normalize PatientVitals data to match our format
      let allVitals = [];

      if (patientVitalsData.success && patientVitalsData.vitals) {
        const normalized = patientVitalsData.vitals.map(v => ({
          id: 'pv_' + v.id,
          blood_pressure_systolic: v.systolic_bp,
          blood_pressure_diastolic: v.diastolic_bp,
          heart_rate: v.heart_rate,
          blood_sugar_fasting: v.blood_sugar,
          blood_sugar_pp: null,
          blood_sugar_random: null,
          weight: v.weight,
          height: v.height,
          bmi: v.bmi,
          spo2: v.spo2,
          temperature: v.temperature,
          temperature_unit: 'F',
          respiratory_rate: v.respiratory_rate,
          recorded_at: v.recorded_at,
          recorded_by: v.recorded_by || 'Doctor/Health Worker',
          source: 'doctor'
        }));
        allVitals = allVitals.concat(normalized);
      }

      if (selfVitalsData.success && selfVitalsData.vitals) {
        const normalized = selfVitalsData.vitals.map(v => ({
          ...v,
          id: 'sv_' + v.id,
          source: 'self'
        }));
        allVitals = allVitals.concat(normalized);
      }

      // Sort by date (most recent first)
      allVitals.sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));

      // Filter by days if needed
      if (days > 0) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        allVitals = allVitals.filter(v => new Date(v.recorded_at) >= cutoff);
      }

      vitalsData = allVitals;
      renderVitalsTable(vitalsData);
      updateVitalsKPIs(vitalsData);
      renderVitalsCharts(vitalsData);

    } catch (e) {
      console.error('Error loading vitals:', e);
      if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">Error loading vitals.</td></tr>';
      hidePagination();
    } finally {
      isLoading = false;
    }
  }
  window.loadVitalsData = loadVitalsData;

  function renderVitalsTable(vitals) {
    const tbody = document.getElementById('vitalsHistoryBody');
    if (!tbody) return;

    if (!vitals || vitals.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">No vitals recorded yet.</td></tr>';
      hidePagination();
      return;
    }

    const totalPages = Math.ceil(vitals.length / rowsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedVitals = vitals.slice(startIndex, endIndex);

    let html = '';
    for (let i = 0; i < paginatedVitals.length; i++) {
      const v = paginatedVitals[i];
      const date = v.recorded_at ? new Date(v.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
      const bp = (v.blood_pressure_systolic && v.blood_pressure_diastolic) ? v.blood_pressure_systolic + '/' + v.blood_pressure_diastolic : '-';
      const hr = v.heart_rate ? v.heart_rate + ' bpm' : '-';
      const sugar = v.blood_sugar_fasting || v.blood_sugar_pp || v.blood_sugar_random || '-';
      const weight = v.weight ? v.weight + ' kg' : '-';
      const bmi = v.bmi ? parseFloat(v.bmi).toFixed(1) : '-';
      const spo2 = v.spo2 ? v.spo2 + '%' : '-';
      const temp = v.temperature ? v.temperature + '°' + (v.temperature_unit || 'F') : '-';
      const sourceIcon = v.source === 'doctor' ? '<i class="fas fa-user-md text-primary" title="Recorded by Doctor/Health Worker"></i>' : '<i class="fas fa-user text-success" title="Self-recorded"></i>';

      html += '<tr>';
      html += '<td>' + date + ' ' + sourceIcon + '</td>';
      html += '<td>' + bp + '</td>';
      html += '<td>' + hr + '</td>';
      html += '<td>' + sugar + '</td>';
      html += '<td>' + weight + '</td>';
      html += '<td>' + bmi + '</td>';
      html += '<td>' + spo2 + '</td>';
      html += '<td>' + temp + '</td>';
      if (v.source === 'self') {
        const realId = v.id.replace('sv_', '');
        html += '<td><button class="btn btn-sm btn-outline-danger" onclick="deleteVital(\'' + realId + '\')"><i class="fas fa-trash"></i></button></td>';
      } else {
        html += '<td><span class="text-muted">-</span></td>';
      }
      html += '</tr>';
    }
    tbody.innerHTML = html;
    renderPagination(vitals.length, totalPages);
  }

  function renderPagination(totalRecords, totalPages) {
    let paginationContainer = document.getElementById('vitalsPagination');
    if (!paginationContainer) {
      const tableWrapper = document.querySelector('.vitals-history-section .table-responsive');
      if (tableWrapper) {
        const div = document.createElement('div');
        div.id = 'vitalsPagination';
        div.className = 'vitals-pagination d-flex justify-content-between align-items-center mt-3 pt-3 border-top';
        tableWrapper.after(div);
        paginationContainer = div;
      }
    }
    if (!paginationContainer) return;

    if (totalPages <= 1) {
      paginationContainer.innerHTML = '<span class="text-muted">Showing all ' + totalRecords + ' records</span>';
      return;
    }

    const startRecord = (currentPage - 1) * rowsPerPage + 1;
    const endRecord = Math.min(currentPage * rowsPerPage, totalRecords);

    let html = '<span class="text-muted">Showing ' + startRecord + '-' + endRecord + ' of ' + totalRecords + '</span>';
    html += '<div class="pagination-btns">';
    html += '<button class="btn btn-sm btn-outline-secondary me-2" onclick="vitalsGoToPage(' + (currentPage - 1) + ')" ' + (currentPage === 1 ? 'disabled' : '') + '><i class="fas fa-chevron-left"></i></button>';
    for (let i = 1; i <= totalPages; i++) {
      if (i === currentPage) {
        html += '<button class="btn btn-sm btn-danger me-1">' + i + '</button>';
      } else {
        html += '<button class="btn btn-sm btn-outline-secondary me-1" onclick="vitalsGoToPage(' + i + ')">' + i + '</button>';
      }
    }
    html += '<button class="btn btn-sm btn-outline-secondary ms-1" onclick="vitalsGoToPage(' + (currentPage + 1) + ')" ' + (currentPage === totalPages ? 'disabled' : '') + '><i class="fas fa-chevron-right"></i></button>';
    html += '</div>';
    paginationContainer.innerHTML = html;
  }

  function hidePagination() {
    const paginationContainer = document.getElementById('vitalsPagination');
    if (paginationContainer) paginationContainer.innerHTML = '';
  }

  window.vitalsGoToPage = function (page) {
    currentPage = page;
    renderVitalsTable(vitalsData);
  };

  function updateVitalsKPIs(vitals) {
    if (!vitals || vitals.length === 0) return;

    const heartData = vitals.find(v => v.blood_pressure_systolic || v.heart_rate);
    if (heartData) {
      const bp = heartData.blood_pressure_systolic && heartData.blood_pressure_diastolic ? heartData.blood_pressure_systolic + '/' + heartData.blood_pressure_diastolic + ' mmHg' : '--/-- mmHg';
      const hr = heartData.heart_rate ? heartData.heart_rate + ' bpm' : '-- bpm';
      const el = document.getElementById('heartWatchValues');
      if (el) el.innerHTML = '<span class="kpi-value-main">' + bp + '</span><span class="kpi-value-sub"><b>' + hr + '</b></span>';
    }

    const diabetesData = vitals.find(v => v.blood_sugar_fasting || v.blood_sugar_pp || v.blood_sugar_random);
    if (diabetesData) {
      const sugar = diabetesData.blood_sugar_fasting || diabetesData.blood_sugar_pp || diabetesData.blood_sugar_random;
      const el = document.getElementById('diabetesWatchValues');
      if (el) el.innerHTML = '<span class="kpi-value-main">' + sugar + ' mg/dL</span>';
    }

    const obeseData = vitals.find(v => v.weight || v.bmi);
    if (obeseData) {
      const el = document.getElementById('obeseWatchValues');
      if (el) el.innerHTML = '<span class="kpi-value-main">' + (obeseData.weight || '--') + ' kg</span><span class="kpi-value-sub">BMI: ' + (obeseData.bmi ? parseFloat(obeseData.bmi).toFixed(1) : '--') + '</span>';
    }
  }

  window.deleteVital = async function (id) {
    if (!confirm('Delete this vital record?')) return;
    try {
      const res = await fetch('/api/vitals/' + id, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) loadVitalsData(currentDaysFilter);
      else alert('Error: ' + data.error);
    } catch (e) { alert('Error: ' + e.message); }
  };

  function destroyExistingChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();
  }

  function renderVitalsCharts(vitals) {
    if (typeof Chart === 'undefined') return;
    if (!vitals || vitals.length === 0) return;

    destroyExistingChart('heartRateChart');
    destroyExistingChart('bloodSugarChart');
    destroyExistingChart('weightBmiChart');
    destroyExistingChart('tempSpo2Chart');

    const sorted = [...vitals].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
    const labels = sorted.map(v => {
      const d = new Date(v.recorded_at);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    });

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      interaction: { intersect: false, mode: 'index' },
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12 } } },
      scales: {
        x: { title: { display: true, text: 'Date' }, grid: { color: 'rgba(0,0,0,0.05)' } },
        y: { title: { display: true, text: 'Value' }, grid: { color: 'rgba(0,0,0,0.08)' }, beginAtZero: false }
      },
      elements: { line: { tension: 0.3, borderWidth: 2 }, point: { radius: 5, hoverRadius: 7, borderWidth: 2, backgroundColor: '#fff' } }
    };

    const hrCtx = document.getElementById('heartRateChart');
    if (hrCtx) {
      new Chart(hrCtx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            { label: 'Systolic BP', data: sorted.map(v => v.blood_pressure_systolic), borderColor: '#e74c3c', pointBorderColor: '#e74c3c', pointBackgroundColor: '#fff' },
            { label: 'Diastolic BP', data: sorted.map(v => v.blood_pressure_diastolic), borderColor: '#9b59b6', pointBorderColor: '#9b59b6', pointBackgroundColor: '#fff' },
            { label: 'Heart Rate', data: sorted.map(v => v.heart_rate), borderColor: '#3498db', pointBorderColor: '#3498db', pointBackgroundColor: '#fff' }
          ]
        },
        options: chartOptions
      });
    }

    const sugarCtx = document.getElementById('bloodSugarChart');
    if (sugarCtx) {
      new Chart(sugarCtx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            { label: 'Blood Sugar', data: sorted.map(v => v.blood_sugar_fasting || v.blood_sugar_pp || v.blood_sugar_random), borderColor: '#3498db', pointBorderColor: '#3498db', pointBackgroundColor: '#fff' }
          ]
        },
        options: chartOptions
      });
    }

    const bmiCtx = document.getElementById('weightBmiChart');
    if (bmiCtx) {
      new Chart(bmiCtx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            { label: 'Weight (kg)', data: sorted.map(v => v.weight), borderColor: '#27ae60', pointBorderColor: '#27ae60', pointBackgroundColor: '#fff' },
            { label: 'BMI', data: sorted.map(v => v.bmi), borderColor: '#16a085', pointBorderColor: '#16a085', pointBackgroundColor: '#fff' }
          ]
        },
        options: chartOptions
      });
    }

    const tempCtx = document.getElementById('tempSpo2Chart');
    if (tempCtx) {
      new Chart(tempCtx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            { label: 'Temperature', data: sorted.map(v => v.temperature), borderColor: '#f39c12', pointBorderColor: '#f39c12', pointBackgroundColor: '#fff' },
            { label: 'SpO2 (%)', data: sorted.map(v => v.spo2), borderColor: '#3498db', pointBorderColor: '#3498db', pointBackgroundColor: '#fff' }
          ]
        },
        options: chartOptions
      });
    }
  }

  function initVitals() {
    const weightEl = document.getElementById('weight');
    const heightEl = document.getElementById('height');
    if (weightEl) weightEl.addEventListener('input', calculateBMI);
    if (heightEl) heightEl.addEventListener('input', calculateBMI);

    document.querySelectorAll('.history-filters .filter-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.history-filters .filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentPage = 1;
        loadVitalsData(parseInt(this.dataset.days) || 0);
      });
    });

    document.querySelectorAll('#chartFilterBtns .filter-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#chartFilterBtns .filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        loadVitalsData(parseInt(this.dataset.range) || 7);
      });
    });

    const vitalsPage = document.getElementById('my-vitals-page');
    if (vitalsPage) {
      const observer = new MutationObserver(function () {
        const display = window.getComputedStyle(vitalsPage).display;
        if (display !== 'none') loadVitalsData(currentDaysFilter);
      });
      observer.observe(vitalsPage, { attributes: true, attributeFilter: ['style', 'class'] });
    }

    setTimeout(function () {
      const vp = document.getElementById('my-vitals-page');
      if (vp && window.getComputedStyle(vp).display !== 'none') loadVitalsData(currentDaysFilter);
    }, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initVitals);
  else initVitals();
})();
