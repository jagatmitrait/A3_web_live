// ==================== MNC DASHBOARD JAVASCRIPT ====================

// Global state
let currentPage = 'overview';
let employeesData = [];
let healthTrendsData = null;
let charts = {};

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('MNC Dashboard initialized');
    
    // Setup navigation
    setupNavigation();
    
    // Setup user profile dropdown
    setupUserDropdown();
    
    // Setup refresh button
    setupRefreshButton();
    
    // Load dashboard data
    loadDashboardStats();
    loadEmployeesData();
    loadNotifications();
    
    // Setup employee search
    setupEmployeeSearch();
    
    // Setup incident form
    setupIncidentForm();
    
    // Load health analytics on page load
    loadHealthAnalytics();
    
    // Load compliance data
    loadComplianceData();
    
    // Load audit logs
    loadAuditLogs();
});

// ==================== NAVIGATION ====================

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // Ignore logout link - let it navigate normally
            if (this.classList.contains('logout')) {
                return;
            }
            
            e.preventDefault();
            
            const pageName = this.getAttribute('data-page');
            if (pageName) {
                navigateToPage(pageName);
            }
        });
    });
}

function navigateToPage(pageName) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === pageName) {
            item.classList.add('active');
        }
    });
    
    // Update active page content
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });
    
    const activePage = document.getElementById(`${pageName}-page`);
    if (activePage) {
        activePage.classList.add('active');
        currentPage = pageName;
        
        // Load data for specific pages
        if (pageName === 'health-trends' && !healthTrendsData) {
            loadHealthAnalytics();
        } else if (pageName === 'fitness') {
            loadFitnessAssessments();
        } else if (pageName === 'incidents') {
            loadIncidents();
        } else if (pageName === 'compliance') {
            loadComplianceData();
        } else if (pageName === 'employees') {
            applyEmployeeFilters();
        } else if (pageName === 'vaccination') {
            loadVaccinationCompliance();
        }
    }
}

// Make navigateToPage globally available
window.navigateToPage = navigateToPage;

function setupUserDropdown() {
    const userProfileBtn = document.getElementById('userProfileBtn');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userProfileBtn && userDropdown) {
        userProfileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            userDropdown.classList.remove('show');
        });
    }
}

function setupRefreshButton() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            this.querySelector('i').classList.add('fa-spin');
            refreshDashboard();
            setTimeout(() => {
                this.querySelector('i').classList.remove('fa-spin');
            }, 1000);
        });
    }
}

function refreshDashboard() {
    loadDashboardStats();
    loadEmployeesData();
    loadNotifications();
    
    if (currentPage === 'health-trends') {
        loadHealthAnalytics();
    } else if (currentPage === 'incidents') {
        loadIncidents();
    } else if (currentPage === 'compliance') {
        loadComplianceData();
    }
    
    showNotification('Dashboard refreshed', 'success');
}

// ==================== DASHBOARD STATS ====================

async function loadDashboardStats() {
    try {
        const response = await fetch('/api/mnc/dashboard-stats');
        const data = await response.json();
        
        if (data.success) {
            const stats = data.stats;
            
            // Update stat cards with animation
            animateCounter('stat-total', stats.total_enrolled);
            animateCounter('stat-fit', stats.fit_for_duty);
            animateCounter('stat-review', stats.under_review);
            animateCounter('stat-unfit', stats.temporarily_unfit);
            
            // Generate alerts based on stats
            generateAlerts(stats);
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showNotification('Failed to load dashboard statistics', 'error');
    }
}

function animateCounter(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const currentValue = parseInt(element.textContent) || 0;
    const increment = Math.ceil((targetValue - currentValue) / 20);
    
    let current = currentValue;
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= targetValue) || (increment < 0 && current <= targetValue)) {
            current = targetValue;
            clearInterval(timer);
        }
        element.textContent = current;
    }, 30);
}

function generateAlerts(stats) {
    const alertsContainer = document.getElementById('alerts-container');
    if (!alertsContainer) return;
    
    alertsContainer.innerHTML = '';
    
    const alerts = [];
    
    if (stats.consent_expiring > 0) {
        alerts.push({
            type: 'warning',
            icon: 'hourglass-half',
            title: 'Consent Expiring Soon',
            message: `${stats.consent_expiring} employee consent(s) will expire within 30 days. Review and renew.`,
            time: 'Today'
        });
    }
    
    if (stats.under_review > 0) {
        alerts.push({
            type: 'info',
            icon: 'eye',
            title: 'Medical Reviews Pending',
            message: `${stats.under_review} employee(s) require medical fitness review.`,
            time: 'Today'
        });
    }
    
    if (stats.temporarily_unfit > 0) {
        alerts.push({
            type: 'danger',
            icon: 'exclamation-triangle',
            title: 'Employees Temporarily Unfit',
            message: `${stats.temporarily_unfit} employee(s) currently unfit for duty. HR intervention may be needed.`,
            time: 'Today'
        });
    }
    
    if (stats.pending_verifications > 0) {
        alerts.push({
            type: 'warning',
            icon: 'clock',
            title: 'Pending Verifications',
            message: `${stats.pending_verifications} employee(s) awaiting verification.`,
            time: 'Today'
        });
    }
    
    if (alerts.length === 0) {
        alerts.push({
            type: 'info',
            icon: 'check-circle',
            title: 'All Clear',
            message: 'Dashboard is operational. No critical alerts at this time.',
            time: 'Just now'
        });
    }
    
    alerts.forEach(alert => {
        const alertHTML = `
            <div class="alert-item ${alert.type}">
                <div class="alert-icon">
                    <i class="fas fa-${alert.icon}"></i>
                </div>
                <div class="alert-content">
                    <strong>${alert.title}</strong>
                    <p>${alert.message}</p>
                </div>
                <span class="alert-time">${alert.time}</span>
            </div>
        `;
        alertsContainer.innerHTML += alertHTML;
    });
}

async function loadNotifications() {
    // Update notification count
    const notifCount = document.getElementById('notif-count');
    if (notifCount) {
        // In production, fetch from backend
        notifCount.textContent = '0';
    }
}

// ==================== EMPLOYEE DIRECTORY ====================

async function loadEmployeesData() {
    try {
        const response = await fetch('/api/mnc/employees');
        const data = await response.json();
        
        if (data.success) {
            employeesData = data.employees;
            displayEmployees(employeesData);
        }
    } catch (error) {
        console.error('Error loading employees:', error);
        showNotification('Failed to load employee data', 'error');
    }
}

function displayEmployees(employees) {
    const tableBody = document.getElementById('employee-table-body');
    const employeeCount = document.getElementById('employee-count');
    
    if (!tableBody || !employeeCount) return;
    
    if (employees.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-5">
                    <i class="fas fa-users text-muted" style="font-size: 3rem;"></i>
                    <p class="mt-3 text-muted">No employees found. Employees will appear here once they link their A3 Health account.</p>
                </td>
            </tr>
        `;
        employeeCount.textContent = '0 employees found';
        return;
    }
    
    tableBody.innerHTML = '';
    
    employees.forEach(emp => {
        const fitnessClass = getFitnessClass(emp.fitness_status);
        
        // Determine if upload button should be shown based on vaccination compliance
        const vaccinationCompliance = parseFloat(emp.vaccination_compliance) || 0;
        
        // Debug log
        console.log(`Employee: ${emp.name}, Compliance: ${vaccinationCompliance}%`);
        
        let uploadButton;
        
        if (vaccinationCompliance >= 100) {
            // Employee is fully compliant - show badge instead of upload button
            uploadButton = `<span class="badge bg-success" style="color: white; padding: 0.4rem 0.8rem;">
                <i class="fas fa-check-circle me-1"></i>Fully Compliant
               </span>`;
        } else {
            // Employee needs vaccinations - show upload button
            uploadButton = `<button class="btn btn-sm btn-danger" onclick="showUploadVaccinationModal(${emp.id}, '${emp.name}')">
                <i class="fas fa-syringe me-1"></i>Upload
               </button>`;
        }
        
        const row = `
            <tr>
                <td><strong>${emp.uid || 'Not Linked'}</strong></td>
                <td>
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <span>${emp.employee_id || ''}</span>
                        ${emp.uid ? `<button class="btn btn-sm btn-outline-primary edit-inline-btn" onclick="editEmployeeID(${emp.id})" title="Edit Employee ID"><i class="fas fa-edit" style="font-size:0.85rem;"></i></button>` : ''}
                    </div>
                </td>
                <td>${emp.name}</td>
                <td>${emp.age || 'N/A'}</td>
                <td>${emp.department}</td>
                <td>${emp.job_role}</td>
                <td>
                    <span class="badge bg-${fitnessClass}" style="color: white;">
                        ${emp.fitness_status}
                    </span>
                </td>
                <td>${emp.last_health_review || 'Not available'}</td>
                <td>
                    <div class="d-flex gap-1 align-items-center flex-wrap">
                        <button class="btn btn-sm btn-primary" onclick="viewEmployeeDetail(${emp.id})">
                            <i class="fas fa-eye me-1"></i>View
                        </button>
                        <button class="btn btn-sm btn-success" onclick="viewMedicalDetails(${emp.id})">
                            <i class="fas fa-file-medical me-1"></i>Medical
                        </button>
                        ${uploadButton}
                        <button class="btn btn-sm btn-danger" onclick="confirmDeleteEmployee(${emp.id}, '${emp.name}')" title="Delete Employee">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        
        tableBody.innerHTML += row;
    });
    
    employeeCount.textContent = `${employees.length} employee${employees.length !== 1 ? 's' : ''} found`;
}

function getFitnessClass(status) {
    const statusMap = {
        'Fit': 'success',
        'Fit for Duty': 'success',
        'Fit with Restrictions': 'warning',
        'Review': 'info',
        'Review Required': 'info',
        'Under Review': 'info',
        'Review Required': 'info',
        'Medical Review Required': 'info',
        'Unfit': 'danger',
        'Temporarily Unfit': 'danger',
        'Unknown': 'secondary'
    };
    
    return statusMap[status] || 'secondary';
}

function setupEmployeeSearch() {
    const searchInput = document.getElementById('employee-search');
    
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                applyEmployeeFilters();
            }, 300);
        });
    }
}

