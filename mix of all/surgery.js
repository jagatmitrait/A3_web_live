// Surgery module for client dashboard - Enhanced version
(function () {
  'use strict';

  const state = { records: [], currentEditId: null, initialized: false };
  function $(id) { return document.getElementById(id); }
  let modal = null;

  // Surgery type suggestions by category
  const surgerySuggestions = {
    'Orthopedic': ['Hip Replacement', 'Knee Replacement', 'Spinal Fusion', 'ACL Reconstruction', 'Rotator Cuff Repair', 'Arthroscopy', 'Fracture Fixation'],
    'Cardiac': ['Bypass Surgery (CABG)', 'Valve Replacement', 'Angioplasty', 'Pacemaker Implant', 'Heart Transplant', 'Stent Placement'],
    'Neurological': ['Brain Tumor Removal', 'Spinal Decompression', 'Shunt Placement', 'Craniotomy', 'Deep Brain Stimulation'],
    'General': ['Appendectomy', 'Cholecystectomy', 'Hernia Repair', 'Mastectomy', 'Thyroidectomy', 'Hysterectomy'],
    'Other': ['Cataract Surgery', 'LASIK', 'Cosmetic Surgery', 'Organ Transplant', 'Biopsy']
  };

  async function loadData() {
    try {
      const response = await fetch('/api/surgery');
      const data = await response.json();
      if (!data.success) return;
      state.records = data.surgeries || [];
      renderCards(data.surgeries);
    } catch (error) {
      console.error('Error loading surgery data:', error);
    }
  }

  function renderCards(surgeries) {
    const container = $('surgeryCardsContainer');
    const emptyState = $('surgeryEmptyState');
    if (!container) return;

    container.innerHTML = '';
    if (!surgeries || surgeries.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';
    surgeries.forEach(s => container.appendChild(buildCard(s)));
  }

  function buildCard(s) {
    const col = document.createElement('div');
    col.className = 'col-md-6 mb-3';
    const outcomeColors = {
      'Successful': '#4caf50', 'Complications': '#ff9800', 'Failed': '#f44336'
    };
    const color = outcomeColors[s.outcome] || '#666';

    // Handle both snake_case (from API) and camelCase field names
    const surgeryName = s.surgery_name || s.surgeryName || s.surgeryType || s.surgery_type || 'Unknown Surgery';
    const surgeryDate = s.surgery_date || s.surgeryDate || 'N/A';
    const category = s.category || '';
    const hospital = s.hospital || '';
    const surgeon = s.surgeon_name || s.surgeon || '';
    const notes = s.post_op_notes || s.notes || '';

    col.innerHTML = `
      <div class="card">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h5 class="mb-0">${surgeryName}</h5>
              ${category ? `<small class="text-muted">${category}</small>` : ''}
            </div>
            ${s.outcome ? `<span class="badge" style="background-color: ${color}">${s.outcome}</span>` : ''}
          </div>
          <p class="mb-2"><strong>Date:</strong> ${surgeryDate}</p>
          ${hospital ? `<p class="mb-2"><strong>Hospital:</strong> ${hospital}</p>` : ''}
          ${surgeon ? `<p class="mb-2"><strong>Surgeon:</strong> ${surgeon}</p>` : ''}
          ${notes ? `<p class="text-muted small">${notes}</p>` : ''}
          <div class="mt-3 d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" onclick="editSurgery(${s.id})">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteSurgery(${s.id})">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </div>
      </div>
    `;
    return col;
  }

  function updateSurgerySuggestions() {
    const category = $('surgeryCategory')?.value;
    const surgeryNameInput = $('surgeryName');
    const datalistId = 'surgerySuggestions';

    let datalist = document.getElementById(datalistId);
    if (!datalist) {
      datalist = document.createElement('datalist');
      datalist.id = datalistId;
      document.body.appendChild(datalist);
      if (surgeryNameInput) surgeryNameInput.setAttribute('list', datalistId);
    }

    datalist.innerHTML = '';
    const suggestions = surgerySuggestions[category] || [];
    suggestions.forEach(s => {
      const option = document.createElement('option');
      option.value = s;
      datalist.appendChild(option);
    });
  }

  function openModal(id = null) {
    const modalEl = $('surgeryModal');
    if (!modalEl) return;
    if (!modal) modal = new bootstrap.Modal(modalEl);

    state.currentEditId = id;
    const title = $('surgeryModalTitle');
    const form = $('surgeryForm');

    if (id) {
      title.textContent = 'Edit Surgery';
      const record = state.records.find(r => r.id === id);
      if (record) {
        $('surgeryId').value = record.id;
        // Handle both snake_case (from API) and camelCase field names
        if ($('surgeryName')) $('surgeryName').value = record.surgery_name || record.surgeryName || '';
        if ($('surgeryType')) $('surgeryType').value = record.surgery_type || record.surgeryType || '';
        if ($('surgeryDate')) $('surgeryDate').value = record.surgery_date || record.surgeryDate || '';
        if ($('surgeryHospital')) $('surgeryHospital').value = record.hospital || '';
        if ($('surgeonName')) $('surgeonName').value = record.surgeon_name || record.surgeon || '';
        if ($('surgeryCategory')) $('surgeryCategory').value = record.category || '';
        if ($('surgeryOutcome')) $('surgeryOutcome').value = record.outcome || '';
        if ($('followUpDate')) $('followUpDate').value = record.follow_up_date || record.followUpDate || '';
        if ($('postOpNotes')) $('postOpNotes').value = record.post_op_notes || record.notes || '';
        updateSurgerySuggestions();
      }
    } else {
      title.textContent = 'Add Surgery';
      form.reset();
      $('surgeryId').value = '';
    }
    modal.show();
  }

  async function saveSurgery(e) {
    if (e) e.preventDefault();

    const form = $('surgeryForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const saveBtn = $('saveSurgeryBtn');
    if (saveBtn.disabled) return;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    const id = $('surgeryId').value;
    const data = {
      surgery_name: $('surgeryName')?.value || '',
      surgery_type: $('surgeryType')?.value || '',
      surgery_date: $('surgeryDate')?.value || '',
      hospital: $('surgeryHospital')?.value || '',
      surgeon: $('surgeonName')?.value || '',
      category: $('surgeryCategory')?.value || '',
      outcome: $('surgeryOutcome')?.value || '',
      follow_up_date: $('followUpDate')?.value || '',
      notes: $('postOpNotes')?.value || ''
    };

    const url = id ? `/api/surgery/${id}` : '/api/surgery';
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
        alert('Error: ' + (result.message || result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving surgery:', error);
      alert('Failed to save surgery');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = 'Save';
    }
  }

  async function deleteRecord(id) {
    if (!confirm('Are you sure you want to delete this surgery record?')) return;
    try {
      const response = await fetch(`/api/surgery/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) loadData();
      else alert('Error: ' + (data.message || data.error));
    } catch (error) {
      console.error('Error deleting surgery:', error);
      alert('Failed to delete surgery');
    }
  }

  function init() {
    if (state.initialized) return;

    const page = $('surgery-page');
    if (!page) return;

    state.initialized = true;

    const addBtn = $('addSurgeryBtn');
    const emptyAddBtn = $('surgeryEmptyAddBtn');
    const saveBtn = $('saveSurgeryBtn');

    // Clone buttons to remove old listeners
    if (addBtn) {
      const newBtn = addBtn.cloneNode(true);
      addBtn.parentNode.replaceChild(newBtn, addBtn);
      newBtn.addEventListener('click', () => openModal());
    }
    if (emptyAddBtn) {
      const newBtn = emptyAddBtn.cloneNode(true);
      emptyAddBtn.parentNode.replaceChild(newBtn, emptyAddBtn);
      newBtn.addEventListener('click', () => openModal());
    }
    if (saveBtn) {
      const newSaveBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
      newSaveBtn.addEventListener('click', saveSurgery);
    }

    // Category change for auto-suggest
    const categorySelect = $('surgeryCategory');
    if (categorySelect) {
      categorySelect.addEventListener('change', updateSurgerySuggestions);
    }

    // Fix modal backdrop issue
    const modalEl = $('surgeryModal');
    if (modalEl) {
      modalEl.addEventListener('hidden.bs.modal', function () {
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) backdrop.remove();
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      });
    }

    loadData();
  }

  window.editSurgery = (id) => openModal(id);
  window.deleteSurgery = deleteRecord;
  window.loadSurgeryData = loadData;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
