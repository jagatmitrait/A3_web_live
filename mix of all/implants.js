// Implants module for client dashboard - Enhanced version
(function () {
    'use strict';

    const state = { records: [], currentEditId: null, initialized: false };
    function $(id) { return document.getElementById(id); }
    let modal = null;

    // Implant device suggestions by category
    const implantSuggestions = {
        'Pacemaker': ['Single Chamber Pacemaker', 'Dual Chamber Pacemaker', 'Biventricular Pacemaker', 'Leadless Pacemaker', 'ICD (Defibrillator)'],
        'Stent': ['Coronary Stent', 'Drug-eluting Stent', 'Bare-metal Stent', 'Carotid Stent', 'Peripheral Stent'],
        'Prosthetic': ['Dental Implant', 'Cochlear Implant', 'Breast Implant', 'Penile Implant', 'Artificial Eye'],
        'Joint Replacement': ['Hip Prosthesis', 'Knee Prosthesis', 'Shoulder Prosthesis', 'Ankle Prosthesis', 'Elbow Prosthesis'],
        'Other': ['Spinal Cord Stimulator', 'Insulin Pump', 'Neurostimulator', 'Port-a-Cath', 'Bone Screws/Plates', 'Mesh Implant']
    };

    async function loadData() {
        try {
            const response = await fetch('/api/implants');
            const data = await response.json();
            if (!data.success) return;
            state.records = data.implants || [];
            renderCards(data.implants);
        } catch (error) {
            console.error('Error loading implant data:', error);
        }
    }

    function renderCards(implants) {
        const container = $('implantCardsContainer');
        const emptyState = $('implantEmptyState');
        if (!container) return;

        container.innerHTML = '';
        if (!implants || implants.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        if (emptyState) emptyState.style.display = 'none';
        implants.forEach(i => container.appendChild(buildCard(i)));
    }

    function buildCard(i) {
        const col = document.createElement('div');
        col.className = 'col-md-6 mb-3';
        const statusColors = {
            'Active': '#4caf50', 'Explanted': '#9e9e9e', 'Recall': '#f44336', 'Failed': '#ff9800'
        };
        const color = statusColors[i.status] || '#666';

        // Use camelCase field names from API (implantationDate, deviceName, etc.)
        const deviceName = i.deviceName || i.device_name || 'Unknown Device';
        const implantDate = i.implantationDate || i.implantation_date || 'N/A';
        const modelNumber = i.modelNumber || i.model_number || '';
        const serialNumber = i.serialNumber || i.serial_number || '';
        const expiryDate = i.warrantyExpiry || i.warranty_expiry || '';

        col.innerHTML = `
      <div class="card">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h5 class="mb-0">${deviceName}</h5>
              ${i.category ? `<small class="text-muted">${i.category}</small>` : ''}
            </div>
            <span class="badge" style="background-color: ${color}">${i.status || 'Active'}</span>
          </div>
          <p class="mb-2"><strong>Implant Date:</strong> ${implantDate}</p>
          ${i.manufacturer ? `<p class="mb-2"><strong>Manufacturer:</strong> ${i.manufacturer}</p>` : ''}
          ${modelNumber ? `<p class="mb-2"><strong>Model:</strong> ${modelNumber}</p>` : ''}
          ${serialNumber ? `<p class="text-muted small">Serial: ${serialNumber}</p>` : ''}
          ${expiryDate ? `<p class="text-warning small"><i class="fas fa-exclamation-triangle"></i> Expires: ${expiryDate}</p>` : ''}
          <div class="mt-3 d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" onclick="editImplant(${i.id})">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteImplant(${i.id})">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </div>
      </div>
    `;
        return col;
    }

    function updateImplantSuggestions() {
        const category = $('implantCategory')?.value;
        const deviceInput = $('deviceName');
        const datalistId = 'implantSuggestions';

        let datalist = document.getElementById(datalistId);
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = datalistId;
            document.body.appendChild(datalist);
            if (deviceInput) deviceInput.setAttribute('list', datalistId);
        }

        datalist.innerHTML = '';
        const suggestions = implantSuggestions[category] || [];
        suggestions.forEach(s => {
            const option = document.createElement('option');
            option.value = s;
            datalist.appendChild(option);
        });
    }

    function openModal(id = null) {
        const modalEl = $('implantModal');
        if (!modalEl) return;
        if (!modal) modal = new bootstrap.Modal(modalEl);

        state.currentEditId = id;
        const title = $('implantModalTitle');
        const form = $('implantForm');

        if (id) {
            title.textContent = 'Edit Implant';
            const record = state.records.find(r => r.id === id);
            if (record) {
                $('implantId').value = record.id;
                // Use camelCase field names from API (deviceName, implantationDate, etc.)
                if ($('deviceName')) $('deviceName').value = record.deviceName || record.device_name || '';
                if ($('implantCategory')) $('implantCategory').value = record.category || '';
                if ($('implantDate')) $('implantDate').value = record.implantationDate || record.implantation_date || '';
                if ($('implantStatus')) $('implantStatus').value = record.status || 'Active';
                if ($('implantManufacturer')) $('implantManufacturer').value = record.manufacturer || '';
                if ($('modelNumber')) $('modelNumber').value = record.modelNumber || record.model_number || '';
                if ($('serialNumber')) $('serialNumber').value = record.serialNumber || record.serial_number || '';
                if ($('expiryDate')) $('expiryDate').value = record.warrantyExpiry || record.warranty_expiry || '';
                if ($('implantSurgeon')) $('implantSurgeon').value = record.surgeonName || record.surgeon_name || '';
                if ($('implantHospital')) $('implantHospital').value = record.hospitalName || record.hospital_name || '';
                if ($('implantNotes')) $('implantNotes').value = record.notes || '';
                updateImplantSuggestions();
            }
        } else {
            title.textContent = 'Add Implant';
            form.reset();
            $('implantId').value = '';
        }
        modal.show();
    }

    async function saveImplant(e) {
        if (e) e.preventDefault();

        const form = $('implantForm');
        if (!form.checkValidity()) { form.reportValidity(); return; }

        const saveBtn = $('saveImplantBtn');
        if (saveBtn.disabled) return;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const id = $('implantId').value;
        const data = {
            device_name: $('deviceName')?.value || '',
            implantation_date: $('implantDate')?.value || '',
            manufacturer: $('implantManufacturer')?.value || '',
            model_number: $('modelNumber')?.value || '',
            serial_number: $('serialNumber')?.value || '',
            category: $('implantCategory')?.value || '',
            status: $('implantStatus')?.value || 'Active',
            expiry_date: $('expiryDate')?.value || '',
            surgeon_name: $('implantSurgeon')?.value || '',
            hospital_name: $('implantHospital')?.value || '',
            notes: $('implantNotes')?.value || ''
        };

        const url = id ? `/api/implants/${id}` : '/api/implants';
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
            console.error('Error saving implant:', error);
            alert('Failed to save implant');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save';
        }
    }

    async function deleteRecord(id) {
        if (!confirm('Are you sure you want to delete this implant record?')) return;
        try {
            const response = await fetch(`/api/implants/${id}`, { method: 'DELETE' });
            const data = await response.json();
            if (data.success) loadData();
            else alert('Error: ' + (data.message || data.error));
        } catch (error) {
            console.error('Error deleting implant:', error);
            alert('Failed to delete implant');
        }
    }

    function init() {
        if (state.initialized) return;

        const page = $('implantation-page');
        if (!page) return;

        state.initialized = true;

        const addBtn = $('addImplantBtn');
        const emptyAddBtn = $('implantEmptyAddBtn');
        const saveBtn = $('saveImplantBtn');

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
            newSaveBtn.addEventListener('click', saveImplant);
        }

        // Category change for auto-suggest
        const categorySelect = $('implantCategory');
        if (categorySelect) {
            categorySelect.addEventListener('change', updateImplantSuggestions);
        }

        // Fix modal backdrop issue
        const modalEl = $('implantModal');
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

    window.editImplant = (id) => openModal(id);
    window.deleteImplant = deleteRecord;
    window.loadImplantData = loadData;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
