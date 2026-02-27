// Allergy module for client dashboard - Enhanced with auto-suggest
(function () {
  'use strict';

  const state = { records: [], currentEditId: null, initialized: false };
  function $(id) { return document.getElementById(id); }
  let modal = null;

  // Auto-suggest allergens by category
  const allergenSuggestions = {
    'Food': ['Peanuts', 'Tree Nuts', 'Milk', 'Eggs', 'Wheat', 'Soy', 'Fish', 'Shellfish', 'Sesame', 'Gluten'],
    'Drug': ['Penicillin', 'Aspirin', 'Ibuprofen', 'Sulfa drugs', 'Insulin', 'Codeine', 'Morphine', 'Anesthetics', 'Contrast dye', 'Chemotherapy drugs'],
    'Environmental': ['Dust mites', 'Pollen', 'Mold', 'Pet dander', 'Latex', 'Insect stings', 'Bee venom', 'Grass', 'Ragweed', 'Cockroaches'],
    'Other': ['Sun exposure', 'Certain fabrics', 'Nickel', 'Cosmetics', 'Fragrance', 'Cleaning products', 'Adhesives']
  };

  async function loadData() {
    try {
      const response = await fetch('/api/allergies');
      const data = await response.json();
      if (!data.success) return;
      state.records = data.allergies || [];
      renderCards(data.allergies);
    } catch (error) {
      console.error('Error loading allergy data:', error);
    }
  }

  function renderCards(allergies) {
    const container = $('allergyCardContainer');
    const emptyState = $('allergyEmptyState');
    if (!container) return;

    container.innerHTML = '';
    if (!allergies || allergies.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';

    allergies.forEach(a => container.appendChild(buildCard(a)));
  }

  function buildCard(a) {
    const col = document.createElement('div');
    col.className = 'col-md-6 mb-3';
    const severityColors = {
      'life-threatening': '#d32f2f', 'severe': '#f44336',
      'moderate': '#ff9800', 'mild': '#4caf50'
    };
    const color = severityColors[a.severity?.toLowerCase()] || '#666';

    col.innerHTML = `
      <div class="card">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h5 class="mb-0">${a.allergen || 'Unknown'}</h5>
              ${a.category ? `<small class="text-muted">${a.category}</small>` : ''}
            </div>
            <span class="badge" style="background-color: ${color}">${a.severity || 'N/A'}</span>
          </div>
          ${a.reaction ? `<p class="mb-2"><strong>Reaction:</strong> ${a.reaction}</p>` : ''}
          ${a.diagnosedDate ? `<p class="text-muted small">First Reaction: ${a.diagnosedDate}</p>` : ''}
          <div class="mt-3 d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" onclick="editAllergy(${a.id})">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteAllergy(${a.id})">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </div>
      </div>
    `;
    return col;
  }

  function updateAllergenSuggestions() {
    const category = $('allergyCategory')?.value;
    const allergenInput = $('allergen');
    const datalistId = 'allergenSuggestions';

    // Remove existing datalist
    let datalist = document.getElementById(datalistId);
    if (!datalist) {
      datalist = document.createElement('datalist');
      datalist.id = datalistId;
      document.body.appendChild(datalist);
      if (allergenInput) allergenInput.setAttribute('list', datalistId);
    }

    // Clear and populate with new suggestions
    datalist.innerHTML = '';
    const suggestions = allergenSuggestions[category] || [];
    suggestions.forEach(s => {
      const option = document.createElement('option');
      option.value = s;
      datalist.appendChild(option);
    });
  }

  function openModal(id = null) {
    const modalEl = $('allergyModal');
    if (!modalEl) return;
    if (!modal) modal = new bootstrap.Modal(modalEl);

    state.currentEditId = id;
    const title = $('allergyModalTitle');
    const form = $('allergyForm');

    if (id) {
      title.textContent = 'Edit Allergy';
      const record = state.records.find(r => r.id === id);
      if (record) {
        $('allergyId').value = record.id;
        if ($('allergyCategory')) $('allergyCategory').value = record.category || '';
        if ($('allergen')) $('allergen').value = record.allergen || '';
        if ($('allergySeverity')) $('allergySeverity').value = record.severity || '';
        if ($('allergyReaction')) $('allergyReaction').value = record.reaction || '';
        if ($('firstReactionDate')) $('firstReactionDate').value = record.diagnosedDate || '';
        if ($('allergyActive')) $('allergyActive').value = record.active !== false ? 'true' : 'false';
        if ($('allergyNotes')) $('allergyNotes').value = record.notes || '';
        updateAllergenSuggestions();
      }
    } else {
      title.textContent = 'Add Allergy';
      form.reset();
      $('allergyId').value = '';
    }
    modal.show();
  }

  async function saveAllergy(e) {
    if (e) e.preventDefault();

    const form = $('allergyForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }

    // Prevent double submission
    const saveBtn = $('saveAllergyBtn');
    if (saveBtn.disabled) return;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    const id = $('allergyId').value;
    const data = {
      allergen: $('allergen')?.value || '',
      severity: $('allergySeverity')?.value || '',
      reaction: $('allergyReaction')?.value || '',
      diagnosed_date: $('firstReactionDate')?.value || '',
      category: $('allergyCategory')?.value || '',
      active: $('allergyActive')?.value === 'true',
      notes: $('allergyNotes')?.value || ''
    };

    const url = id ? `/api/allergies/${id}` : '/api/allergies';
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
      console.error('Error saving allergy:', error);
      alert('Failed to save allergy');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = 'Save';
    }
  }

  async function deleteRecord(id) {
    if (!confirm('Are you sure you want to delete this allergy record?')) return;
    try {
      const response = await fetch(`/api/allergies/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) loadData();
      else alert('Error: ' + (data.message || data.error));
    } catch (error) {
      console.error('Error deleting allergy:', error);
      alert('Failed to delete allergy');
    }
  }

  function init() {
    // Prevent double initialization
    if (state.initialized) return;

    const page = $('allergy-page');
    if (!page) return;

    state.initialized = true;

    // Remove old listeners by cloning and replacing buttons
    const addBtns = document.querySelectorAll('.js-add-allergy, #addAllergyBtn');
    addBtns.forEach(btn => {
      if (btn) {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', () => openModal());
      }
    });

    const saveBtn = $('saveAllergyBtn');
    if (saveBtn) {
      const newSaveBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
      newSaveBtn.addEventListener('click', saveAllergy);
    }

    // Add category change listener for auto-suggest
    const categorySelect = $('allergyCategory');
    if (categorySelect) {
      categorySelect.addEventListener('change', updateAllergenSuggestions);
    }

    // Fix modal backdrop issue
    const modalEl = $('allergyModal');
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

  window.editAllergy = (id) => openModal(id);
  window.deleteAllergy = deleteRecord;
  window.loadAllergyData = loadData;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