function applyEmployeeFilters() {
    const searchTerm = document.getElementById('employee-search')?.value.toLowerCase().trim() || '';
    const department = document.getElementById('filter-department')?.value || '';
    const fitness = document.getElementById('filter-fitness')?.value || '';
    
    let filtered = [...employeesData];
    
    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(emp => 
            (emp.uid && emp.uid.toLowerCase().includes(searchTerm)) ||
            emp.name.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply department filter
    if (department) {
        filtered = filtered.filter(emp => emp.department === department);
    }
    
    // Apply fitness filter
    if (fitness) {
        filtered = filtered.filter(emp => emp.fitness_status === fitness);
    }
    
    displayEmployees(filtered);
}

// Make applyEmployeeFilters globally available
window.applyEmployeeFilters = applyEmployeeFilters;

async function viewEmployeeDetail(employeeId) {
    try {
        const response = await fetch(`/api/mnc/employees/${employeeId}`);
        const data = await response.json();
        
        if (data.success) {
            showEmployeeModal(data.employee);
        } else {
            showNotification(data.message || 'Failed to load employee details', 'error');
        }
    } catch (error) {
        console.error('Error loading employee details:', error);
        showNotification('Failed to load employee details', 'error');
    }
}

// Make viewEmployeeDetail globally available
window.viewEmployeeDetail = viewEmployeeDetail;

function showEmployeeModal(employee) {
    // Create modal with employee details
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px; width: 90%; max-height: 90vh; overflow-y: auto; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
            <div class="modal-header" style="border-bottom: 2px solid #e0e0e0; padding: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; color: #2c3e50;"><i class="fas fa-user-shield"></i> Employee Health Summary</h3>
                <button class="modal-close" onclick="closeModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #95a5a6;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="padding: 2rem;">
                <div class="employee-detail" style="display: flex; flex-direction: column; gap: 1rem;">
                    <div class="detail-row" style="padding: 1rem; background: #f8f9fa; border-radius: 8px; display: flex; align-items: center;">
                        <strong style="min-width: 180px; color: #34495e;">UID:</strong> 
                        <span style="color: #7f8c8d;">${employee.uid || 'Not Linked'}</span>
                    </div>
                    <div class="detail-row" style="padding: 1rem; background: #f8f9fa; border-radius: 8px; display: flex; align-items: center; justify-content: space-between;">
                        <div style="display:flex; align-items:center; flex:1;">
                            <strong style="min-width: 180px; color: #34495e;">Employee ID:</strong>
                            <span id="employee-id-display-${employee.id}" style="color: #7f8c8d;">${employee.employee_id || 'N/A'}</span>
                        </div>
                        ${employee.uid ? `
                        <button class="btn btn-sm btn-outline-primary" onclick="editEmployeeID(${employee.id})" style="padding: 0.25rem 0.75rem;">
                            <i class="fas fa-edit me-1"></i>Edit
                        </button>
                        ` : ''}
                    </div>
                    <div class="detail-row" style="padding: 1rem; background: #f8f9fa; border-radius: 8px; display: flex; align-items: center;">
                        <strong style="min-width: 180px; color: #34495e;">Name:</strong> 
                        <span style="color: #7f8c8d;">${employee.name}</span>
                    </div>
                    <div class="detail-row" style="padding: 1rem; background: #f8f9fa; border-radius: 8px; display: flex; align-items: center;">
                        <strong style="min-width: 180px; color: #34495e;">Age / Gender:</strong> 
                        <span style="color: #7f8c8d;">${employee.age || 'N/A'} / ${employee.gender || 'N/A'}</span>
                    </div>
                    <div class="detail-row" style="padding: 1rem; background: #f8f9fa; border-radius: 8px; display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; flex: 1;">
                            <strong style="min-width: 180px; color: #34495e;">Department:</strong> 
                            <span id="department-display-${employee.id}" style="color: #7f8c8d;">${employee.department || 'N/A'}</span>
                        </div>
                        <button class="btn btn-sm btn-outline-primary" onclick="editEmployeeDepartment(${employee.id}, '${(employee.department || '').replace(/'/g, "\\'")}')"
                                style="padding: 0.25rem 0.75rem;">
                            <i class="fas fa-edit me-1"></i>Edit
                        </button>
                    </div>
                    <div class="detail-row" style="padding: 1rem; background: #f8f9fa; border-radius: 8px; display: flex; align-items: center;">
                        <strong style="min-width: 180px; color: #34495e;">Job Role:</strong> 
                        <span style="color: #7f8c8d;">${employee.job_role || 'N/A'}</span>
                    </div>
                    <div class="detail-row" style="padding: 1rem; background: #f8f9fa; border-radius: 8px; display: flex; align-items: center;">
                        <strong style="min-width: 180px; color: #34495e;">Fitness Status:</strong> 
                        <span class="badge bg-${getFitnessClass(employee.fitness_status)}" style="padding: 0.5rem 1rem;">
                            ${employee.fitness_status}
                        </span>
                    </div>
                    ${employee.fitness_restrictions && employee.fitness_restrictions.length > 0 ? `
                        <div class="detail-row" style="padding: 1rem; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
                            <strong style="min-width: 180px; color: #34495e;">Work Restrictions:</strong>
                            <ul style="margin: 0; padding-left: 1.5rem; color: #7f8c8d;">
                                ${employee.fitness_restrictions.map(r => `<li>${r}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    ${employee.last_health_check ? `
                        <div class="detail-row" style="padding: 1rem; background: #f8f9fa; border-radius: 8px; display: flex; align-items: center;">
                            <strong style="min-width: 180px; color: #34495e;">Last Health Check:</strong>
                            <span style="color: #7f8c8d;">${employee.last_health_check}</span>
                        </div>
                    ` : ''}
                    ${employee.vaccination_status !== 'Unknown' ? `
                        <div class="detail-row" style="padding: 1rem; background: #f8f9fa; border-radius: 8px; display: flex; align-items: center;">
                            <strong style="min-width: 180px; color: #34495e;">Vaccination Status:</strong>
                            <span style="color: #7f8c8d;">${employee.vaccination_status}</span>
                        </div>
                    ` : ''}
                    <div class="privacy-notice" style="margin-top: 1rem; padding: 1rem; background: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 8px;">
                        <i class="fas fa-shield-alt" style="color: #2196f3; margin-right: 0.5rem;"></i>
                        <strong style="color: #1976d2;">Privacy Protection:</strong>
                        <p style="margin: 0.5rem 0 0 0; color: #546e7a;">
                            Detailed medical information is not shown to protect employee privacy.
                            Only fitness status and work-related health summaries are available.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    document.body.appendChild(modal);
}

function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// Make closeModal globally available
window.closeModal = closeModal;

// ==================== EDIT EMPLOYEE DEPARTMENT ====================

function editEmployeeDepartment(employeeId, currentDepartment) {
    // Close the employee detail modal first
    closeModal();
    
    // Small delay to ensure the previous modal is fully closed
    setTimeout(() => {
        // Set the employee ID and current department
        document.getElementById('edit_employee_id').value = employeeId;
        document.getElementById('edit_department').value = currentDepartment;
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('editDepartmentModal'));
        modal.show();
    }, 100);
}

window.editEmployeeDepartment = editEmployeeDepartment;

function editEmployeeID(employeeId) {
    // Use custom inline overlay editor to avoid Bootstrap modal issues
    closeModal();
    setTimeout(() => {
        showInlineEditEmployeeID(employeeId);
    }, 100);
}

window.editEmployeeID = editEmployeeID;

function confirmEmployeeIDUpdate() {
    const employeeRecordId = document.getElementById('edit_emp_record_id').value;
    const newEID = document.getElementById('edit_employee_id_input').value.trim();
    if (!newEID) {
        showNotification('Please enter a valid Employee ID', 'error');
        return;
    }

    // Hide modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('editEmployeeIdModal'));
    if (modal) modal.hide();

    // Call API to update
    updateEmployeeID(employeeRecordId, newEID);
}

async function updateEmployeeID(employeeRecordId, newEID) {
    try {
        const response = await fetch(`/api/mnc/employees/${employeeRecordId}/employee-id`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employee_id: newEID })
        });

        const data = await response.json();
        if (data.success) {
            showNotification('Employee ID updated', 'success');
            // Refresh list and any open detail
            // Optimistically update displayed employee ID in modal and table
            const displayEl = document.getElementById(`employee-id-display-${employeeRecordId}`);
            if (displayEl) displayEl.textContent = newEID;
            await loadEmployeesData();
        } else {
            showNotification(data.message || 'Failed to update Employee ID', 'error');
        }
    } catch (error) {
        console.error('Error updating employee ID:', error);
        showNotification('An error occurred while updating Employee ID', 'error');
    }
}

window.confirmEmployeeIDUpdate = confirmEmployeeIDUpdate;

function showInlineEditEmployeeID(employeeId) {
    console.log('showInlineEditEmployeeID', employeeId);
    const currentEl = document.getElementById(`employee-id-display-${employeeId}`);
    const currentVal = currentEl ? currentEl.textContent.trim() : '';

    // Build overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `position: fixed; inset: 0; background: rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:9999;`;

    overlay.innerHTML = `
        <div class="modal-content" style="width: 420px; max-width: 95%; border-radius: 8px; background: #fff; box-shadow: 0 8px 30px rgba(0,0,0,0.2);">
            <div style="padding: 1rem 1rem; border-bottom: 1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                <strong>Edit Employee ID</strong>
                <button id="inline-edit-close" style="border:none;background:transparent;font-size:1.1rem;cursor:pointer;color:#666">&times;</button>
            </div>
            <div style="padding:1rem;">
                <div class="mb-2">
                    <label class="form-label" style="font-weight:600;">Employee ID</label>
                    <input id="inline_edit_employee_id_input" class="form-control" style="width:100%;padding:0.5rem;border:1px solid #ddd;border-radius:6px;" value="${currentVal || ''}" />
                </div>
                <div style="display:flex; gap:0.5rem; justify-content:flex-end; margin-top:0.75rem;">
                    <button id="inline-edit-cancel" class="btn btn-sm btn-secondary">Cancel</button>
                    <button id="inline-edit-save" class="btn btn-sm btn-primary">Save</button>
                </div>
            </div>
        </div>
    `;

    // Close handlers
    overlay.querySelector('#inline-edit-close').addEventListener('click', closeInline);
    overlay.querySelector('#inline-edit-cancel').addEventListener('click', closeInline);

    function closeInline(e) {
        e && e.preventDefault();
        overlay.remove();
    }

    // Add live availability check
    const statusEl = document.createElement('div');
    statusEl.style.cssText = 'margin-top:0.5rem;font-size:0.9rem;min-height:1.1rem;';
    overlay.querySelector('div.mb-2').appendChild(statusEl);

    let checkTimeout;
    const saveBtn = overlay.querySelector('#inline-edit-save');
    const inputEl = overlay.querySelector('#inline_edit_employee_id_input');
    inputEl.addEventListener('input', function() {
        clearTimeout(checkTimeout);
        statusEl.textContent = 'Checking availability...';
        saveBtn.disabled = true;
        checkTimeout = setTimeout(async () => {
            const val = inputEl.value.trim();
            if (!val) {
                statusEl.textContent = '';
                saveBtn.disabled = true;
                return;
            }
            try {
                const resp = await fetch(`/api/mnc/employees/check-employee-id?employee_id=${encodeURIComponent(val)}&exclude_id=${employeeId}`);
                const jd = await resp.json();
                if (jd.success && jd.available) {
                    statusEl.textContent = 'Available';
                    statusEl.style.color = 'green';
                    saveBtn.disabled = false;
                } else {
                    statusEl.textContent = jd.message || 'Already in use';
                    statusEl.style.color = 'crimson';
                    saveBtn.disabled = true;
                }
            } catch (err) {
                statusEl.textContent = 'Error checking availability';
                statusEl.style.color = 'crimson';
                saveBtn.disabled = true;
            }
        }, 400);
    });

    // Save handler
    overlay.querySelector('#inline-edit-save').addEventListener('click', async function(e) {
        e.preventDefault();
        const newVal = document.getElementById('inline_edit_employee_id_input').value.trim();
        if (!newVal) {
            showNotification('Please enter a valid Employee ID', 'error');
            return;
        }
        // call update
        await updateEmployeeID(employeeId, newVal);
        // update display immediately
        const displayEl = document.getElementById(`employee-id-display-${employeeId}`);
        if (displayEl) displayEl.textContent = newVal;
        closeInline();
    });

    // clicking backdrop closes
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeInline();
    });

    document.body.appendChild(overlay);
}

function confirmDepartmentUpdate() {
    const employeeId = document.getElementById('edit_employee_id').value;
    const newDepartment = document.getElementById('edit_department').value;
    
    if (!newDepartment) {
        showNotification('Please select a department', 'error');
        return;
    }
    
    // Close the modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('editDepartmentModal'));
    modal.hide();
    
    // Update the department
    updateEmployeeDepartment(employeeId, newDepartment);
}

window.confirmDepartmentUpdate = confirmDepartmentUpdate;

async function updateEmployeeDepartment(employeeId, department) {
    try {
        const response = await fetch(`/api/mnc/employees/${employeeId}/department`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ department: department })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Department updated successfully', 'success');
            
            // Update the display in the modal
            const displayElement = document.getElementById(`department-display-${employeeId}`);
            if (displayElement) {
                displayElement.textContent = department;
            }
            
            // Reload employees list to reflect changes
            await loadEmployeesData();
        } else {
            showNotification(data.message || 'Failed to update department', 'error');
        }
    } catch (error) {
        console.error('Error updating department:', error);
        showNotification('Failed to update department', 'error');
    }
}

// ==================== MEDICAL DETAILS VIEW ====================

async function viewMedicalDetails(employeeId) {
    try {
        const response = await fetch(`/api/mnc/employees/${employeeId}/medical-details`);
        const data = await response.json();
        
        if (data.success) {
            showMedicalDetailsModal(data.medical_details);
        } else {
            showNotification(data.message || 'Failed to load medical details', 'error');
        }
    } catch (error) {
        console.error('Error loading medical details:', error);
        showNotification('Failed to load medical details', 'error');
    }
}

// Make viewMedicalDetails globally available
window.viewMedicalDetails = viewMedicalDetails;

