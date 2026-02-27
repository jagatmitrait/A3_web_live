/* ============================================
   A3 Health Card - Pharmacy Dashboard JS
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
    // Initial load
    loadInventory();
});

// ==================== INVENTORY MANAGEMENT ====================

function loadInventory() {
    fetch('/api/pharmacy/inventory')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const tbody = document.querySelector('#inventoryTableBody');
                tbody.innerHTML = '';

                if (data.inventory.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No medicines in inventory.</td></tr>';
                    return;
                }

                data.inventory.forEach(item => {
                    const isLowStock = item.stock < 10;
                    const row = `
                        <tr>
                            <td class="fw-bold">${item.name}</td>
                            <td><span class="badge bg-light text-dark border">${item.category || 'N/A'}</span></td>
                            <td>
                                <span class="${isLowStock ? 'text-danger fw-bold' : ''}">
                                    ${item.stock} ${isLowStock ? '<i class="fas fa-exclamation-circle ms-1" title="Low Stock"></i>' : ''}
                                </span>
                            </td>
                            <td>${item.expiry || '-'}</td>
                            <td><small class="text-muted">${item.notes || '-'}</small></td>
                            <td>
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-outline-primary" onclick="editMedicine(${item.id}, '${item.name}', '${item.category}', ${item.stock}, '${item.expiry}', '${item.notes}')">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-outline-danger" onclick="deleteMedicine(${item.id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                    tbody.innerHTML += row;
                });

                // Update Dashboard Stats
                const totalMedicines = data.inventory.length;
                const lowStockCount = data.inventory.filter(item => item.stock < 10).length;

                const totalEl = document.getElementById('totalMedicinesCount');
                const lowStockEl = document.getElementById('lowStockCount');

                if (totalEl) totalEl.textContent = totalMedicines;
                if (lowStockEl) lowStockEl.textContent = lowStockCount;
            }
        })
        .catch(error => console.error('Error loading inventory:', error));
}

function submitAddMedicine() {
    const form = document.getElementById('addMedicineForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    fetch('/api/pharmacy/inventory/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('addMedicineModal'));
                modal.hide();

                // Reset form
                form.reset();

                // Reload inventory
                loadInventory();

                // Show success message (optional)
                alert('Medicine added successfully');
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => console.error('Error:', error));
}

function deleteMedicine(id) {
    if (!confirm('Are you sure you want to delete this medicine?')) return;

    fetch('/api/pharmacy/inventory/delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: id })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadInventory();
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => console.error('Error:', error));
}

// Edit functionality would require a separate modal or reusing the add modal
// For simplicity, we'll implement a basic edit flow later or use prompt for now if needed, 
// but the plan asked for "Editing" so let's assume we need an Edit Modal.
// I will reuse the Add Modal for editing for now to keep it minimal.

let isEditing = false;
let currentEditId = null;

function openAddModal() {
    isEditing = false;
    currentEditId = null;
    document.getElementById('addMedicineForm').reset();
    document.getElementById('modalTitle').textContent = 'Add Medicine';
    document.getElementById('saveMedicineBtn').textContent = 'Add Medicine';
    new bootstrap.Modal(document.getElementById('addMedicineModal')).show();
}

function editMedicine(id, name, category, stock, expiry, notes) {
    isEditing = true;
    currentEditId = id;

    const form = document.getElementById('addMedicineForm');
    form.elements['name'].value = name;
    form.elements['category'].value = category === 'null' ? '' : category;
    form.elements['stock'].value = stock;
    form.elements['expiry'].value = expiry;
    form.elements['notes'].value = notes === 'null' ? '' : notes;

    document.getElementById('modalTitle').textContent = 'Edit Medicine';
    document.getElementById('saveMedicineBtn').textContent = 'Update Medicine';

    new bootstrap.Modal(document.getElementById('addMedicineModal')).show();
}

function handleMedicineSubmit() {
    if (isEditing) {
        updateMedicine();
    } else {
        submitAddMedicine();
    }
}

function updateMedicine() {
    const form = document.getElementById('addMedicineForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data.id = currentEditId;

    fetch('/api/pharmacy/inventory/update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('addMedicineModal'));
                modal.hide();
                loadInventory();
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => console.error('Error:', error));
}


// ==================== REQUEST MANAGEMENT ====================

function loadRequests() {
    fetch('/api/pharmacy/requests')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const tbody = document.querySelector('#requestsTableBody');
                if (!tbody) return;
                tbody.innerHTML = '';

                if (data.requests.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No pending requests.</td></tr>';
                    const pendingEl = document.getElementById('pendingRequestsCount');
                    if (pendingEl) pendingEl.textContent = '0';
                    return;
                }

                // Update Pending Requests Stat
                const pendingCount = data.requests.filter(req => req.status === 'pending').length;
                const pendingEl = document.getElementById('pendingRequestsCount');
                if (pendingEl) pendingEl.textContent = pendingCount;

                data.requests.forEach(req => {
                    let statusBadge = '';
                    if (req.status === 'pending') statusBadge = '<span class="badge bg-warning text-dark">Pending</span>';
                    else if (req.status === 'accepted') statusBadge = '<span class="badge bg-info text-dark">Accepted</span>';

                    let details = '';
                    // Show File Link if present
                    if (req.file_path) {
                        details += `<a href="/uploads/prescriptions/${req.file_path}" target="_blank" class="d-block mt-1 text-primary"><i class="fas fa-paperclip"></i> View Prescription</a>`;
                    }

                    // Show Medicine Details if present
                    if (req.medicine_details) {
                        details += `<div class="mt-2 small border-top pt-1"><strong>Medicines:</strong><br>${req.medicine_details}</div>`;
                    }

                    if (req.notes) details += `<div class="mt-1 small text-muted"><em>Note: ${req.notes}</em></div>`;

                    let actions = '';
                    if (req.status === 'pending') {
                        actions = `
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-success" onclick="updateRequestStatus(${req.id}, 'accepted')">Accept</button>
                                <button class="btn btn-danger" onclick="updateRequestStatus(${req.id}, 'rejected')">Reject</button>
                            </div>
                        `;
                    } else if (req.status === 'accepted') {
                        actions = `
                            <button class="btn btn-sm btn-primary" onclick="updateRequestStatus(${req.id}, 'ready')">Mark Ready</button>
                        `;
                    } else if (req.status === 'ready') {
                        actions = `
                            <button class="btn btn-sm btn-secondary" onclick="updateRequestStatus(${req.id}, 'completed')">Mark Completed</button>
                        `;
                    } else {
                        actions = '<span class="text-muted">-</span>';
                    }

                    const row = `
                        <tr>
                            <td>${req.date}</td>
                            <td>
                                <div class="fw-bold">${req.patient_name}</div>
                                <small class="text-muted">UID: ${req.patient_uid}</small>
                            </td>
                            <td>
                                ${req.type === 'prescription_upload' ? '<span class="badge bg-light text-dark border"><i class="fas fa-file-upload me-1"></i> Upload</span>' : '<span class="badge bg-light text-dark border"><i class="fas fa-pills me-1"></i> Request</span>'}
                            </td>
                            <td>${details}</td>
                            <td>${statusBadge}</td>
                            <td>${actions}</td>
                        </tr>
                    `;
                    tbody.innerHTML += row;
                });
            }
        })
        .catch(error => console.error('Error loading requests:', error));
}

function updateRequestStatus(id, status) {
    let remarks = '';
    if (status === 'rejected') {
        remarks = prompt('Enter reason for rejection:');
        if (remarks === null) return; // Cancelled
    } else if (status === 'ready') {
        remarks = prompt('Enter any remarks for patient (e.g., "Total amount: $50"):');
    }

    fetch('/api/pharmacy/request/update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: id, status: status, remarks: remarks })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadRequests();
                // Also refresh stats if needed, but simple reload is fine for now
                // Optionally reload page to update stats
                // location.reload(); 
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => console.error('Error:', error));
}

// Add loadRequests to initial load
document.addEventListener('DOMContentLoaded', function () {
    loadRequests();
});
