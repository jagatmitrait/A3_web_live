// Family History Module
// Handles dashboard, CRUD, and file uploads for Family Medical History

(function () {
    const FAMILY_HISTORY_MAX_FILES = 3;
    const FAMILY_HISTORY_MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    const ALLOWED_EXTS = ['pdf', 'jpg', 'jpeg', 'png'];

    const state = {
        q: '',
        relation: '',
        condition: '',
        records: []
    };

    const $id = (id) => document.getElementById(id);

    const debounce = (fn, delay = 300) => {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), delay);
        };
    };

    // =============================
    // DASHBOARD: DATA FETCHING
    // =============================

    async function loadFamilyHistoryData() {
        const page = document.getElementById('family-history-page');
        if (!page) return;

        const params = new URLSearchParams();
        if (state.q) params.set('q', state.q);
        if (state.relation) params.set('relation', state.relation);
        if (state.condition) params.set('condition', state.condition);

        try {
            const res = await fetch('/api/family-history?' + params.toString());
            const data = await res.json();
            if (!data.success) {
                console.error('Failed to load family history:', data.message);
                return;
            }

            state.records = data.records;
            renderStats(data.stats);
            renderCards(data.records);
        } catch (err) {
            console.error('Error loading family history:', err);
        }
    }

    function renderStats(stats) {
        if (!stats) return;
        const setText = (id, val) => {
            const el = $id(id);
            if (el) el.textContent = val;
        };

        setText('fhStatTotal', stats.total || 0);
        setText('fhStatConditions', stats.withConditions || 0);
        setText('fhStatGenetic', stats.genetic || 0);

        const updated = stats.lastUpdated ? String(stats.lastUpdated).split('T')[0] : 'N/A';
        setText('fhStatUpdated', updated);
    }

    function renderCards(records) {
        const container = $id('fhCardsContainer');
        const empty = $id('fhEmptyState');
        if (!container) return;

        container.innerHTML = '';
        if (!records || !records.length) {
            if (empty) empty.style.display = 'block';
            return;
        }

        if (empty) empty.style.display = 'none';

        records.forEach(record => {
            const html = buildCard(record);
            container.insertAdjacentHTML('beforeend', html);
        });
    }

    function buildCard(record) {
        const conditions = record.medicalConditions || [];
        const conditionBadges = conditions.slice(0, 3).map(c =>
            `<span class="badge bg-light text-dark border me-1">${c}</span>`
        ).join('');

        const moreCount = conditions.length > 3 ? `+${conditions.length - 3} more` : '';

        const statusColor = record.livingStatus === 'Alive' ? 'success' : 'secondary';
        const ageLabel = record.livingStatus === 'Alive' ? 'Age' : 'Age at death';

        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title mb-0">${record.relation}</h5>
                            <span class="badge bg-${statusColor}">${record.livingStatus}</span>
                        </div>
                        <p class="text-muted small mb-3">
                            ${ageLabel}: ${record.age || 'N/A'} • Gender: ${record.gender || 'N/A'}
                        </p>
                        
                        <div class="mb-3">
                            <small class="text-muted d-block mb-1">Key Conditions:</small>
                            ${conditionBadges || '<span class="text-muted small">None recorded</span>'}
                            ${moreCount ? `<small class="text-muted">${moreCount}</small>` : ''}
                        </div>

                        <div class="d-flex justify-content-end gap-2 mt-auto">
                            <button class="btn btn-sm btn-outline-primary js-view-fh" data-id="${record.id}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary js-edit-fh" data-id="${record.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <a href="/family-history/pdf/${record.id}" class="btn btn-sm btn-outline-info" title="Download PDF">
                                <i class="fas fa-file-pdf"></i>
                            </a>
                            <button class="btn btn-sm btn-outline-danger js-delete-fh" data-id="${record.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // =============================
    // FORM HANDLING
    // =============================

    function initForm(mode, record = null) {
        const form = $id('familyHistoryForm');
        if (!form) return;

        form.reset();
        $id('fhId').value = record ? record.id : '';
        $id('fhMode').value = mode;
        $id('fhFilePreview').innerHTML = '';
        $id('fhFileError').style.display = 'none';

        // Enable/Disable inputs
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(el => el.disabled = (mode === 'view'));

        // Show/Hide Save Button
        const saveBtn = form.closest('.modal-content').querySelector('.modal-footer .btn-primary');
        if (saveBtn) saveBtn.style.display = (mode === 'view') ? 'none' : 'block';

        // Update Action
        if (mode === 'edit' && record) {
            form.action = `/family-history/edit/${record.id}`;
        } else {
            form.action = '/family-history/add';
        }

        if ((mode === 'edit' || mode === 'view') && record) {
            // Populate fields
            if (form.relation) form.relation.value = record.relation;
            if (form.living_status) form.living_status.value = record.livingStatus;
            if (form.age) form.age.value = record.age;
            if (form.gender) form.gender.value = record.gender;
            if (form.notes) form.notes.value = (record.conditionDetails && record.conditionDetails.length > 0) ? record.conditionDetails[0].notes : '';

            // Checkboxes
            const conditions = record.medicalConditions || [];
            form.querySelectorAll('input[name="medical_conditions"]').forEach(cb => {
                cb.checked = conditions.includes(cb.value);
            });

            // Documents
            if (record.documents && record.documents.length) {
                const preview = $id('fhFilePreview');
                record.documents.forEach(doc => {
                    const div = document.createElement('div');
                    div.className = 'd-flex align-items-center justify-content-between border p-2 mb-1 rounded';
                    div.innerHTML = `
                        <span class="small text-truncate" style="max-width: 200px;">${doc.original_name}</span>
                        ${mode !== 'view' ? `
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" name="remove_documents" value="${doc.stored_name}" id="rm_${doc.stored_name}">
                            <label class="form-check-label small text-danger" for="rm_${doc.stored_name}">Remove</label>
                        </div>` : ''}
                        <a href="/family-history/document/${record.id}/${doc.original_name}" target="_blank" class="btn btn-sm btn-link"><i class="fas fa-download"></i></a>
                    `;
                    preview.appendChild(div);
                });
            }
        }
    }

    // =============================
    // INITIALIZATION
    // =============================

    function init() {
        const page = $id('family-history-page');
        if (!page) return;

        // Filters
        const searchInput = $id('fhSearchInput');
        const relationFilter = $id('fhRelationFilter');
        const conditionFilter = $id('fhConditionFilter');
        const resetBtn = $id('fhResetFilters');

        const debouncedLoad = debounce(loadFamilyHistoryData, 300);

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                state.q = e.target.value;
                debouncedLoad();
            });
        }
        if (relationFilter) {
            relationFilter.addEventListener('change', (e) => {
                state.relation = e.target.value;
                loadFamilyHistoryData();
            });
        }
        if (conditionFilter) {
            conditionFilter.addEventListener('change', (e) => {
                state.condition = e.target.value;
                loadFamilyHistoryData();
            });
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                state.q = '';
                state.relation = '';
                state.condition = '';
                if (searchInput) searchInput.value = '';
                if (relationFilter) relationFilter.value = '';
                if (conditionFilter) conditionFilter.value = '';
                loadFamilyHistoryData();
            });
        }

        // Add Button
        const addBtn = $id('addFamilyHistoryBtn');
        const emptyAddBtn = $id('fhEmptyAddBtn');

        const openAdd = () => {
            const modalEl = $id('familyHistoryModal');
            if (modalEl) {
                const modal = new bootstrap.Modal(modalEl);
                initForm('add');
                modal.show();
            }
        };

        if (addBtn) addBtn.addEventListener('click', openAdd);
        if (emptyAddBtn) emptyAddBtn.addEventListener('click', openAdd);

        // Save button click handler
        const saveBtn = $id('fhSaveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const form = $id('familyHistoryForm');
                if (!form) return;

                // Check form validity
                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;
                }

                const formData = new FormData(form);
                const url = form.action;

                saveBtn.disabled = true;
                saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';

                try {
                    const res = await fetch(url, {
                        method: 'POST',
                        body: formData
                    });
                    const data = await res.json();

                    if (data.success) {
                        // Close modal
                        const modalEl = $id('familyHistoryModal');
                        const modal = bootstrap.Modal.getInstance(modalEl);
                        if (modal) modal.hide();

                        // Reload data
                        loadFamilyHistoryData();

                        // Reset form
                        form.reset();

                        // Show success
                        alert('Record saved successfully');
                    } else {
                        alert(data.message || 'Error saving record');
                    }
                } catch (err) {
                    console.error(err);
                    alert('An unexpected error occurred');
                } finally {
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Save Record';
                }
            });
        }

        // Form Submission (Event Delegation)
        document.addEventListener('submit', async (e) => {
            if (e.target && e.target.id === 'familyHistoryForm') {
                e.preventDefault();

                const form = e.target;
                const formData = new FormData(form);
                const url = form.action;
                const submitBtn = document.querySelector('button[form="familyHistoryForm"]');

                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
                }

                try {
                    const res = await fetch(url, {
                        method: 'POST',
                        body: formData
                    });
                    const data = await res.json();

                    if (data.success) {
                        // Close modal
                        const modalEl = $id('familyHistoryModal');
                        const modal = bootstrap.Modal.getInstance(modalEl);
                        if (modal) modal.hide();

                        // Reload data
                        loadFamilyHistoryData();

                        // Show success
                        alert('Record saved successfully');
                    } else {
                        alert(data.message || 'Error saving record');
                    }
                } catch (err) {
                    console.error(err);
                    alert('An unexpected error occurred');
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Save Record';
                    }
                }
            }
        });

        // Event Delegation for Actions
        document.body.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.js-delete-fh');
            if (deleteBtn) {
                e.preventDefault();
                e.stopPropagation();
                if (!confirm('Are you sure you want to delete this record?')) return;
                const id = deleteBtn.dataset.id;
                try {
                    const res = await fetch(`/family-history/delete/${id}`, { method: 'POST' });
                    const data = await res.json();
                    if (data.success) {
                        loadFamilyHistoryData();
                    } else {
                        alert(data.message);
                    }
                } catch (err) {
                    console.error(err);
                    alert('Error deleting record');
                }
                return;
            }

            const editBtn = e.target.closest('.js-edit-fh');
            if (editBtn) {
                const id = parseInt(editBtn.dataset.id);
                const record = state.records.find(r => r.id === id);
                if (record) {
                    const modalEl = $id('familyHistoryModal');
                    if (modalEl) {
                        const modal = new bootstrap.Modal(modalEl);
                        initForm('edit', record);
                        modal.show();
                    }
                }
                return;
            }

            const viewBtn = e.target.closest('.js-view-fh');
            if (viewBtn) {
                const id = parseInt(viewBtn.dataset.id);
                const record = state.records.find(r => r.id === id);
                if (record) {
                    const modalEl = $id('familyHistoryModal');
                    if (modalEl) {
                        const modal = new bootstrap.Modal(modalEl);
                        initForm('view', record);
                        modal.show();
                    }
                }
                return;
            }
        });

        // Initial Load
        loadFamilyHistoryData();

        // Reload on nav click
        const navItem = document.querySelector('.nav-item[data-page="family-history"]');
        if (navItem) {
            navItem.addEventListener('click', () => {
                loadFamilyHistoryData();
            });
        }
    }

    // Expose init globally if needed, or just run on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', init);

})();
