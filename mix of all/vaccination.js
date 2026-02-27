// Vaccination module for client dashboard
(function () {
  'use strict';

  const state = {
    records: [],
    currentEditId: null
  };

  function $(id) { return document.getElementById(id); }

  let modal = null;

  // Load vaccination data from API
  async function loadData() {
    try {
      const response = await fetch('/api/vaccination');
      const data = await response.json();

      if (!data.success) {
        console.error('Failed to load vaccination data:', data.message);
        return;
      }

      state.records = data.vaccinations || [];
      if (data.stats) updateStats(data.stats);
      renderCards(data.vaccinations);
    } catch (error) {
      console.error('Error loading vaccination data:', error);
    }
  }

  // Update stats display
  function updateStats(stats) {
    const totalEl = $('vaccinationStatTotal');
    const upcomingEl = $('vaccinationStatUpcoming');
    const overdueEl = $('vaccinationStatOverdue');
    const updatedEl = $('vaccinationStatUpdated');

    if (totalEl) totalEl.textContent = stats.total || 0;
    if (upcomingEl) upcomingEl.textContent = stats.upcoming || 0;
    if (overdueEl) overdueEl.textContent = stats.overdue || 0;
    if (updatedEl) {
      if (stats.last_updated) {
        const date = new Date(stats.last_updated);
        updatedEl.textContent = date.toLocaleDateString('en-CA');
      } else {
        updatedEl.textContent = 'N/A';
      }
    }
  }

  // Render vaccination cards
  function renderCards(vaccinations) {
    const container = $('vaccinationCardContainer');
    const emptyState = $('vaccinationEmptyState');

    if (!container) return;

    container.innerHTML = '';

    if (!vaccinations || vaccinations.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    vaccinations.forEach(v => {
      const card = buildCard(v);
      container.appendChild(card);
    });
  }

  // Build individual vaccination card
  function buildCard(v) {
    const col = document.createElement('div');
    col.className = 'col-md-6 mb-3';

    const statusColors = {
      'completed': '#4CAF50',
      'scheduled': '#2196F3',
      'missed': '#FF9800',
      'upcoming': '#9C27B0',
      'overdue': '#E63946'
    };
    const statusColor = statusColors[v.status?.toLowerCase()] || '#666';

    col.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <h5 class="mb-1">${v.vaccineName || 'Unknown'}</h5>
                            <p class="text-muted small mb-0">${v.category || ''} • ${v.doseNumber || ''}</p>
                        </div>
                        <span class="badge" style="background-color: ${statusColor}">${v.status || 'Unknown'}</span>
                    </div>
                    <p class="mb-2"><strong>Date:</strong> ${v.vaccinationDate || 'N/A'}</p>
                    ${v.nextDueDate ? `<p class="mb-2"><strong>Next Due:</strong> ${v.nextDueDate}</p>` : ''}
                    ${v.manufacturer ? `<p class="text-muted small mb-0">${v.manufacturer}</p>` : ''}
                    <div class="mt-3 d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary" onclick="editVaccination(${v.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteVaccination(${v.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;

    return col;
  }

  // Open modal for add/edit
  function openModal(id = null) {
    const modalEl = $('vaccinationModal');
    if (!modalEl) return;

    if (!modal) modal = new bootstrap.Modal(modalEl);

    const title = $('vaccinationModalTitle');
    const form = $('vaccinationForm');

    state.currentEditId = id;

    if (id) {
      title.textContent = 'Edit Vaccination';
      const record = state.records.find(r => r.id === id);
      if (record) {
        $('vaccinationId').value = record.id;
        $('vaccineName').value = record.vaccineName || '';
        $('vaccinationDate').value = record.vaccinationDate || '';
        $('vaccineCategory').value = record.category || '';
        $('doseNumber').value = record.doseNumber || '';
        $('nextDueDate').value = record.nextDueDate || '';

        // Set status radio button
        const statusRadio = document.querySelector(`input[name="status"][value="${record.status}"]`);
        if (statusRadio) statusRadio.checked = true;

        // Set medical details
        $('manufacturer').value = record.manufacturer || '';
        $('batchLotNumber').value = record.batchLotNumber || '';
        $('hospitalClinicName').value = record.hospitalClinicName || '';
        $('doctorNurseName').value = record.doctorNurseName || '';
        $('sideEffects').value = record.sideEffects || '';
        $('vaccinationNotes').value = record.notes || '';
      }
    } else {
      title.textContent = 'Add Vaccination';
      form.reset();
      $('vaccinationId').value = '';
      // Set default status
      const defaultStatus = document.querySelector('input[name="status"][value="Completed"]');
      if (defaultStatus) defaultStatus.checked = true;
    }

    modal.show();
  }

  // Save vaccination
  async function saveVaccination() {
    const form = $('vaccinationForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const id = $('vaccinationId').value;
    const statusRadio = document.querySelector('input[name="status"]:checked');

    const data = {
      vaccine_name: $('vaccineName').value,
      vaccination_date: $('vaccinationDate').value,
      category: $('vaccineCategory').value,
      dose_number: $('doseNumber').value,
      next_due_date: $('nextDueDate').value || null,
      status: statusRadio ? statusRadio.value : 'Completed',
      manufacturer: $('manufacturer').value || null,
      batch_lot_number: $('batchLotNumber').value || null,
      hospital_clinic_name: $('hospitalClinicName').value || null,
      doctor_nurse_name: $('doctorNurseName').value || null,
      side_effects: $('sideEffects').value || null,
      notes: $('vaccinationNotes').value || null
    };

    const url = id ? `/api/vaccination/${id}` : '/api/vaccination';
    const method = id ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        modal.hide();
        loadData();
      } else {
        alert('Error: ' + result.message);
      }
    } catch (error) {
      console.error('Error saving vaccination:', error);
      alert('Failed to save vaccination');
    }
  }

  // Delete vaccination
  async function deleteRecord(id) {
    if (!confirm('Are you sure you want to delete this vaccination record?')) return;

    try {
      const response = await fetch(`/api/vaccination/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        loadData();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      console.error('Error deleting vaccination:', error);
      alert('Failed to delete vaccination');
    }
  }

  // Initialize module
  function init() {
    const page = $('vaccination-page');
    if (!page) return;

    // Add button handlers (remove old handlers first to prevent duplicates)
    const addBtn = $('addVaccinationBtn');
    const emptyAddBtn = $('vaccinationEmptyAddBtn');
    const saveBtn = $('saveVaccinationBtn');

    if (addBtn) {
      addBtn.replaceWith(addBtn.cloneNode(true));
      $('addVaccinationBtn').addEventListener('click', () => openModal());
    }
    if (emptyAddBtn) {
      emptyAddBtn.replaceWith(emptyAddBtn.cloneNode(true));
      $('vaccinationEmptyAddBtn').addEventListener('click', () => openModal());
    }
    if (saveBtn) {
      saveBtn.replaceWith(saveBtn.cloneNode(true));
      $('saveVaccinationBtn').addEventListener('click', saveVaccination);
    }

    // Fix modal backdrop issue
    const modalEl = $('vaccinationModal');
    if (modalEl) {
      modalEl.addEventListener('hidden.bs.modal', function () {
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) backdrop.remove();
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      });
    }

    // Load initial data
    loadData();
  }

  // Export functions globally
  window.editVaccination = (id) => openModal(id);
  window.deleteVaccination = deleteRecord;
  window.loadVaccinationData = loadData;

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