function showMedicalDetailsModal(details) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; width: 90%; max-height: 90vh; overflow-y: auto; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
            <style>
                .modal-content .section { margin-bottom: 1.5rem; }
                .modal-content .info-card { background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem; }
                .modal-content .vital-card { padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem; }
                .modal-content table.md-table th, .modal-content table.md-table td { padding: 0.6rem 0.75rem; vertical-align: middle; }
                .modal-content .accordion .accordion-item { margin-bottom: 0.6rem; }
                .modal-content .privacy-notice { margin-top: 2rem; }
                .modal-content .section h5 { margin-bottom: 0.75rem; }
            </style>
            <div class="modal-header" style="border-bottom: 2px solid #e0e0e0; padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%); color: white; border-radius: 12px 12px 0 0;">
                <h3 style="margin: 0; color: white;"><i class="fas fa-file-medical me-2"></i>Complete Medical Records - ${details.employee_name}</h3>
                <button class="modal-close" onclick="closeModal()" style="background: rgba(255,255,255,0.2); border: none; font-size: 1.5rem; cursor: pointer; color: white; border-radius: 50%; width: 40px; height: 40px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="padding: 2rem;">
                
                <!-- Basic Information -->
                <div class="section" style="margin-bottom: 2rem;">
                    <h5 style="color: #d32f2f; border-bottom: 2px solid #d32f2f; padding-bottom: 0.5rem; margin-bottom: 1rem;">
                        <i class="fas fa-user me-2"></i>Basic Information
                    </h5>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <div class="info-card" style="background: #f8f9fa; padding: 1rem; border-radius: 8px;">
                                <strong style="color: #34495e;">UID:</strong><br>
                                <span style="color: #7f8c8d; font-size: 1.1rem;">${details.uid || 'Not Available'}</span>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="info-card" style="background: #f8f9fa; padding: 1rem; border-radius: 8px;">
                                <strong style="color: #34495e;">Blood Group:</strong><br>
                                <span style="color: #7f8c8d; font-size: 1.1rem;">${details.blood_group || 'Not Specified'}</span>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="info-card" style="background: #f8f9fa; padding: 1rem; border-radius: 8px;">
                                <strong style="color: #34495e;">Age / Gender:</strong><br>
                                <span style="color: #7f8c8d; font-size: 1.1rem;">${details.age || 'N/A'} years / ${details.gender || 'N/A'}</span>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="info-card" style="background: #f8f9fa; padding: 1rem; border-radius: 8px;">
                                <strong style="color: #34495e;">Mobile:</strong><br>
                                <span style="color: #7f8c8d; font-size: 1.1rem;">${details.mobile || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Fitness Status -->
                ${details.fitness_assessment ? `
                <div class="section" style="margin-bottom: 2rem;">
                    <h5 style="color: #d32f2f; border-bottom: 2px solid #d32f2f; padding-bottom: 0.5rem; margin-bottom: 1rem;">
                        <i class="fas fa-heartbeat me-2"></i>Current Fitness Assessment
                    </h5>
                    <div class="alert alert-${getFitnessAlertClass(details.fitness_assessment.status)}" style="border-left: 4px solid;">
                        <h6><strong>Status:</strong> ${details.fitness_assessment.status}</h6>
                        <p><strong>Assessment Date:</strong> ${details.fitness_assessment.assessment_date}</p>
                        ${details.fitness_assessment.restrictions ? `<p><strong>Restrictions:</strong> ${details.fitness_assessment.restrictions}</p>` : ''}
                        ${details.fitness_assessment.notes ? `<p><strong>Notes:</strong> ${details.fitness_assessment.notes}</p>` : ''}
                        ${details.fitness_assessment.next_review_date ? `<p><strong>Next Review:</strong> ${details.fitness_assessment.next_review_date}</p>` : ''}
                    </div>
                </div>
                ` : '<div class="alert alert-info"><i class="fas fa-info-circle me-2"></i>No fitness assessment on record</div>'}

                <!-- Vaccinations -->
                <div class="section" style="margin-bottom: 2rem;">
                    <h5 style="color: #d32f2f; border-bottom: 2px solid #d32f2f; padding-bottom: 0.5rem; margin-bottom: 1rem;">
                        <i class="fas fa-syringe me-2"></i>Vaccination Records
                    </h5>
                    ${details.vaccinations && details.vaccinations.length > 0 ? `
                        <div class="table-responsive">
                            <table class="table table-bordered table-hover md-table">
                                <thead class="table-light">
                                    <tr>
                                        <th>Vaccine Name</th>
                                        <th>Date Given</th>
                                        <th>Dose Number</th>
                                        <th>Next Due</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${details.vaccinations.map(v => `
                                        <tr>
                                            <td><strong>${v.vaccine_name}</strong></td>
                                            <td>${v.date_given}</td>
                                            <td>${v.dose_number || 'N/A'}</td>
                                            <td>${v.next_due_date || 'N/A'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<p class="text-muted"><i class="fas fa-info-circle me-2"></i>No vaccination records available</p>'}
                </div>

                <!-- Medical History -->
                ${details.medical_history && details.medical_history.length > 0 ? `
                <div class="section" style="margin-bottom: 2rem;">
                    <h5 style="color: #d32f2f; border-bottom: 2px solid #d32f2f; padding-bottom: 0.5rem; margin-bottom: 1rem;">
                        <i class="fas fa-notes-medical me-2"></i>Medical History
                    </h5>
                    <div class="accordion" id="medicalHistoryAccordion">
                        ${details.medical_history.map((record, index) => `
                            <div class="accordion-item" style="margin-bottom: 0.5rem; border: 1px solid #e0e0e0; border-radius: 8px;">
                                <h2 class="accordion-header" id="heading${index}">
                                    <button class="accordion-button ${index !== 0 ? 'collapsed' : ''}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}" aria-expanded="${index === 0}" aria-controls="collapse${index}" style="background: #f8f9fa;">
                                        <strong>${record.condition || 'Medical Record'}</strong> - ${record.diagnosis_date || 'Date Unknown'}
                                    </button>
                                </h2>
                                <div id="collapse${index}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" aria-labelledby="heading${index}" data-bs-parent="#medicalHistoryAccordion">
                                    <div class="accordion-body">
                                        ${record.description ? `<p><strong>Description:</strong> ${record.description}</p>` : ''}
                                        ${record.treatment ? `<p><strong>Treatment:</strong> ${record.treatment}</p>` : ''}
                                        ${record.status ? `<p><strong>Status:</strong> <span class="badge bg-info" style="color: white;">${record.status}</span></p>` : ''}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <!-- Allergies -->
                ${details.allergies && details.allergies.length > 0 ? `
                <div class="section" style="margin-bottom: 2rem;">
                    <h5 style="color: #d32f2f; border-bottom: 2px solid #d32f2f; padding-bottom: 0.5rem; margin-bottom: 1rem;">
                        <i class="fas fa-exclamation-triangle me-2"></i>Allergies
                    </h5>
                    <div class="alert alert-danger">
                        <ul style="margin: 0; padding-left: 1.5rem;">
                            ${details.allergies.map(a => `
                                <li><strong>${a.allergen}</strong> - ${a.reaction || 'Reaction Unknown'} 
                                ${a.severity ? `<span class="badge bg-danger ms-2" style="color: white;">${a.severity}</span>` : ''}</li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
                ` : ''}

                <!-- Surgeries -->
                ${details.surgeries && details.surgeries.length > 0 ? `
                <div class="section" style="margin-bottom: 2rem;">
                    <h5 style="color: #d32f2f; border-bottom: 2px solid #d32f2f; padding-bottom: 0.5rem; margin-bottom: 1rem;">
                        <i class="fas fa-scalpel me-2"></i>Surgeries
                    </h5>
                    <div class="table-responsive">
                        <table class="table table-bordered table-hover md-table">
                            <thead class="table-light">
                                <tr>
                                    <th>Surgery</th>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Hospital</th>
                                    <th>Surgeon</th>
                                    <th>Outcome</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${details.surgeries.map(s => `
                                    <tr>
                                        <td><strong>${s.surgery_name}</strong></td>
                                        <td>${s.surgery_date || 'N/A'}</td>
                                        <td>${s.surgery_type || s.category || 'N/A'}</td>
                                        <td>${s.hospital || 'N/A'}</td>
                                        <td>${s.surgeon_name || 'N/A'}</td>
                                        <td>${s.outcome || 'N/A'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                ` : ''}

                <!-- Recent Vitals -->
                ${details.recent_vitals ? `
                <div class="section" style="margin-bottom: 2rem;">
                    <h5 style="color: #d32f2f; border-bottom: 2px solid #d32f2f; padding-bottom: 0.5rem; margin-bottom: 1rem;">
                        <i class="fas fa-heartbeat me-2"></i>Recent Vital Signs
                    </h5>
                    <div class="row g-3">
                        ${details.recent_vitals.blood_pressure ? `
                        <div class="col-md-4">
                            <div class="vital-card" style="background: #e3f2fd; padding: 1rem; border-radius: 8px; text-align: center;">
                                <i class="fas fa-heart" style="font-size: 2rem; color: #1976d2;"></i>
                                <h6 style="margin-top: 0.5rem;">Blood Pressure</h6>
                                <p style="font-size: 1.2rem; font-weight: bold; margin: 0;">${details.recent_vitals.blood_pressure}</p>
                            </div>
                        </div>
                        ` : ''}
                        ${details.recent_vitals.temperature ? `
                        <div class="col-md-4">
                            <div class="vital-card" style="background: #fff3e0; padding: 1rem; border-radius: 8px; text-align: center;">
                                <i class="fas fa-thermometer-half" style="font-size: 2rem; color: #f57c00;"></i>
                                <h6 style="margin-top: 0.5rem;">Temperature</h6>
                                <p style="font-size: 1.2rem; font-weight: bold; margin: 0;">${details.recent_vitals.temperature}°F</p>
                            </div>
                        </div>
                        ` : ''}
                        ${details.recent_vitals.heart_rate ? `
                        <div class="col-md-4">
                            <div class="vital-card" style="background: #fce4ec; padding: 1rem; border-radius: 8px; text-align: center;">
                                <i class="fas fa-heartbeat" style="font-size: 2rem; color: #c2185b;"></i>
                                <h6 style="margin-top: 0.5rem;">Heart Rate</h6>
                                <p style="font-size: 1.2rem; font-weight: bold; margin: 0;">${details.recent_vitals.heart_rate} bpm</p>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    <p class="text-muted mt-2" style="font-size: 0.9rem;"><i class="fas fa-clock me-1"></i>Recorded on: ${details.recent_vitals.recorded_date || 'Unknown'}</p>
                </div>
                ` : ''}

                <!-- Privacy Notice -->
                <div class="privacy-notice" style="margin-top: 2rem; padding: 1.5rem; background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-left: 4px solid #2196f3; border-radius: 8px;">
                    <i class="fas fa-shield-alt" style="color: #1976d2; margin-right: 0.5rem; font-size: 1.5rem;"></i>
                    <strong style="color: #1976d2; font-size: 1.1rem;">Privacy & Consent</strong>
                    <p style="margin: 0.5rem 0 0 0; color: #546e7a;">
                        This information is accessed with employee consent and is subject to strict privacy regulations. 
                        All access is logged and monitored for compliance purposes.
                    </p>
                </div>
            </div>
        </div>
    `;
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    document.body.appendChild(modal);
}

function getFitnessAlertClass(status) {
    const classMap = {
        'Fit': 'success',
        'Fit for Duty': 'success',
        'Fit with Restrictions': 'warning',
        'Review Required': 'info',
        'Temporarily Unfit': 'danger',
        'Unfit': 'danger'
    };
    return classMap[status] || 'secondary';
}

// Make closeModal globally available
window.closeModal = closeModal;

// ==================== DELETE EMPLOYEE ====================

function confirmDeleteEmployee(employeeId, employeeName) {
    if (confirm(`Are you sure you want to delete ${employeeName} from your employee directory?\n\nThis will:\n- Remove the employee from your MNC records\n- Delete all vaccination compliance records\n- Remove access to their health data\n\nThis action cannot be undone.`)) {
        deleteEmployee(employeeId);
    }
}

async function deleteEmployee(employeeId) {
    try {
        const response = await fetch(`/api/mnc/employees/${employeeId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Employee deleted successfully', 'success');
            // Reload employee list
            loadEmployeesData();
        } else {
            showNotification(data.message || 'Failed to delete employee', 'error');
        }
    } catch (error) {
        console.error('Error deleting employee:', error);
        showNotification('An error occurred while deleting employee', 'error');
    }
}

// Make delete functions globally available
window.confirmDeleteEmployee = confirmDeleteEmployee;
window.deleteEmployee = deleteEmployee;

// ==================== HEALTH ANALYTICS ====================

async function loadHealthAnalytics() {
    try {
        const response = await fetch('/api/mnc/analytics/health-trends');
        const data = await response.json();
        
        if (data.success) {
            healthTrendsData = data.health_trends;
            renderCharts(healthTrendsData);
            generateInsights(healthTrendsData, data.total_employees);
        }
    } catch (error) {
        console.error('Error loading health analytics:', error);
        showNotification('Failed to load health analytics', 'error');
    }
}

function renderCharts(trends) {
    // Fitness Distribution Chart
    renderFitnessChart(trends.fitness_distribution);
    
    // Age Distribution Chart
    renderAgeChart(trends.age_distribution);
    
    // Vaccination Chart
    renderVaccinationChart(trends.vaccination_coverage);
}

function renderFitnessChart(fitnessData) {
    const ctx = document.getElementById('fitness-chart');
    if (!ctx) return;
    
    if (charts.fitness) {
        charts.fitness.destroy();
    }
    
    charts.fitness = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(fitnessData),
            datasets: [{
                data: Object.values(fitnessData),
                backgroundColor: [
                    '#2ecc71',  // Fit - Green
                    '#f39c12',  // Fit with Restrictions - Orange
                    '#e74c3c',  // Temporarily Unfit - Red
                    '#3498db',  // Review Required - Blue
                    '#95a5a6'   // Unknown - Gray
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                title: {
                    display: false
                }
            }
        }
    });
}

function renderAgeChart(ageData) {
    const ctx = document.getElementById('age-chart');
    if (!ctx) return;
    
    if (charts.age) {
        charts.age.destroy();
    }
    
    charts.age = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(ageData),
            datasets: [{
                label: 'Employees',
                data: Object.values(ageData),
                backgroundColor: 'rgba(211, 47, 47, 0.8)',
                borderColor: 'rgba(211, 47, 47, 1)',
                borderWidth: 2,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function renderVaccinationChart(vacData) {
    const ctx = document.getElementById('vaccination-chart');
    if (!ctx) return;
    
    if (charts.vaccination) {
        charts.vaccination.destroy();
    }
    
    charts.vaccination = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Compliant', 'Partial', 'Non-Compliant'],
            datasets: [{
                data: [vacData.compliant, vacData.partial, vacData.non_compliant],
                backgroundColor: [
                    '#2ecc71',  // Compliant - Green
                    '#f39c12',  // Partial - Orange
                    '#e74c3c'   // Non-Compliant - Red
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

function generateInsights(trends, totalEmployees) {
    const insightsList = document.getElementById('insights-list');
    if (!insightsList) return;
    
    insightsList.innerHTML = '';
    
    const insights = [];
    
    // Fitness insights
    const fitCount = (trends.fitness_distribution['Fit'] || 0) + 
                    (trends.fitness_distribution['Fit with Restrictions'] || 0);
    const fitPercentage = totalEmployees > 0 ? ((fitCount / totalEmployees) * 100).toFixed(1) : 0;
    
    insights.push(`${fitPercentage}% of employees are currently fit for duty.`);
    
    if (trends.fitness_distribution['Temporarily Unfit'] > 0) {
        insights.push(`${trends.fitness_distribution['Temporarily Unfit']} employee(s) require medical leave or work restrictions.`);
    }
    
    // Age insights
    const ageGroups = Object.entries(trends.age_distribution);
    if (ageGroups.length > 0) {
        const largestGroup = ageGroups.reduce((max, curr) => curr[1] > max[1] ? curr : max);
        insights.push(`Largest age group: ${largestGroup[0]} years with ${largestGroup[1]} employees.`);
    }
    
    // Vaccination insights
    const vacCompliant = trends.vaccination_coverage.compliant;
    const vacPercentage = totalEmployees > 0 ? ((vacCompliant / totalEmployees) * 100).toFixed(1) : 0;
    insights.push(`${vacPercentage}% of employees are vaccination compliant.`);
    
    insights.forEach(insight => {
        const insightHTML = `
            <div class="insight-item" style="padding: 1rem; background: #f8f9fa; border-left: 4px solid #d32f2f; border-radius: 4px; margin-bottom: 1rem;">
                <i class="fas fa-lightbulb text-warning"></i>
                <p style="margin: 0; color: #555;">${insight}</p>
            </div>
        `;
        insightsList.innerHTML += insightHTML;
    });
}

// ==================== INCIDENTS ====================

function setupIncidentForm() {
    const form = document.getElementById('incident-form');
    
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            await submitIncident();
        });
        
        // Auto-fetch employee name when UID changes
        const uidInput = document.getElementById('incident-uid');
        if (uidInput) {
            uidInput.addEventListener('blur', function() {
                if (this.value.length === 16) {
                    fetchEmployeeName();
                }
            });
        }
    }
}

// Fetch employee name by UID
async function fetchEmployeeName() {
    const uid = document.getElementById('incident-uid').value.trim();
    const nameField = document.getElementById('incident-employee-name');
    
    if (!uid || uid.length !== 16) {
        nameField.value = '';
        return;
    }
    
    nameField.value = 'Fetching...';
    
    try {
        // Use the employee list endpoint to get employee info
        const response = await fetch(`/api/mnc/employees`);
        const data = await response.json();
        
        if (data.success && data.employees) {
            // Find employee with matching UID
            const employee = data.employees.find(emp => emp.uid === uid);
            
            if (employee) {
                nameField.value = employee.name || employee.full_name || 'Name not available';
                showNotification('Employee found', 'success');
            } else {
                nameField.value = 'Employee not found';
                showNotification('Employee not found in your organization', 'warning');
            }
        } else {
            nameField.value = 'Error fetching';
            showNotification('Failed to fetch employee data', 'error');
        }
    } catch (error) {
        console.error('Error fetching employee:', error);
        nameField.value = 'Error fetching';
        showNotification('Failed to fetch employee data', 'error');
    }
}

// Make function globally available
window.fetchEmployeeName = fetchEmployeeName;

async function submitIncident() {
    const incidentData = {
        uid: document.getElementById('incident-uid').value,
        date: document.getElementById('incident-date').value,
        time: document.getElementById('incident-time').value,
        type: document.getElementById('incident-type').value,
        location: document.getElementById('incident-location').value,
        description: document.getElementById('incident-description').value,
        action: document.getElementById('incident-action').value
    };
    
    try {
        const response = await fetch('/api/mnc/incidents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(incidentData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Incident reported successfully. ID: ${data.incident_id}`, 'success');
            document.getElementById('incident-form').reset();
            document.getElementById('incident-employee-name').value = '';
            loadIncidents();
        } else {
            showNotification(data.message || 'Failed to report incident', 'error');
        }
    } catch (error) {
        console.error('Error submitting incident:', error);
        showNotification('Failed to report incident', 'error');
    }
}

async function loadIncidents() {
    try {
        const response = await fetch('/api/mnc/incidents');
        const data = await response.json();
        
        if (data.success) {
            displayIncidents(data.incidents);
        }
    } catch (error) {
        console.error('Error loading incidents:', error);
    }
}

function displayIncidents(incidents) {
    const tbody = document.getElementById('incidents-table-body');
    if (!tbody) return;
    
    if (incidents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5">
                    <i class="fas fa-check-circle text-success" style="font-size: 3rem;"></i>
                    <p class="mt-3 text-muted">No incidents reported. Keep up the good safety practices!</p>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = incidents.map(incident => {
            const statusClass = incident.status === 'Closed' || incident.status === 'Resolved' ? 'success' :
                               incident.status === 'Open' ? 'danger' : 'warning';
            
            const hasLocation = incident.latitude && incident.longitude;
            
            return `
                <tr>
                    <td><strong>${incident.incident_id}</strong></td>
                    <td>${incident.incident_date}</td>
                    <td>${incident.employee_name || 'N/A'}</td>
                    <td><span class="badge bg-secondary" style="color: white;">${incident.incident_type}</span></td>
                    <td>
                        ${incident.location}
                        ${hasLocation ? `<br><small class="text-success"><i class="fas fa-map-marker-alt"></i> GPS: ${incident.latitude}, ${incident.longitude}</small>` : ''}
                    </td>
                    <td><span class="badge bg-${statusClass}" style="color: white;">${incident.status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="viewIncidentDetail(${incident.id})" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${hasLocation ? `
                            <button class="btn btn-sm btn-primary" onclick="shareIncidentLocation(${incident.id})" title="Share Location">
                                <i class="fas fa-share-alt"></i>
                            </button>
                        ` : ''}
                        ${incident.status !== 'Closed' && incident.status !== 'Resolved' ? `
                            <button class="btn btn-sm btn-success" onclick="closeIncident(${incident.id})" title="Close Incident">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    }
}

// Close/Resolve incident
async function closeIncident(incidentId) {
    if (!confirm('Mark this incident as resolved/closed?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/mnc/incidents/${incidentId}/close`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Incident closed successfully', 'success');
            loadIncidents();
        } else {
            showNotification(data.message || 'Failed to close incident', 'error');
        }
    } catch (error) {
        console.error('Error closing incident:', error);
        showNotification('Failed to close incident', 'error');
    }
}

// View incident detail
async function viewIncidentDetail(incidentId) {
    try {
        const response = await fetch(`/api/mnc/incidents/${incidentId}`);
        const data = await response.json();
        
        if (data.success) {
            const incident = data.incident;
            const hasLocation = incident.latitude && incident.longitude;
            
            const modalHtml = `
                <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;" onclick="this.remove()">
                    <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 700px; width: 90%; max-height: 90vh; overflow-y: auto;" onclick="event.stopPropagation()">
                        <h4 class="mb-3"><i class="fas fa-exclamation-triangle text-warning me-2"></i>${incident.incident_id}</h4>
                        <div class="row g-3">
                            <div class="col-md-6"><strong>Date/Time:</strong> ${incident.incident_date}</div>
                            <div class="col-md-6"><strong>Employee:</strong> ${incident.employee_name || 'N/A'}</div>
                            <div class="col-md-6"><strong>Type:</strong> ${incident.incident_type}</div>
                            <div class="col-md-6"><strong>Status:</strong> <span class="badge bg-secondary" style="color: white;">${incident.status}</span></div>
                            <div class="col-12"><strong>Location:</strong> ${incident.location}</div>
                            ${hasLocation ? `
                                <div class="col-12">
                                    <strong>GPS Coordinates:</strong><br>
                                    Latitude: ${incident.latitude}, Longitude: ${incident.longitude}<br>
                                    <a href="https://www.google.com/maps?q=${incident.latitude},${incident.longitude}" target="_blank" class="btn btn-sm btn-primary mt-2">
                                        <i class="fas fa-map-marker-alt me-1"></i>Open in Google Maps
                                    </a>
                                </div>
                            ` : ''}
                            <div class="col-12"><strong>Description:</strong><br>${incident.description}</div>
                            ${incident.immediate_action ? `<div class="col-12"><strong>Immediate Action:</strong><br>${incident.immediate_action}</div>` : ''}
                            <div class="col-12 mt-3">
                                <button class="btn btn-secondary" onclick="this.closest('[style*=fixed]').remove()">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
    } catch (error) {
        console.error('Error loading incident detail:', error);
        showNotification('Failed to load incident details', 'error');
    }
}

// Share incident location
async function shareIncidentLocation(incidentId) {
    try {
        const response = await fetch(`/api/mnc/incidents/${incidentId}`);
        const data = await response.json();
        
        if (data.success && data.incident.latitude && data.incident.longitude) {
            const incident = data.incident;
            const mapsUrl = `https://www.google.com/maps?q=${incident.latitude},${incident.longitude}`;
            const shareText = `Incident Location: ${incident.incident_id}\\n${incident.location}\\nCoordinates: ${incident.latitude}, ${incident.longitude}\\n${mapsUrl}`;
            
            // Copy to clipboard
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(shareText);
                showNotification('Location details copied to clipboard!', 'success');
            } else {
                // Fallback
                const textarea = document.createElement('textarea');
                textarea.value = shareText;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                showNotification('Location details copied to clipboard!', 'success');
            }
            
            // Also show shareable modal
            const modalHtml = `
                <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;" onclick="this.remove()">
                    <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%;" onclick="event.stopPropagation()">
                        <h5 class="mb-3"><i class="fas fa-share-alt text-primary me-2"></i>Share Incident Location</h5>
                        <div class="mb-3">
                            <strong>Incident:</strong> ${incident.incident_id}<br>
                            <strong>Location:</strong> ${incident.location}<br>
                            <strong>GPS:</strong> ${incident.latitude}, ${incident.longitude}
                        </div>
                        <div class="mb-3">
                            <label class="form-label"><strong>Share this information:</strong></label>
                            <textarea class="form-control" rows="4" readonly onclick="this.select()">${shareText}</textarea>
                        </div>
                        <div class="d-flex gap-2">
                            <a href="${mapsUrl}" target="_blank" class="btn btn-primary">
                                <i class="fas fa-map-marker-alt me-1"></i>Open in Maps
                            </a>
                            <button class="btn btn-secondary" onclick="this.closest('[style*=fixed]').remove()">Close</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
    } catch (error) {
        console.error('Error sharing location:', error);
        showNotification('Failed to share location', 'error');
    }
}

// Make functions globally available
window.closeIncident = closeIncident;
window.viewIncidentDetail = viewIncidentDetail;
window.shareIncidentLocation = shareIncidentLocation;

// ==================== COMPLIANCE ====================

async function loadComplianceData() {
    try {
        const response = await fetch('/api/mnc/compliance-report');
        const data = await response.json();
        
        if (data.success) {
            displayComplianceData(data.report);
        }
    } catch (error) {
        console.error('Error loading compliance data:', error);
    }
}

function displayComplianceData(report) {
    // Update compliance stats
    const certifiedEl = document.getElementById('compliance-certified');
    const vaccinatedEl = document.getElementById('compliance-vaccinated');
    const expiringEl = document.getElementById('compliance-expiring');
    const overdueEl = document.getElementById('compliance-overdue');
    
    if (certifiedEl) certifiedEl.textContent = report.fitness_certified;
    if (vaccinatedEl) vaccinatedEl.textContent = report.vaccination_compliant;
    if (expiringEl) expiringEl.textContent = report.certifications_expiring_30_days;
    if (overdueEl) overdueEl.textContent = report.health_check_overdue;
    
    // Update progress bars
    if (report.total_employees > 0) {
        const certifiedPercentage = (report.fitness_certified / report.total_employees) * 100;
        const vaccinatedPercentage = (report.vaccination_compliant / report.total_employees) * 100;
        
        const progressCertified = document.getElementById('progress-certified');
        const progressVaccinated = document.getElementById('progress-vaccinated');
        
        if (progressCertified) progressCertified.style.width = `${certifiedPercentage}%`;
        if (progressVaccinated) progressVaccinated.style.width = `${vaccinatedPercentage}%`;
    }
}

async function loadAuditLogs() {
    try {
        const response = await fetch('/api/mnc/audit-logs');
        const data = await response.json();
        
        if (data.success && data.logs) {
            const auditLogBody = document.getElementById('audit-log-body');
            if (!auditLogBody) return;
            
            if (data.logs.length === 0) {
                auditLogBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No audit logs available</td></tr>';
                return;
            }
            
            auditLogBody.innerHTML = '';
            data.logs.forEach(log => {
                const statusClass = log.status === 'Success' ? 'success' : 'danger';
                const row = `
                    <tr>
                        <td>${log.timestamp}</td>
                        <td>${log.user}</td>
                        <td>${log.action}</td>
                        <td>${log.resource}</td>
                        <td><span class="badge bg-${statusClass}" style="color: white;">${log.status}</span></td>
                    </tr>
                `;
                auditLogBody.innerHTML += row;
            });
        }
    } catch (error) {
        console.error('Error loading audit logs:', error);
    }
}

async function exportComplianceReport(format) {
    try {
        showNotification('Generating report...', 'info');
        
        // Map format to actual download URLs
        let downloadUrl;
        if (format === 'pdf') {
            downloadUrl = '/api/mnc/download-report/compliance.pdf';
        } else if (format === 'excel') {
            downloadUrl = '/api/mnc/download-report/compliance.xlsx';
        } else if (format === 'vaccination') {
            downloadUrl = '/api/mnc/download-report/vaccination.xlsx';
        } else if (format === 'fitness') {
            downloadUrl = '/api/mnc/download-report/fitness.xlsx';
        } else if (format === 'audit') {
            downloadUrl = '/api/mnc/download-report/audit_log.pdf';
        }
        
        // Trigger download by creating a temporary link
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = ''; // Let the server set the filename
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Report download started!', 'success');
    } catch (error) {
        console.error('Error exporting report:', error);
        showNotification('Failed to export report', 'error');
    }
}

// ==================== VACCINATION COMPLIANCE ====================

async function loadVaccinationCompliance() {
    try {
        const response = await fetch('/api/mnc/vaccination-compliance');
        const data = await response.json();
        
        if (data.success) {
            displayVaccinationStats(data.compliance_summary);
            displayEmployeeCompliance(data.employee_compliance);
            loadVaccinationPolicies();
            loadPendingVerifications();
        } else {
            showNotification('Failed to load vaccination compliance data', 'error');
        }
    } catch (error) {
        console.error('Error loading vaccination compliance:', error);
        showNotification('Error loading compliance data', 'error');
    }
}

function displayVaccinationStats(stats) {
    document.getElementById('vac-compliant-count').textContent = stats.fully_compliant;
    document.getElementById('vac-partial-count').textContent = stats.partially_compliant;
    document.getElementById('vac-noncompliant-count').textContent = stats.non_compliant;
    document.getElementById('vac-compliance-rate').textContent = stats.compliance_rate + '%';
}

async function loadVaccinationPolicies() {
    try {
        const response = await fetch('/api/mnc/vaccination-policies');
        const data = await response.json();
        
        if (data.success) {
            displayVaccinationPolicies(data.policies);
        }
    } catch (error) {
        console.error('Error loading policies:', error);
    }
}

function displayVaccinationPolicies(policies) {
    const tbody = document.getElementById('policies-table-body');
    if (!tbody) return;
    
    if (policies.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <i class="fas fa-shield-alt text-muted" style="font-size: 2rem;"></i>
                    <p class="mt-2 text-muted">No vaccination policies defined yet. Create one to get started.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // store policies for quick client-side lookup when editing
    window.currentVaccinationPolicies = policies || [];

    tbody.innerHTML = '';
    policies.forEach(policy => {
        const priorityBadge = {
            'Critical': 'danger',
            'High': 'warning',
            'Medium': 'info',
            'Low': 'secondary'
        }[policy.priority_level] || 'secondary';
        
        const appliesTo = policy.applies_to_all ? 
            '<span class="badge bg-success" style="color: white;">All Employees</span>' : 
            `<span class="badge bg-info" style="color: white;">${policy.specific_departments.length} Dept(s)</span>`;
        
        const row = `
            <tr>
                <td><strong>${policy.policy_name}</strong></td>
                <td>${policy.vaccine_name}</td>
                <td>${policy.vaccine_category || 'N/A'}</td>
                <td>${policy.is_mandatory ? '<span class="badge bg-danger" style="color: white;">Mandatory</span>' : '<span class="badge bg-secondary" style="color: white;">Recommended</span>'}</td>
                <td><span class="badge bg-${priorityBadge}" style="color: white;">${policy.required_doses} dose(s)</span></td>
                <td>${policy.compliance_deadline || 'No deadline'}</td>
                <td>${appliesTo}</td>
                <td>
                    <div class="d-flex gap-1">
                        <button class="btn btn-sm btn-outline-primary" onclick="editVaccinationPolicy(${policy.id})">
                            <i class="fas fa-edit me-1"></i>Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteVaccinationPolicy(${policy.id}, '${(policy.policy_name||'').replace(/'/g, "\\'" )}')">
                            <i class="fas fa-trash me-1"></i>Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

async function editVaccinationPolicy(policyId) {
    let policy = (window.currentVaccinationPolicies || []).find(p => p.id === policyId);
    if (!policy) {
        // fallback: fetch single policy
        try {
            const resp = await fetch(`/api/mnc/vaccination-policies/${policyId}`);
            const data = await resp.json();
            if (data.success) policy = data.policy;
        } catch (e) {
            console.error('Failed to load policy', e);
            showNotification('Failed to load policy for editing', 'error');
            return;
        }
    }

    if (!policy) return showNotification('Policy not found', 'error');

    // populate form
    document.getElementById('editing_policy_id').value = policy.id;
    document.getElementById('policy_name').value = policy.policy_name || '';
    document.getElementById('vaccine_name').value = policy.vaccine_name || '';
    document.getElementById('vaccine_category').value = policy.vaccine_category || '';
    document.getElementById('priority_level').value = policy.priority_level || 'Medium';
    document.getElementById('required_doses').value = policy.required_doses || 1;
    document.getElementById('is_mandatory').value = policy.is_mandatory ? 'true' : 'false';
    document.getElementById('booster_required').value = policy.booster_required ? 'true' : 'false';
    toggleBoosterFields();
    if (policy.booster_frequency_months) document.getElementById('booster_frequency_months').value = policy.booster_frequency_months;
    if (policy.effective_from) document.getElementById('effective_from').value = policy.effective_from;
    document.getElementById('compliance_deadline').value = policy.compliance_deadline || '';
    document.getElementById('applies_to_all').value = policy.applies_to_all ? 'true' : 'false';
    toggleDepartmentFields();
    // set departments checkboxes
    try {
        const depts = policy.specific_departments || [];
        ['it','hr','ops','sales','finance'].forEach(d => {
            const el = document.getElementById(`dept_${d}`);
            if (el) el.checked = depts.includes(el.value);
        });
    } catch (e) {}
    document.getElementById('policy_description').value = policy.policy_description || '';
    document.getElementById('allow_medical_exemption').checked = !!policy.allow_medical_exemption;
    document.getElementById('allow_religious_exemption').checked = !!policy.allow_religious_exemption;

    // change modal submit button to update
    const btn = document.querySelector('#createPolicyModal .modal-footer .btn-primary');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-save me-2"></i>Save Changes';
        btn.onclick = updateVaccinationPolicy;
    }

    const modal = new bootstrap.Modal(document.getElementById('createPolicyModal'));
    modal.show();
}

async function updateVaccinationPolicy() {
    const policyId = document.getElementById('editing_policy_id').value;
    if (!policyId) return showNotification('No policy selected for update', 'error');

    const policyData = {
        policy_name: document.getElementById('policy_name').value.trim(),
        vaccine_name: document.getElementById('vaccine_name').value.trim(),
        vaccine_category: document.getElementById('vaccine_category').value,
        priority_level: document.getElementById('priority_level').value,
        required_doses: parseInt(document.getElementById('required_doses').value),
        is_mandatory: document.getElementById('is_mandatory').value === 'true',
        booster_required: document.getElementById('booster_required').value === 'true',
        booster_frequency_months: document.getElementById('booster_frequency_months').value ? parseInt(document.getElementById('booster_frequency_months').value) : null,
        effective_from: document.getElementById('effective_from').value,
        compliance_deadline: document.getElementById('compliance_deadline').value || null,
        applies_to_all: document.getElementById('applies_to_all').value === 'true',
        policy_description: document.getElementById('policy_description').value.trim(),
        allow_medical_exemption: document.getElementById('allow_medical_exemption').checked,
        allow_religious_exemption: document.getElementById('allow_religious_exemption').checked
    };

    if (!policyData.applies_to_all) {
        const departments = [];
        ['it', 'hr', 'ops', 'sales', 'finance'].forEach(dept => {
            const checkbox = document.getElementById(`dept_${dept}`);
            if (checkbox && checkbox.checked) departments.push(checkbox.value);
        });
        policyData.specific_departments = departments;
    }

    if (!policyData.policy_name || !policyData.vaccine_name || !policyData.required_doses || !policyData.effective_from) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/mnc/vaccination-policies/${policyId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(policyData)
        });
        const data = await response.json();
        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('createPolicyModal')).hide();
            showNotification(data.message || 'Policy updated', 'success');
            // Force full recalculation to update all employee compliance and overdue counts
            await recalculateCompliance();
        } else {
            showNotification(data.message || 'Failed to update policy', 'error');
        }
    } catch (e) {
        console.error('Error updating policy', e);
        showNotification('Error updating policy', 'error');
    }
}

async function deleteVaccinationPolicy(policyId, policyName) {
    if (!confirm(`Delete policy "${policyName}"? This will remove it from active requirements.`)) return;

    try {
        const response = await fetch(`/api/mnc/vaccination-policies/${policyId}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            showNotification(data.message || 'Policy deleted', 'success');
            // Force full recalculation to update all employee compliance and overdue counts
            await recalculateCompliance();
        } else {
            showNotification(data.message || 'Failed to delete policy', 'error');
        }
    } catch (e) {
        console.error('Error deleting policy', e);
        showNotification('Error deleting policy', 'error');
    }
}

function displayEmployeeCompliance(employees) {
    const tbody = document.getElementById('employee-vaccination-body');
    if (!tbody) return;
    
    if (employees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <i class="fas fa-users text-muted" style="font-size: 2rem;"></i>
                    <p class="mt-2 text-muted">No employee compliance data available</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    employees.forEach(emp => {
        const complianceColor = emp.compliance_percentage >= 100 ? 'success' : 
                               emp.compliance_percentage >= 50 ? 'warning' : 'danger';
        
        const row = `
            <tr>
                <td><strong>${emp.employee_name}</strong></td>
                <td>${emp.department || 'N/A'}</td>
                <td>
                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar bg-${complianceColor}" style="width: ${emp.compliance_percentage}%">
                            ${emp.compliance_percentage}%
                        </div>
                    </div>
                </td>
                <td><span class="badge bg-${complianceColor}" style="color: white;">${emp.compliant_policies}</span></td>
                <td>${emp.total_policies}</td>
                <td>${emp.overdue_vaccinations > 0 ? `<span class="badge bg-danger" style="color: white;">${emp.overdue_vaccinations}</span>` : '<span class="text-muted">None</span>'}</td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="viewEmployeeVaccinationDetails(${emp.employee_id})">
                        <i class="fas fa-eye me-1"></i>Details
                    </button>
                    ${emp.compliance_percentage >= 100 ? 
                        '<span class="badge bg-success" style="color: white;"><i class="fas fa-check-circle me-1"></i>Fully Compliant</span>' : 
                        `<button class="btn btn-sm btn-danger" onclick="showUploadVaccinationModal(${emp.employee_id}, '${emp.employee_name}')">
                            <i class="fas fa-upload me-1"></i>Upload
                        </button>`
                    }
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

async function viewEmployeeVaccinationDetails(employeeId) {
    try {
        const response = await fetch(`/api/mnc/vaccination-compliance/${employeeId}`);
        const data = await response.json();
        
        if (data.success) {
            showEmployeeVaccinationModal(data);
        } else {
            showNotification('Failed to load employee details', 'error');
        }
    } catch (error) {
        console.error('Error loading employee vaccination details:', error);
        showNotification('Error loading details', 'error');
    }
}

function showEmployeeVaccinationModal(data) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;
    
    let complianceHTML = '';
    data.compliance_details.forEach(comp => {
        const statusBadge = {
            'Compliant': 'success',
            'Partially Compliant': 'warning',
            'Non-Compliant': 'danger'
        }[comp.compliance_status] || 'secondary';
        
        complianceHTML += `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="mb-0">${comp.vaccine_name}</h6>
                        <span class="badge bg-${statusBadge}" style="color: white;">${comp.compliance_status}</span>
                    </div>
                    <p class="text-muted mb-2"><small>${comp.vaccine_category || 'General'} ${comp.is_mandatory ? '• Mandatory' : '• Recommended'}</small></p>
                    <div class="row g-2">
                        <div class="col-6">
                            <small class="text-muted">Doses Completed:</small><br>
                            <strong>${comp.doses_completed} / ${comp.doses_required}</strong>
                        </div>
                        <div class="col-6">
                            <small class="text-muted">Last Dose:</small><br>
                            <strong>${comp.last_dose_date || 'N/A'}</strong>
                        </div>
                        ${comp.next_dose_due_date ? `
                        <div class="col-12">
                            <small class="text-muted">Next Due:</small><br>
                            <strong class="${comp.is_overdue ? 'text-danger' : ''}">${comp.next_dose_due_date} ${comp.is_overdue ? '(OVERDUE)' : ''}</strong>
                        </div>
                        ` : ''}
                        ${comp.has_exemption ? `
                        <div class="col-12">
                            <div class="alert alert-info mb-0">
                                <i class="fas fa-info-circle me-2"></i>Exemption: ${comp.exemption_type}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    let vaccinationHistoryHTML = '';
    if (data.vaccination_history.length > 0) {
        vaccinationHistoryHTML = `
            <h6 class="mt-4 mb-3">Vaccination History</h6>
            <div class="table-responsive">
                <table class="table table-sm table-bordered">
                    <thead>
                        <tr>
                            <th>Vaccine</th>
                            <th>Date</th>
                            <th>Dose</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.vaccination_history.map(v => `
                            <tr>
                                <td>${v.vaccine_name}</td>
                                <td>${v.vaccination_date}</td>
                                <td>${v.dose_number}</td>
                                <td><span class="badge bg-success" style="color: white;">${v.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; width: 90%; max-height: 90vh; overflow-y: auto; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
            <div class="modal-header" style="border-bottom: 2px solid #e0e0e0; padding: 1.5rem; background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%); color: white; border-radius: 12px 12px 0 0;">
                <h3 style="margin: 0; color: white;"><i class="fas fa-syringe me-2"></i>${data.employee.name} - Vaccination Details</h3>
                <button class="modal-close" onclick="closeModal()" style="background: rgba(255,255,255,0.2); border: none; font-size: 1.5rem; cursor: pointer; color: white; border-radius: 50%; width: 40px; height: 40px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="padding: 2rem;">
                <div class="row mb-3">
                    <div class="col-md-4">
                        <small class="text-muted">Department:</small><br>
                        <strong>${data.employee.department || 'N/A'}</strong>
                    </div>
                    <div class="col-md-4">
                        <small class="text-muted">Job Role:</small><br>
                        <strong>${data.employee.job_role || 'N/A'}</strong>
                    </div>
                    <div class="col-md-4">
                        <button class="btn btn-sm btn-danger" onclick="showUploadVaccinationModal(${data.employee.id}, '${data.employee.name}')">
                            <i class="fas fa-upload me-1"></i>Upload Record
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="viewUploadedRecords(${data.employee.id})">
                            <i class="fas fa-file-medical me-1"></i>View Uploads
                        </button>
                    </div>
                </div>
                
                <h6 class="mb-3">Policy Compliance Status</h6>
                ${complianceHTML}
                
                ${vaccinationHistoryHTML}
            </div>
        </div>
    `;
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    document.body.appendChild(modal);
}

function showCreatePolicyModal() {
    const modal = new bootstrap.Modal(document.getElementById('createPolicyModal'));
    document.getElementById('createPolicyForm').reset();
    // Set default effective date to today
    document.getElementById('effective_from').valueAsDate = new Date();
    // clear editing state
    const editInput = document.getElementById('editing_policy_id');
    if (editInput) editInput.value = '';
    const btn = document.querySelector('#createPolicyModal .modal-footer .btn-primary');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-save me-2"></i>Create Policy';
        btn.onclick = createVaccinationPolicy;
    }
    modal.show();
}

function toggleBoosterFields() {
    const boosterRequired = document.getElementById('booster_required').value === 'true';
    document.getElementById('booster_frequency_field').style.display = boosterRequired ? 'block' : 'none';
}

function toggleDepartmentFields() {
    const appliesToAll = document.getElementById('applies_to_all').value === 'true';
    document.getElementById('specific_departments_field').style.display = appliesToAll ? 'none' : 'block';
}

async function loadPendingVerifications() {
    try {
        const response = await fetch('/api/mnc/vaccination-records/pending');
        const data = await response.json();
        
        if (data.success) {
            displayPendingVerifications(data.pending_records);
        }
    } catch (error) {
        console.error('Error loading pending verifications:', error);
    }
}

function displayPendingVerifications(records) {
    const tbody = document.getElementById('pending-verification-body');
    const card = document.getElementById('pending-verification-card');
    const count = document.getElementById('pending-count');
    
    if (!tbody) return;
    
    if (records.length === 0) {
        card.style.display = 'none';
        return;
    }
    
    card.style.display = 'block';
    count.textContent = records.length;
    tbody.innerHTML = '';
    
    records.forEach(record => {
        const row = `
            <tr>
                <td><strong>${record.employee_name}</strong></td>
                <td>${record.vaccine_name}</td>
                <td>${record.vaccination_date}</td>
                <td>${record.dose_number}</td>
                <td><small class="text-muted">${record.uploaded_ago}</small></td>
                <td>
                    <button class="btn btn-sm btn-success me-1" onclick="verifyVaccinationRecord(${record.id}, 'verify')">
                        <i class="fas fa-check me-1"></i>Verify
                    </button>
                    <button class="btn btn-sm btn-danger me-1" onclick="verifyVaccinationRecord(${record.id}, 'reject')">
                        <i class="fas fa-times me-1"></i>Reject
                    </button>
                    <button class="btn btn-sm btn-info" onclick="viewUploadedRecords(${record.employee_id})">
                        <i class="fas fa-eye me-1"></i>View All
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

async function createVaccinationPolicy() {
    // ensure not in edit mode
    const editingEl = document.getElementById('editing_policy_id');
    if (editingEl) editingEl.value = '';

    const policyData = {
        policy_name: document.getElementById('policy_name').value.trim(),
        vaccine_name: document.getElementById('vaccine_name').value.trim(),
        vaccine_category: document.getElementById('vaccine_category').value,
        priority_level: document.getElementById('priority_level').value,
        required_doses: parseInt(document.getElementById('required_doses').value),
        is_mandatory: document.getElementById('is_mandatory').value === 'true',
        booster_required: document.getElementById('booster_required').value === 'true',
        booster_frequency_months: document.getElementById('booster_frequency_months').value ? parseInt(document.getElementById('booster_frequency_months').value) : null,
        effective_from: document.getElementById('effective_from').value,
        compliance_deadline: document.getElementById('compliance_deadline').value || null,
        applies_to_all: document.getElementById('applies_to_all').value === 'true',
        policy_description: document.getElementById('policy_description').value.trim(),
        allow_medical_exemption: document.getElementById('allow_medical_exemption').checked,
        allow_religious_exemption: document.getElementById('allow_religious_exemption').checked
    };
    
    // Get selected departments if applicable
    if (!policyData.applies_to_all) {
        const departments = [];
        ['it', 'hr', 'ops', 'sales', 'finance'].forEach(dept => {
            const checkbox = document.getElementById(`dept_${dept}`);
            if (checkbox && checkbox.checked) {
                departments.push(checkbox.value);
            }
        });
        policyData.specific_departments = departments;
    }
    
    // Validate
    if (!policyData.policy_name || !policyData.vaccine_name || !policyData.required_doses || !policyData.effective_from) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/mnc/vaccination-policies', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(policyData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('createPolicyModal')).hide();
            showNotification(data.message, 'success');
            // Force full recalculation to update all employee compliance
            await recalculateCompliance();
        } else {
            showNotification(data.message || 'Failed to create policy', 'error');
        }
    } catch (error) {
        console.error('Error creating policy:', error);
        showNotification('Error creating policy', 'error');
    }
}

async function recalculateCompliance() {
    try {
        const response = await fetch('/api/mnc/vaccination-compliance/calculate', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            loadVaccinationCompliance();
        } else {
            showNotification(data.message || 'Failed to recalculate compliance', 'error');
        }
    } catch (error) {
        console.error('Error recalculating compliance:', error);
        showNotification('Error recalculating compliance', 'error');
    }
}

function downloadVaccinationDocument(recordId, filename) {
    if (!recordId) {
        showNotification('No document available', 'error');
        return;
    }
    
    // Use the download API endpoint
    window.location.href = `/api/mnc/vaccination-records/${recordId}/download`;
}

// Make functions globally available
window.showCreatePolicyModal = showCreatePolicyModal;
window.toggleBoosterFields = toggleBoosterFields;
window.toggleDepartmentFields = toggleDepartmentFields;
window.createVaccinationPolicy = createVaccinationPolicy;
window.recalculateCompliance = recalculateCompliance;
window.viewEmployeeVaccinationDetails = viewEmployeeVaccinationDetails;
window.showUploadVaccinationModal = showUploadVaccinationModal;
window.uploadVaccinationRecord = uploadVaccinationRecord;
window.viewUploadedRecords = viewUploadedRecords;
window.verifyVaccinationRecord = verifyVaccinationRecord;
window.previewUploadedDocument = previewUploadedDocument;
window.editVaccinationPolicy = editVaccinationPolicy;
window.updateVaccinationPolicy = updateVaccinationPolicy;
window.deleteVaccinationPolicy = deleteVaccinationPolicy;
window.downloadVaccinationDocument = downloadVaccinationDocument;


// ==================== UPLOAD VACCINATION RECORDS ====================

function showUploadVaccinationModal(employeeId, employeeName) {
    closeModal(); // Close existing modal
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'upload-vaccination-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
            <div class="modal-header" style="border-bottom: 2px solid #e0e0e0; padding: 1.5rem; background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%); color: white; border-radius: 12px 12px 0 0;">
                <h3 style="margin: 0; color: white;"><i class="fas fa-upload me-2"></i>Upload Vaccination Record</h3>
                <button class="modal-close" onclick="closeUploadModal()" style="background: rgba(255,255,255,0.2); border: none; font-size: 1.5rem; cursor: pointer; color: white; border-radius: 50%; width: 40px; height: 40px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="padding: 2rem;">
                <p class="mb-4"><strong>Employee:</strong> ${employeeName}</p>
                <form id="uploadVaccinationForm">
                    <input type="hidden" id="upload_employee_id" value="${employeeId}">
                    
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label">Vaccine Name *</label>
                            <select class="form-control" id="upload_vaccine_name" required>
                                <option value="">Loading policies...</option>
                            </select>
                            <small class="text-muted">Only vaccines from your policies</small>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Vaccine Category</label>
                            <select class="form-control" id="upload_vaccine_category">
                                <option value="">Select category</option>
                                <option value="Mandatory">Mandatory</option>
                                <option value="Recommended">Recommended</option>
                                <option value="Seasonal">Seasonal</option>
                                <option value="Travel">Travel</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Vaccination Date *</label>
                            <input type="date" class="form-control" id="upload_vaccination_date" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Dose Number *</label>
                            <input type="number" class="form-control" id="upload_dose_number" min="1" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Manufacturer</label>
                            <input type="text" class="form-control" id="upload_manufacturer">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Batch Number</label>
                            <input type="text" class="form-control" id="upload_batch_number">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Administered At</label>
                            <input type="text" class="form-control" id="upload_administered_at" placeholder="Hospital/Clinic name">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Administered By</label>
                            <input type="text" class="form-control" id="upload_administered_by" placeholder="Doctor/Healthcare provider">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Next Dose Due</label>
                            <input type="date" class="form-control" id="upload_next_dose_due">
                        </div>
                        <div class="col-12">
                            <label class="form-label">Upload Certificate/Document</label>
                            <input type="file" class="form-control" id="upload_document" accept=".pdf,.jpg,.jpeg,.png" onchange="previewUploadedDocument(this)">
                            <small class="text-muted">Accepted: PDF, JPG, PNG (Max 5MB)</small>
                            <div id="document_preview" class="mt-3" style="display: none;">
                                <img id="preview_image" style="max-width: 100%; max-height: 300px; border-radius: 8px; border: 2px solid #ddd; padding: 5px;" />
                                <div id="pdf_preview" style="padding: 1rem; background: #f5f5f5; border-radius: 8px; border: 2px solid #ddd;">
                                    <i class="fas fa-file-pdf text-danger" style="font-size: 3rem;"></i>
                                    <p id="pdf_name" class="mt-2 mb-0"></p>
                                </div>
                            </div>
                        </div>
                        <div class="col-12">
                            <label class="form-label">Notes</label>
                            <textarea class="form-control" id="upload_notes" rows="3"></textarea>
                        </div>
                    </div>
                    
                    <div class="mt-4 d-flex justify-content-end gap-2">
                        <button type="button" class="btn btn-secondary" onclick="closeUploadModal()">Cancel</button>
                        <button type="button" class="btn btn-danger" onclick="uploadVaccinationRecord()">
                            <i class="fas fa-upload me-2"></i>Upload Record
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeUploadModal();
        }
    });
    
    document.body.appendChild(modal);
    
    // Load policy vaccine names to populate dropdown
    loadPolicyVaccineNames();
}

async function loadPolicyVaccineNames() {
    try {
        const response = await fetch('/api/mnc/vaccination-policies');
        const data = await response.json();
        
        const select = document.getElementById('upload_vaccine_name');
        if (!select) return;
        
        if (data.success && data.policies && data.policies.length > 0) {
            select.innerHTML = '<option value="">Select vaccine from policy</option>';
            
            // Add unique vaccine names from policies
            const uniqueVaccines = [...new Set(data.policies.map(p => p.vaccine_name))];
            uniqueVaccines.forEach(vaccineName => {
                const option = document.createElement('option');
                option.value = vaccineName;
                option.textContent = vaccineName;
                select.appendChild(option);
            });
        } else {
            select.innerHTML = '<option value="">No policies created yet</option>';
            showNotification('Please create a vaccination policy first', 'warning');
        }
    } catch (error) {
        console.error('Error loading policy vaccine names:', error);
        const select = document.getElementById('upload_vaccine_name');
        if (select) {
            select.innerHTML = '<option value="">Error loading policies</option>';
        }
    }
}

function previewUploadedDocument(input) {
    const preview = document.getElementById('document_preview');
    const imagePreview = document.getElementById('preview_image');
    const pdfPreview = document.getElementById('pdf_preview');
    const pdfName = document.getElementById('pdf_name');
    
    if (!input.files || !input.files[0]) {
        preview.style.display = 'none';
        return;
    }
    
    const file = input.files[0];
    const fileType = file.type;
    
    // Show preview container
    preview.style.display = 'block';
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('File size exceeds 5MB limit', 'error');
        input.value = '';
        preview.style.display = 'none';
        return;
    }
    
    if (fileType.startsWith('image/')) {
        // Show image preview
        imagePreview.style.display = 'block';
        pdfPreview.style.display = 'none';
        
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } else if (fileType === 'application/pdf') {
        // Show PDF placeholder
        imagePreview.style.display = 'none';
        pdfPreview.style.display = 'block';
        pdfName.textContent = file.name;
    } else {
        showNotification('Unsupported file type', 'error');
        input.value = '';
        preview.style.display = 'none';
    }
}

async function uploadVaccinationRecord() {
    const employeeId = document.getElementById('upload_employee_id').value;
    const vaccineName = document.getElementById('upload_vaccine_name').value.trim();
    const vaccinationDate = document.getElementById('upload_vaccination_date').value;
    const doseNumber = document.getElementById('upload_dose_number').value;
    
    if (!vaccineName || !vaccinationDate || !doseNumber) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('vaccine_name', vaccineName);
    formData.append('vaccine_category', document.getElementById('upload_vaccine_category').value);
    formData.append('vaccination_date', vaccinationDate);
    formData.append('dose_number', doseNumber);
    formData.append('manufacturer', document.getElementById('upload_manufacturer').value.trim());
    formData.append('batch_number', document.getElementById('upload_batch_number').value.trim());
    formData.append('administered_at', document.getElementById('upload_administered_at').value.trim());
    formData.append('administered_by', document.getElementById('upload_administered_by').value.trim());
    formData.append('next_dose_due', document.getElementById('upload_next_dose_due').value);
    formData.append('notes', document.getElementById('upload_notes').value.trim());
    
    const fileInput = document.getElementById('upload_document');
    if (fileInput.files.length > 0) {
        formData.append('vaccination_document', fileInput.files[0]);
    }
    
    try {
        const response = await fetch(`/api/mnc/employees/${employeeId}/upload-vaccination`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeUploadModal();
            showNotification('Vaccination record uploaded successfully', 'success');
            
            // Show verification prompt popup
            const verifyNow = confirm('Vaccination record uploaded successfully! Would you like to verify it now?');
            if (verifyNow) {
                // Load pending verifications and show them
                await loadPendingVerifications();
                // Scroll to pending verification section
                const pendingSection = document.getElementById('pending-verification-card');
                if (pendingSection) {
                    pendingSection.style.display = 'block';
                    pendingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
            
            // Refresh compliance data
            await recalculateCompliance();
        } else {
            showNotification(data.message || 'Failed to upload record', 'error');
        }
    } catch (error) {
        console.error('Error uploading vaccination record:', error);
        showNotification('Error uploading record', 'error');
    }
}

async function viewUploadedRecords(employeeId) {
    try {
        const response = await fetch(`/api/mnc/vaccination-records/${employeeId}`);
        const data = await response.json();
        
        if (data.success) {
            showUploadedRecordsModal(data, employeeId);
        } else {
            showNotification('Failed to load records', 'error');
        }
    } catch (error) {
        console.error('Error loading uploaded records:', error);
        showNotification('Error loading records', 'error');
    }
}

function showUploadedRecordsModal(data, employeeId) {
    closeModal(); // Close existing modal
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'uploaded-records-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    let mncRecordsHTML = '';
    if (data.mnc_uploaded_records.length > 0) {
        mncRecordsHTML = `
            <h6 class="mb-3">MNC Uploaded Records</h6>
            <div class="table-responsive">
                <table class="table table-sm table-bordered">
                    <thead>
                        <tr>
                            <th>Vaccine</th>
                            <th>Date</th>
                            <th>Dose</th>
                            <th>Status</th>
                            <th>Document</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.mnc_uploaded_records.map(record => `
                            <tr>
                                <td>${record.vaccine_name}</td>
                                <td>${record.vaccination_date}</td>
                                <td>${record.dose_number}</td>
                                <td>
                                    <span class="badge bg-${record.verification_status === 'Verified' ? 'success' : record.verification_status === 'Rejected' ? 'danger' : 'warning'}" style="color: white;">
                                        ${record.verification_status}
                                    </span>
                                </td>
                                <td>
                                    ${record.has_document ? 
                                        `<span onclick="downloadVaccinationDocument(${record.id}, '${record.document_filename}')" style="cursor: pointer; color: #d32f2f; text-decoration: underline;" title="Click to download">
                                            <i class="fas fa-file-pdf me-1"></i>${record.document_filename}
                                        </span>` 
                                        : '<span class="text-muted">No document</span>'}
                                </td>
                                <td>
                                    ${record.verification_status === 'Pending' ? `
                                        <button class="btn btn-sm btn-success me-1" onclick="verifyVaccinationRecord(${record.id}, 'verify')">
                                            <i class="fas fa-check me-1"></i>Verify
                                        </button>
                                        <button class="btn btn-sm btn-danger" onclick="verifyVaccinationRecord(${record.id}, 'reject')">
                                            <i class="fas fa-times me-1"></i>Reject
                                        </button>
                                    ` : `<span class="text-muted">${record.verification_status}</span>`}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else {
        mncRecordsHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>No uploaded records found for this employee.
            </div>
        `;
    }
    
    let systemRecordsHTML = '';
    if (data.system_records.length > 0) {
        systemRecordsHTML = `
            <h6 class="mt-4 mb-3">Employee System Records</h6>
            <div class="table-responsive">
                <table class="table table-sm table-bordered">
                    <thead>
                        <tr>
                            <th>Vaccine</th>
                            <th>Date</th>
                            <th>Dose</th>
                            <th>Location</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.system_records.map(record => `
                            <tr>
                                <td>${record.vaccine_name}</td>
                                <td>${record.vaccination_date}</td>
                                <td>${record.dose_number}</td>
                                <td>${record.hospital_clinic_name || 'N/A'}</td>
                                <td><span class="badge bg-success" style="color: white;">${record.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; width: 90%; max-height: 90vh; overflow-y: auto; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
            <div class="modal-header" style="border-bottom: 2px solid #e0e0e0; padding: 1.5rem; background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%); color: white; border-radius: 12px 12px 0 0;">
                <h3 style="margin: 0; color: white;"><i class="fas fa-file-medical me-2"></i>Vaccination Records</h3>
                <button class="modal-close" onclick="closeUploadModal()" style="background: rgba(255,255,255,0.2); border: none; font-size: 1.5rem; cursor: pointer; color: white; border-radius: 50%; width: 40px; height: 40px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="padding: 2rem;">
                ${mncRecordsHTML}
                ${systemRecordsHTML}
                
                <div class="mt-4">
                    <button class="btn btn-danger" onclick="closeUploadModal(); showUploadVaccinationModal(${employeeId}, 'Employee');">
                        <i class="fas fa-plus me-2"></i>Upload New Record
                    </button>
                </div>
            </div>
        </div>
    `;
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeUploadModal();
        }
    });
    
    document.body.appendChild(modal);
}

async function verifyVaccinationRecord(recordId, action) {
    const notes = action === 'reject' ? prompt('Enter rejection reason:') : '';
    
    if (action === 'reject' && !notes) {
        return; // User cancelled
    }
    
    try {
        const response = await fetch(`/api/mnc/vaccination-records/${recordId}/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action, notes })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            closeUploadModal();
            // Refresh vaccination compliance
            await recalculateCompliance();
        } else {
            showNotification(data.message || 'Failed to process', 'error');
        }
    } catch (error) {
        console.error('Error verifying record:', error);
        showNotification('Error processing verification', 'error');
    }
}

function closeUploadModal() {
    const overlay = document.getElementById('upload-vaccination-overlay') || document.getElementById('uploaded-records-overlay');
    if (overlay) {
        overlay.remove();
    }
}



// Make exportComplianceReport globally available
window.exportComplianceReport = exportComplianceReport;

// ==================== NOTIFICATIONS ====================

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 1rem;
        z-index: 2000;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
    `;
    
    const borderColor = {
        'success': '#2ecc71',
        'error': '#e74c3c',
        'info': '#3498db',
        'warning': '#f39c12'
    }[type] || '#3498db';
    
    notification.style.borderLeft = `4px solid ${borderColor}`;
    
    const icon = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'info': 'info-circle',
        'warning': 'exclamation-triangle'
    }[type] || 'info-circle';
    
    notification.innerHTML = `
        <i class="fas fa-${icon}" style="color: ${borderColor}; font-size: 1.5rem;"></i>
        <span style="color: #2c3e50;">${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Add slide-in animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    if (!document.getElementById('notification-animation')) {
        style.id = 'notification-animation';
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==================== UTILITY FUNCTIONS ====================

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function formatTime(timeString) {
    if (!timeString) return 'N/A';
    
    const date = new Date(timeString);
    const options = { hour: '2-digit', minute: '2-digit' };
    return date.toLocaleTimeString('en-US', options);
}

// Close modal on outside click
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        closeModal();
    }
});

console.log('MNC Dashboard JavaScript fully loaded and initialized');


async function loadHealthAnalytics() {
    try {
        const response = await fetch('/api/mnc/analytics/health-trends');
        const data = await response.json();
        
        if (data.success) {
            healthTrendsData = data.health_trends;
            renderCharts(healthTrendsData);
            generateInsights(healthTrendsData, data.total_employees);
        }
    } catch (error) {
        console.error('Error loading health analytics:', error);
        showNotification('Failed to load health analytics', 'error');
    }
}

function renderCharts(trends) {
    // Fitness Distribution Chart
    renderFitnessChart(trends.fitness_distribution);
    
    // Age Distribution Chart
    renderAgeChart(trends.age_distribution);
    
    // Vaccination Chart
    renderVaccinationChart(trends.vaccination_coverage);
}

function renderFitnessChart(fitnessData) {
    const ctx = document.getElementById('fitness-chart');
    if (!ctx) return;
    
    if (charts.fitness) {
        charts.fitness.destroy();
    }
    
    charts.fitness = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(fitnessData),
            datasets: [{
                data: Object.values(fitnessData),
                backgroundColor: [
                    '#2ecc71',
                    '#f39c12',
                    '#e74c3c',
                    '#3498db',
                    '#95a5a6'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function renderAgeChart(ageData) {
    const ctx = document.getElementById('age-chart');
    if (!ctx) return;
    
    if (charts.age) {
        charts.age.destroy();
    }
    
    charts.age = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(ageData),
            datasets: [{
                label: 'Employees',
                data: Object.values(ageData),
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function renderVaccinationChart(vacData) {
    const ctx = document.getElementById('vaccination-chart');
    if (!ctx) return;
    
    if (charts.vaccination) {
        charts.vaccination.destroy();
    }
    
    charts.vaccination = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Compliant', 'Partial', 'Non-Compliant'],
            datasets: [{
                data: [vacData.compliant, vacData.partial, vacData.non_compliant],
                backgroundColor: [
                    '#2ecc71',
                    '#f39c12',
                    '#e74c3c'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function generateInsights(trends, totalEmployees) {
    const insightsList = document.getElementById('insights-list');
    if (!insightsList) return;
    
    insightsList.innerHTML = '';
    
    const insights = [];
    
    // Calculate percentages
    const fitPercentage = ((trends.fitness_distribution.Fit / totalEmployees) * 100).toFixed(1);
    
    insights.push(`${fitPercentage}% of employees are currently fit for duty.`);
    
    if (trends.fitness_distribution['Temporarily Unfit'] > 0) {
        insights.push(`${trends.fitness_distribution['Temporarily Unfit']} employee(s) require medical leave or work restrictions.`);
    }
    
    // Age insights
    const youngestGroup = Math.max(...Object.values(trends.age_distribution));
    const oldestGroup = Object.keys(trends.age_distribution).find(
        key => trends.age_distribution[key] === youngestGroup
    );
    
    insights.push(`Largest age group: ${oldestGroup} years with ${youngestGroup} employees.`);
    
    insights.forEach(insight => {
        const insightHTML = `
            <div class="insight-item">
                <i class="fas fa-lightbulb"></i>
                <p>${insight}</p>
            </div>
        `;
        insightsList.innerHTML += insightHTML;
    });
}

// ==================== EMPLOYEE REGISTRATION ====================

function showRegisterEmployeeModal() {
    const modal = new bootstrap.Modal(document.getElementById('registerEmployeeModal'));
    document.getElementById('registerEmployeeForm').reset();
    document.getElementById('employee_details_section').style.display = 'none';
    document.getElementById('no_uid_checkbox').checked = false;
    document.getElementById('uid_section').style.display = 'contents';
    document.getElementById('new_employee_section').style.display = 'none';
    modal.show();
}

function toggleUIDField() {
    const checkbox = document.getElementById('no_uid_checkbox');
    const uidSection = document.getElementById('uid_section');
    const newEmployeeSection = document.getElementById('new_employee_section');
    const detailsSection = document.getElementById('employee_details_section');
    
    if (checkbox.checked) {
        // Hide UID field, show new employee fields
        uidSection.style.display = 'none';
        newEmployeeSection.style.display = 'contents';
        detailsSection.style.display = 'none';
        document.getElementById('reg_uid').required = false;
    } else {
        // Show UID field, hide new employee fields
        uidSection.style.display = 'contents';
        newEmployeeSection.style.display = 'none';
        detailsSection.style.display = 'none';
        document.getElementById('reg_uid').required = true;
    }
}

async function fetchEmployeeDetails() {
    const uid = document.getElementById('reg_uid').value.trim();
    
    if (!uid) {
        showNotification('Please enter UID', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/mnc/employees/fetch-by-uid?uid=${uid}`);
        const data = await response.json();
        
        if (data.success) {
            // Fill in the form with fetched data
            document.getElementById('reg_full_name').value = data.employee.full_name || '';
            document.getElementById('reg_email').value = data.employee.email || '';
            document.getElementById('reg_mobile').value = data.employee.mobile || '';
            document.getElementById('reg_gender').value = data.employee.gender || '';
            
            // Show the details section
            document.getElementById('employee_details_section').style.display = 'contents';
            
            showNotification('Employee details fetched successfully!', 'success');
        } else {
            showNotification(data.message || 'Failed to fetch employee details', 'error');
        }
    } catch (error) {
        console.error('Error fetching employee:', error);
        showNotification('An error occurred. Please try again.', 'error');
    }
}

async function registerEmployee() {
    const noUIDChecked = document.getElementById('no_uid_checkbox').checked;
    
    if (noUIDChecked) {
        // Register new employee without existing UID - generate UID first
        await registerNewEmployeeWithUID();
    } else {
        // Register employee with existing UID
        await registerExistingEmployee();
    }
}

async function registerNewEmployeeWithUID() {
    // Validate new employee fields
    const fullName = document.getElementById('new_full_name').value.trim();
    const email = document.getElementById('new_email').value.trim();
    const mobile = document.getElementById('new_mobile').value.trim();
    const gender = document.getElementById('new_gender').value;
    const dob = document.getElementById('new_dob').value;
    
    if (!fullName || !email || !mobile || !gender || !dob) {
        showNotification('Please fill all required fields', 'error');
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    
    // Validate mobile format (10 digits)
    const mobileRegex = /^\d{10}$/;
    if (!mobileRegex.test(mobile)) {
        showNotification('Please enter a valid 10-digit mobile number', 'error');
        return;
    }
    
    const newEmployeeData = {
        full_name: fullName,
        email: email,
        mobile: mobile,
        gender: gender,
        dob: dob,
        blood_group: document.getElementById('new_blood_group').value,
        employee_id: document.getElementById('reg_employee_id').value.trim(),
        department: document.getElementById('reg_department').value,
        job_role: document.getElementById('reg_job_role').value.trim()
    };
    
    try {
        const response = await fetch('/api/mnc/employees/create-with-uid', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newEmployeeData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Close registration modal
            bootstrap.Modal.getInstance(document.getElementById('registerEmployeeModal')).hide();
            
            // Reload employees list
            loadEmployeesData();
            
            showNotification(`Employee registered successfully! Generated UID: ${data.uid}`, 'success');
        } else {
            showNotification(data.message || 'Failed to register employee', 'error');
        }
    } catch (error) {
        console.error('Error registering new employee:', error);
        showNotification('An error occurred. Please try again.', 'error');
    }
}

async function registerExistingEmployee() {
    const uid = document.getElementById('reg_uid').value.trim();
    
    // Validate required fields
    if (!uid) {
        showNotification('Please enter UID and fetch employee details', 'error');
        return;
    }
    
    const detailsSection = document.getElementById('employee_details_section');
    if (detailsSection.style.display === 'none') {
        showNotification('Please fetch employee details first', 'error');
        return;
    }
    
    const employeeData = {
        uid: uid,
        employee_id: document.getElementById('reg_employee_id').value.trim(),
        department: document.getElementById('reg_department').value,
        job_role: document.getElementById('reg_job_role').value.trim()
    };
    
    try {
        const response = await fetch('/api/mnc/employees/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(employeeData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Close registration modal
            bootstrap.Modal.getInstance(document.getElementById('registerEmployeeModal')).hide();
            
            // Reload employees list
            loadEmployeesData();
            
            showNotification(data.message, 'success');
        } else {
            showNotification(data.message || 'Failed to register employee', 'error');
        }
    } catch (error) {
        console.error('Error registering employee:', error);
        showNotification('An error occurred. Please try again.', 'error');
    }
}

// ==================== FITNESS ASSESSMENTS ====================

// Load fitness assessments data
async function loadFitnessAssessments() {
    try {
        // Load pending employees (those needing assessment)
        loadPendingAssessments();
        
        // Load completed assessments
        const response = await fetch('/api/mnc/fitness-assessments');
        const data = await response.json();
        
        if (data.success) {
            displayFitnessAssessments(data.assessments);
            loadFitnessStats();
        } else {
            console.error('Failed to load fitness assessments');
        }
    } catch (error) {
        console.error('Error loading fitness assessments:', error);
    }
}

// Load employees pending assessment
async function loadPendingAssessments() {
    try {
        const response = await fetch('/api/mnc/employees');
        const data = await response.json();
        
        if (data.success) {
            // Filter employees with "Review Required" status
            const pendingEmployees = data.employees.filter(emp => 
                emp.fitness_status === 'Review Required'
            );
            
            displayPendingAssessments(pendingEmployees);
        }
    } catch (error) {
        console.error('Error loading pending assessments:', error);
    }
}

// Display employees needing assessment
function displayPendingAssessments(employees) {
    const tbody = document.getElementById('pending-assessment-body');
    const countBadge = document.getElementById('pending-assessment-count');
    
    countBadge.textContent = employees.length;
    
    if (employees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-success py-4">
                    <i class="fas fa-check-circle me-2"></i>All employees have been assessed!
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = employees.map(emp => `
        <tr>
            <td><strong>${emp.uid || 'N/A'}</strong></td>
            <td>${emp.name}</td>
            <td>${emp.employee_id || '-'}</td>
            <td>${emp.department || '-'}</td>
            <td>${emp.job_role || '-'}</td>
            <td><span class="badge bg-info" style="color: white;">${emp.fitness_status}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="openAssessmentForEmployee(${emp.id}, '${emp.name}')">
                    <i class="fas fa-clipboard-check me-1"></i>Assess
                </button>
            </td>
        </tr>
    `).join('');
}

// Open assessment modal with employee pre-selected
async function openAssessmentForEmployee(employeeId, employeeName) {
    await showCreateAssessmentModal();
    
    // Pre-select the employee
    const select = document.getElementById('assess_employee');
    select.value = employeeId;
    
    // Disable the select since we're assessing a specific employee
    select.disabled = true;
}

// Display fitness assessments in table
function displayFitnessAssessments(assessments) {
    const tbody = document.getElementById('assessments-table-body');
    
    if (assessments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="fas fa-inbox me-2"></i>No fitness assessments found
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = assessments.map(assessment => {
        const statusClass = {
            'Fit': 'success',
            'Fit with Restrictions': 'warning',
            'Temporarily Unfit': 'danger',
            'Review Required': 'info'
        }[assessment.fitness_status] || 'secondary';
        
        return `
            <tr>
                <td>${assessment.employee_name}</td>
                <td>${assessment.employee_id || '-'}</td>
                <td>${assessment.department || '-'}</td>
                <td>${assessment.assessment_date}</td>
                <td><span class="badge bg-secondary" style="color: white;">${assessment.assessment_type}</span></td>
                <td><span class="badge bg-${statusClass}" style="color: white;">${assessment.fitness_status}</span></td>
                <td>${assessment.next_review_date || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-info me-1" onclick="viewAssessmentDetail(${assessment.id})">
                        <i class="fas fa-eye me-1"></i>View
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="invalidateAssessment(${assessment.id})">
                        <i class="fas fa-redo me-1"></i>Re-assess
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Load fitness statistics
async function loadFitnessStats() {
    try {
        const response = await fetch('/api/mnc/fitness-stats');
        const data = await response.json();
        
        if (data.success) {
            const stats = data.stats;
            
            // Update stat cards
            document.getElementById('fit-count').textContent = stats.fit;
            document.getElementById('fit-restricted-count').textContent = stats.fit_restricted;
            document.getElementById('unfit-count').textContent = stats.unfit;
            document.getElementById('review-count').textContent = stats.review_required;
            
            // Show/hide alerts
            if (stats.upcoming_reviews > 0) {
                document.getElementById('upcoming-reviews-count').textContent = stats.upcoming_reviews;
                document.getElementById('upcoming-reviews-alert').style.display = 'block';
            } else {
                document.getElementById('upcoming-reviews-alert').style.display = 'none';
            }
            
            if (stats.overdue_reviews > 0) {
                document.getElementById('overdue-reviews-count').textContent = stats.overdue_reviews;
                document.getElementById('overdue-reviews-alert').style.display = 'block';
            } else {
                document.getElementById('overdue-reviews-alert').style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading fitness stats:', error);
    }
}

// Show create assessment modal
async function showCreateAssessmentModal() {
    // Load employees into dropdown
    const select = document.getElementById('assess_employee');
    select.innerHTML = '<option value="">Choose employee...</option>';
    
    if (employeesData.length === 0) {
        await loadEmployeesData();
    }
    
    employeesData.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.id;
        option.textContent = `${emp.name} - ${emp.employee_id || 'No ID'} (${emp.department || 'No Dept'})`;
        select.appendChild(option);
    });
    
    // Set today's date as default
    document.getElementById('assess_date').valueAsDate = new Date();
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('createAssessmentModal'));
    modal.show();
}

// Create fitness assessment
async function createAssessment() {
    const employeeId = document.getElementById('assess_employee').value;
    const assessDate = document.getElementById('assess_date').value;
    const assessType = document.getElementById('assess_type').value;
    const assessStatus = document.getElementById('assess_status').value;
    const frequency = document.getElementById('assess_frequency').value;
    
    if (!employeeId || !assessDate || !assessType || !assessStatus) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    const assessmentData = {
        employee_id: parseInt(employeeId),
        assessment_date: assessDate,
        assessment_type: assessType,
        fitness_status: assessStatus,
        review_frequency: frequency,
        restrictions: document.getElementById('assess_restrictions').value.trim(),
        work_capability_summary: document.getElementById('assess_summary').value.trim(),
        recommended_accommodations: document.getElementById('assess_accommodations').value.trim(),
        doctor_id: document.getElementById('assess_doctor').value ? parseInt(document.getElementById('assess_doctor').value) : null,
        facility_id: document.getElementById('assess_facility').value ? parseInt(document.getElementById('assess_facility').value) : null
    };
    
    try {
        const response = await fetch('/api/mnc/fitness-assessments/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(assessmentData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Re-enable employee select
            const select = document.getElementById('assess_employee');
            select.disabled = false;
            
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('createAssessmentModal')).hide();
            
            // Clear form
            document.getElementById('createAssessmentForm').reset();
            
            // Reload all assessment data
            loadFitnessAssessments();
            
            showNotification(data.message + ' (Cert: ' + data.certificate_number + ')', 'success');
        } else {
            showNotification(data.error || 'Failed to create assessment', 'error');
        }
    } catch (error) {
        console.error('Error creating assessment:', error);
        showNotification('An error occurred. Please try again.', 'error');
    }
}

// View assessment detail
async function viewAssessmentDetail(assessmentId) {
    try {
        const response = await fetch(`/api/mnc/fitness-assessments/${assessmentId}`);
        const data = await response.json();
        
        if (data.success) {
            const assessment = data.assessment;
            
            // Create detailed modal
            const modalHtml = `
                <div class="modal fade" id="assessmentDetailModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title">
                                    <i class="fas fa-heartbeat me-2"></i>Fitness Assessment Detail
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <strong>Employee:</strong> ${assessment.employee_name}
                                    </div>
                                    <div class="col-md-6">
                                        <strong>Employee ID:</strong> ${assessment.employee_id || 'N/A'}
                                    </div>
                                    <div class="col-md-6">
                                        <strong>Department:</strong> ${assessment.department || 'N/A'}
                                    </div>
                                    <div class="col-md-6">
                                        <strong>Job Role:</strong> ${assessment.job_role || 'N/A'}
                                    </div>
                                    <div class="col-12"><hr></div>
                                    <div class="col-md-6">
                                        <strong>Assessment Date:</strong> ${assessment.assessment_date}
                                    </div>
                                    <div class="col-md-6">
                                        <strong>Assessment Type:</strong> ${assessment.assessment_type}
                                    </div>
                                    <div class="col-md-6">
                                        <strong>Fitness Status:</strong> 
                                        <span class="badge ${getFitnessStatusClass(assessment.fitness_status)}">${assessment.fitness_status}</span>
                                    </div>
                                    <div class="col-md-6">
                                        <strong>Review Frequency:</strong> ${assessment.review_frequency || 'N/A'}
                                    </div>
                                    <div class="col-12"><hr></div>
                                    <div class="col-12">
                                        <strong>Work Restrictions:</strong>
                                        <p class="mb-0 mt-1">${assessment.restrictions || 'None'}</p>
                                    </div>
                                    <div class="col-12">
                                        <strong>Work Capability Summary:</strong>
                                        <p class="mb-0 mt-1">${assessment.work_capability_summary || 'N/A'}</p>
                                    </div>
                                    <div class="col-12">
                                        <strong>Recommended Accommodations:</strong>
                                        <p class="mb-0 mt-1">${assessment.recommended_accommodations || 'None'}</p>
                                    </div>
                                    <div class="col-12"><hr></div>
                                    <div class="col-md-6">
                                        <strong>Certificate Number:</strong> ${assessment.certificate_number || 'N/A'}
                                    </div>
                                    <div class="col-md-6">
                                        <strong>Certificate Expiry:</strong> ${assessment.certificate_expiry_date || 'N/A'}
                                    </div>
                                    <div class="col-md-6">
                                        <strong>Next Review Date:</strong> ${assessment.next_review_date || 'N/A'}
                                    </div>
                                    <div class="col-md-6">
                                        <strong>Valid:</strong> ${assessment.is_valid ? 'Yes' : 'No'}
                                    </div>
                                    <div class="col-12"><hr></div>
                                    <div class="col-md-6">
                                        <strong>Doctor:</strong> ${assessment.doctor_name}
                                    </div>
                                    <div class="col-md-6">
                                        <strong>Facility:</strong> ${assessment.facility_name}
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal if any
            const existingModal = document.getElementById('assessmentDetailModal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // Add modal to body
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('assessmentDetailModal'));
            modal.show();
            
            // Clean up on close
            document.getElementById('assessmentDetailModal').addEventListener('hidden.bs.modal', function() {
                this.remove();
            });
        } else {
            showNotification(data.error || 'Failed to load assessment details', 'error');
        }
    } catch (error) {
        console.error('Error loading assessment detail:', error);
        showNotification('An error occurred. Please try again.', 'error');
    }
}

// Helper function to get status badge class
function getFitnessStatusClass(status) {
    const classes = {
        'Fit': 'bg-success',
        'Fit with Restrictions': 'bg-warning',
        'Temporarily Unfit': 'bg-danger',
        'Review Required': 'bg-info'
    };
    return classes[status] || 'bg-secondary';
}

// Invalidate assessment
function invalidateAssessment(assessmentId) {
    // Store assessment ID and show modal
    document.getElementById('reassess_assessment_id').value = assessmentId;
    document.getElementById('reassess_reason').value = '';
    const modal = new bootstrap.Modal(document.getElementById('reassessmentModal'));
    modal.show();
}

async function confirmReassessment() {
    const assessmentId = document.getElementById('reassess_assessment_id').value;
    const reason = document.getElementById('reassess_reason').value.trim();
    
    if (!reason) {
        showNotification('Please provide a reason for re-assessment', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/mnc/fitness-assessments/${assessmentId}/invalidate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason: reason })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('reassessmentModal')).hide();
            // Reload assessments
            loadFitnessAssessments();
            showNotification(data.message, 'success');
        } else {
            showNotification(data.error || 'Failed to re-assess', 'error');
        }
    } catch (error) {
        console.error('Error re-assessing:', error);
        showNotification('An error occurred. Please try again.', 'error');
    }
}

// Make functions globally available
window.showCreateAssessmentModal = showCreateAssessmentModal;
window.createAssessment = createAssessment;
window.viewAssessmentDetail = viewAssessmentDetail;
window.invalidateAssessment = invalidateAssessment;
window.confirmReassessment = confirmReassessment;
window.openAssessmentForEmployee = openAssessmentForEmployee;

// ==================== INCIDENTS ====================


