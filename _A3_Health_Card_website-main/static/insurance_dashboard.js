// Insurance Company Dashboard JavaScript

// Global state
let currentPage = 'overview';
let dashboardStats = {};
let selectedClaim = null;
let selectedPreAuth = null;

// Initialize dashboard on load
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    loadDashboardStats();
    setupEventListeners();
});

// Initialize dashboard
function initializeDashboard() {
    // Set active page
    showPage('overview');
    
    // Setup navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            showPage(page);
            
            // Update active state
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Show specific page
function showPage(pageName) {
    currentPage = pageName;
    
    // Hide all pages
    document.querySelectorAll('.content-page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const page = document.getElementById(`${pageName}-page`);
    if (page) {
        page.classList.add('active');
        
        // Load page-specific data
        switch(pageName) {
            case 'overview':
                loadDashboardStats();
                break;
            case 'policyholders':
                loadPolicyholders();
                break;
            case 'claims':
                loadClaims();
                break;
            case 'cashless':
                loadCashlessRequests();
                break;
            case 'fraud':
                loadFraudCases();
                break;
            case 'analytics':
                loadAnalytics();
                break;
            case 'consent':
                loadConsents();
                break;
            case 'audit':
                loadAuditLogs();
                break;
            case 'settlement':
                loadSettlements();
                break;
            case 'medical-review':
                loadMedicalReviews();
                break;
            case 'documents':
                loadDocuments();
                break;
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    // Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', function() {
        this.querySelector('i').classList.add('fa-spin');
        setTimeout(() => {
            loadDashboardStats();
            this.querySelector('i').classList.remove('fa-spin');
        }, 1000);
    });
    
    // Logout confirmation
    document.getElementById('logoutLink')?.addEventListener('click', handleLogout);
    document.getElementById('headerLogoutBtn')?.addEventListener('click', handleLogout);
    
    // Help button
    document.getElementById('helpBtn')?.addEventListener('click', function() {
        showAlert('For support, please contact admin@a3healthcard.com or call 1800-XXX-XXXX', 'info');
    });
    
    // Notification button
    document.getElementById('notificationBtn')?.addEventListener('click', function() {
        showPage('overview');
        document.querySelector('.nav-item[data-page="overview"]')?.classList.add('active');
        // Scroll to alerts section
        document.getElementById('alertsContainer')?.scrollIntoView({ behavior: 'smooth' });
    });
    
    // Filter buttons
    document.getElementById('applyPolicyFilters')?.addEventListener('click', loadPolicyholders);
    document.getElementById('applyClaimFilters')?.addEventListener('click', loadClaims);
    document.getElementById('applyCashlessFilters')?.addEventListener('click', loadCashlessRequests);
    document.getElementById('applyFraudFilters')?.addEventListener('click', loadFraudCases);
    document.getElementById('applyAuditFilters')?.addEventListener('click', loadAuditLogs);
    
    // Policy details
    document.getElementById('loadPolicyDetails')?.addEventListener('click', function() {
        const policyNumber = document.getElementById('policyNumberInput').value;
        if (policyNumber) {
            loadPolicyDetails(policyNumber);
        } else {
            showAlert('Please enter a policy number', 'warning');
        }
    });
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await fetch('/insurance/api/dashboard/stats');
        const data = await response.json();
        
        dashboardStats = data;
        
        // Update stat cards
        document.getElementById('statTotalPolicies').textContent = data.total_policies || 0;
        document.getElementById('statActivePolicyholders').textContent = data.active_policyholders || 0;
        document.getElementById('statClaimsToday').textContent = data.claims_today || 0;
        document.getElementById('statClaimsMonth').textContent = data.claims_month || 0;
        document.getElementById('statClaimsApproved').textContent = data.claims_approved || 0;
        document.getElementById('statClaimsRejected').textContent = data.claims_rejected || 0;
        document.getElementById('statClaimsUnderReview').textContent = data.claims_under_review || 0;
        document.getElementById('statCashlessPending').textContent = data.cashless_pending || 0;
        document.getElementById('statFraudFlags').textContent = data.fraud_flags || 0;
        
        // Update notification badge
        const alertCount = data.alerts?.length || 0;
        document.getElementById('notificationBadge').textContent = alertCount;
        
        // Display alerts
        displayAlerts(data.alerts || []);
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showAlert('Failed to load dashboard statistics', 'danger');
    }
}

// Display alerts
function displayAlerts(alerts) {
    const container = document.getElementById('alertsContainer');
    
    if (alerts.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-3">
                <i class="fas fa-check-circle fa-2x mb-2"></i>
                <p>No urgent alerts at this time</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = alerts.map(alert => `
        <div class="alert alert-${alert.type} d-flex justify-content-between align-items-center">
            <span><i class="fas fa-exclamation-circle me-2"></i>${alert.message}</span>
            <button class="btn btn-sm btn-${alert.type}">${alert.action}</button>
        </div>
    `).join('');
}

// Load policyholders
async function loadPolicyholders() {
    const status = document.getElementById('policyStatusFilter')?.value || 'Active';
    const search = document.getElementById('policySearch')?.value || '';
    
    try {
        const response = await fetch(`/insurance/api/policyholders?status=${status}&search=${search}`);
        const data = await response.json();
        
        const tbody = document.getElementById('policyholdersTable');
        
        if (data.policyholders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center text-muted py-4">
                        No policyholders found
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = data.policyholders.map(p => `
            <tr>
                <td><strong>${p.policy_number}</strong></td>
                <td>${p.client_id}</td>
                <td>${p.client_name}</td>
                <td>${p.policy_type}</td>
                <td><span class="badge status-${p.policy_status.toLowerCase()}">${p.policy_status}</span></td>
                <td>₹${formatNumber(p.coverage_amount)}</td>
                <td>${p.validity_from} to ${p.validity_to}</td>
                <td><span class="badge ${p.consent_status === 'Active' ? 'bg-success' : 'bg-warning'}">${p.consent_status}</span></td>
                <td>${p.last_claim_date || 'N/A'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewPolicyDetails('${p.policy_number}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading policyholders:', error);
        showAlert('Failed to load policyholders', 'danger');
    }
}

// Load policy details
async function loadPolicyDetails(policyNumber) {
    try {
        const response = await fetch(`/insurance/api/policy/${policyNumber}`);
        
        if (!response.ok) {
            throw new Error('Policy not found');
        }
        
        const policy = await response.json();
        
        const container = document.getElementById('policyDetailsContainer');
        container.style.display = 'block';
        
        container.innerHTML = `
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0">Policy Information</h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <strong>Policy Number:</strong> ${policy.policy_number}
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>Policyholder:</strong> ${policy.policyholder_name}
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>Policy Type:</strong> ${policy.policy_type}
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>Coverage Type:</strong> ${policy.coverage_type}
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>Sum Insured:</strong> ₹${formatNumber(policy.sum_insured)}
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>Status:</strong> <span class="badge status-${policy.status.toLowerCase()}">${policy.status}</span>
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>Valid From:</strong> ${policy.start_date}
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>Valid Until:</strong> ${policy.end_date}
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>Room Rent Limit:</strong> ₹${policy.room_rent_limit || 'N/A'}
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>Co-pay:</strong> ${policy.copay_percentage || 0}%
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>Deductible:</strong> ₹${policy.deductible || 0}
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>Consent Status:</strong> <span class="badge ${policy.consent_status === 'Active' ? 'bg-success' : 'bg-warning'}">${policy.consent_status}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            ${policy.nominated_members.length > 0 ? `
            <div class="card border-0 shadow-sm">
                <div class="card-header bg-info text-white">
                    <h5 class="mb-0">Nominated Members</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Relation</th>
                                    <th>Date of Birth</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${policy.nominated_members.map(m => `
                                    <tr>
                                        <td>${m.name}</td>
                                        <td>${m.relation}</td>
                                        <td>${m.dob}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            ` : ''}
        `;
        
    } catch (error) {
        console.error('Error loading policy details:', error);
        showAlert('Failed to load policy details', 'danger');
    }
}

// Load claims
async function loadClaims() {
    const status = document.getElementById('claimStatusFilter')?.value || 'All';
    const dateFrom = document.getElementById('claimDateFrom')?.value || '';
    const dateTo = document.getElementById('claimDateTo')?.value || '';
    
    try {
        const params = new URLSearchParams({
            status,
            date_from: dateFrom,
            date_to: dateTo
        });
        
        const response = await fetch(`/insurance/api/claims?${params}`);
        const data = await response.json();
        
        const tbody = document.getElementById('claimsTable');
        
        if (data.claims.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center text-muted py-4">
                        No claims found
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = data.claims.map(claim => `
            <tr>
                <td><strong>${claim.claim_id}</strong></td>
                <td>${claim.policy_number}</td>
                <td>${claim.client_name}</td>
                <td>${claim.hospital_name}</td>
                <td><span class="badge bg-info">${claim.claim_type}</span></td>
                <td>₹${formatNumber(claim.claimed_amount)}</td>
                <td><span class="badge status-${claim.status.toLowerCase().replace(' ', '-')}">${claim.status}</span></td>
                <td>${claim.submission_date || 'N/A'}</td>
                <td>${getSlaStatus(claim.sla_remaining_hours)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewClaimDetails('${claim.claim_id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading claims:', error);
        showAlert('Failed to load claims', 'danger');
    }
}

// Get SLA status HTML
function getSlaStatus(hours) {
    if (!hours) return '<span class="text-muted">-</span>';
    
    if (hours > 24) {
        return `<span class="sla-good">${hours.toFixed(1)}h remaining</span>`;
    } else if (hours > 0) {
        return `<span class="sla-warning">${hours.toFixed(1)}h remaining</span>`;
    } else {
        return `<span class="sla-critical">BREACHED</span>`;
    }
}

// View claim details
async function viewClaimDetails(claimId) {
    try {
        const response = await fetch(`/insurance/api/claim/${claimId}`);
        
        if (!response.ok) {
            throw new Error('Claim not found or no consent');
        }
        
        const claim = await response.json();
        selectedClaim = claim;
        
        // Populate modal
        const modalContent = document.getElementById('claimDetailContent');
        modalContent.innerHTML = `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h6>Administrative Details</h6>
                    <p><strong>Claim ID:</strong> ${claim.claim_id}</p>
                    <p><strong>Policy Number:</strong> ${claim.policy_number}</p>
                    <p><strong>Client Name:</strong> ${claim.client_name}</p>
                    <p><strong>Status:</strong> <span class="badge status-${claim.status.toLowerCase()}">${claim.status}</span></p>
                </div>
                <div class="col-md-6">
                    <h6>Hospital Details</h6>
                    <p><strong>Hospital:</strong> ${claim.hospital_name}</p>
                    <p><strong>Type:</strong> ${claim.hospital_type}</p>
                    <p><strong>Admission Date:</strong> ${claim.admission_date || 'N/A'}</p>
                    <p><strong>Discharge Date:</strong> ${claim.discharge_date || 'N/A'}</p>
                    <p><strong>Length of Stay:</strong> ${claim.length_of_stay || 'N/A'} days</p>
                </div>
            </div>
            
            <div class="row mb-4">
                <div class="col-md-6">
                    <h6>Medical Summary (Limited)</h6>
                    <p><strong>Diagnosis Category:</strong> ${claim.diagnosis_category || 'Not specified'}</p>
                    <p><strong>Treatment Type:</strong> ${claim.treatment_type || 'Not specified'}</p>
                </div>
                <div class="col-md-6">
                    <h6>Financial Details</h6>
                    <p><strong>Total Bill:</strong> ₹${formatNumber(claim.total_bill_amount)}</p>
                    <p><strong>Claimed:</strong> ₹${formatNumber(claim.claimed_amount)}</p>
                    <p><strong>Approved:</strong> ₹${formatNumber(claim.approved_amount || 0)}</p>
                    ${claim.deduction_amount ? `<p><strong>Deduction:</strong> ₹${formatNumber(claim.deduction_amount)}</p>` : ''}
                    ${claim.deduction_reason ? `<p><strong>Reason:</strong> ${claim.deduction_reason}</p>` : ''}
                </div>
            </div>
            
            ${claim.documents.length > 0 ? `
            <div class="mb-4">
                <h6>Documents</h6>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Name</th>
                                <th>Uploaded</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${claim.documents.map(doc => `
                                <tr>
                                    <td>${doc.type}</td>
                                    <td>${doc.name}</td>
                                    <td>${doc.uploaded_date}</td>
                                    <td><span class="badge bg-${doc.verification_status === 'Verified' ? 'success' : 'warning'}">${doc.verification_status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            ` : ''}
            
            ${claim.fraud_risk_score > 0 ? `
            <div class="alert alert-${claim.fraud_risk_score > 70 ? 'danger' : 'warning'}">
                <strong>Fraud Risk Score:</strong> ${claim.fraud_risk_score}/100
            </div>
            ` : ''}
            
            <div class="mt-4">
                <button class="btn btn-info me-2" onclick="viewClientMedicalBills(${claim.client_id})">
                    <i class="fas fa-receipt me-2"></i>View Medical Bills
                </button>
                <button class="btn btn-success" onclick="showReviewForm('${claim.claim_id}')">
                    <i class="fas fa-check-circle me-2"></i>Review & Decide
                </button>
                <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
        `;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('claimDetailModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error loading claim details:', error);
        showAlert('Failed to load claim details. Check consent status.', 'danger');
    }
}

// Load cashless requests
async function loadCashlessRequests() {
    const status = document.getElementById('cashlessStatusFilter')?.value || 'Pending';
    
    try {
        const response = await fetch(`/insurance/api/cashless-requests?status=${status}`);
        const data = await response.json();
        
        const tbody = document.getElementById('cashlessRequestsTable');
        
        if (data.requests.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center text-muted py-4">
                        No pre-authorization requests found
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = data.requests.map(req => `
            <tr class="${req.sla_breach ? 'table-danger' : ''}">
                <td><strong>${req.pre_auth_id}</strong></td>
                <td>${req.policy_number}</td>
                <td>${req.patient_name}</td>
                <td>${req.hospital_name}</td>
                <td>${req.diagnosis_category}</td>
                <td>₹${formatNumber(req.estimated_cost)}</td>
                <td>₹${formatNumber(req.requested_amount)}</td>
                <td><span class="badge status-${req.approval_status.toLowerCase()}">${req.approval_status}</span></td>
                <td>${req.request_date}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewCashlessDetails('${req.pre_auth_id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading cashless requests:', error);
        showAlert('Failed to load pre-authorization requests', 'danger');
    }
}

// View cashless request details (similar pattern to claims)
async function viewCashlessDetails(preAuthId) {
    // Implementation similar to viewClaimDetails
    console.log('Viewing cashless request:', preAuthId);
}

// Load fraud cases
async function loadFraudCases() {
    const riskLevel = document.getElementById('fraudRiskFilter')?.value || 'High';
    
    try {
        const response = await fetch(`/insurance/api/fraud/monitor?risk_level=${riskLevel}`);
        const data = await response.json();
        
        const tbody = document.getElementById('fraudCasesTable');
        
        if (data.cases.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center text-muted py-4">
                        No fraud cases found for selected criteria
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = data.cases.map(c => `
            <tr>
                <td><strong>${c.claim_id}</strong></td>
                <td><span class="fraud-${c.risk_level.toLowerCase()}">${c.fraud_risk_score}</span></td>
                <td><span class="badge bg-${c.risk_level === 'Critical' ? 'danger' : c.risk_level === 'High' ? 'warning' : 'info'}">${c.risk_level}</span></td>
                <td>${Object.keys(c.indicators).filter(k => c.indicators[k]).length} triggered</td>
                <td>${c.claim_frequency}</td>
                <td>${c.policy_age_days}</td>
                <td>${c.investigation_status}</td>
                <td>${c.flagged_date}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="investigateFraud('${c.claim_id}')">
                        <i class="fas fa-search"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading fraud cases:', error);
        showAlert('Failed to load fraud cases', 'danger');
    }
}

// Load analytics
async function loadAnalytics() {
    try {
        const response = await fetch('/insurance/api/analytics/claims');
        const data = await response.json();
        
        // Update metrics
        document.getElementById('avgSettlementTime').textContent = data.avg_settlement_days.toFixed(1);
        document.getElementById('approvalRate').textContent = data.approval_ratio.toFixed(1) + '%';
        document.getElementById('fraudIncidence').textContent = '0.5%'; // Placeholder
        
        // Create charts
        createDiseaseChart(data.claims_by_category);
        createApprovalChart(data.approval_ratio, data.rejection_ratio);
        
    } catch (error) {
        console.error('Error loading analytics:', error);
        showAlert('Failed to load analytics', 'danger');
    }
}

// Create disease chart
function createDiseaseChart(data) {
    const ctx = document.getElementById('diseaseChart')?.getContext('2d');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.category),
            datasets: [{
                label: 'Number of Claims',
                data: data.map(d => d.count),
                backgroundColor: 'rgba(33, 150, 243, 0.7)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true
        }
    });
}

// Create approval chart
function createApprovalChart(approval, rejection) {
    const ctx = document.getElementById('approvalChart')?.getContext('2d');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Approved', 'Rejected'],
            datasets: [{
                data: [approval, rejection],
                backgroundColor: ['#4CAF50', '#f44336']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true
        }
    });
}

// Load consents
async function loadConsents() {
    try {
        const response = await fetch('/insurance/api/consents');
        const data = await response.json();
        
        const tbody = document.getElementById('consentsTable');
        
        if (data.consents.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center text-muted py-4">
                        No consent records found
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = data.consents.map(c => `
            <tr>
                <td>${c.consent_id}</td>
                <td>${c.patient_name}</td>
                <td>${c.patient_uid}</td>
                <td>${c.purpose}</td>
                <td><span class="badge bg-info">${c.access_level}</span></td>
                <td>${c.consent_start}</td>
                <td>${c.consent_expiry}</td>
                <td><span class="badge status-${c.status.toLowerCase()}">${c.status}</span></td>
                <td>${c.accessed_count}</td>
                <td>${c.last_accessed || 'Never'}</td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading consents:', error);
        showAlert('Failed to load consent records', 'danger');
    }
}

// Load audit logs
async function loadAuditLogs() {
    const dateFrom = document.getElementById('auditDateFrom')?.value || '';
    const dateTo = document.getElementById('auditDateTo')?.value || '';
    const actionType = document.getElementById('auditActionFilter')?.value || '';
    
    try {
        const params = new URLSearchParams({
            date_from: dateFrom,
            date_to: dateTo,
            action_type: actionType
        });
        
        const response = await fetch(`/insurance/api/audit/logs?${params}`);
        const data = await response.json();
        
        const tbody = document.getElementById('auditLogsTable');
        
        if (data.logs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted py-4">
                        No audit logs found for selected criteria
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = data.logs.map(log => `
            <tr>
                <td>${log.timestamp}</td>
                <td>${log.user_name}</td>
                <td>${log.user_role}</td>
                <td>${log.action_type}</td>
                <td><span class="badge bg-secondary">${log.action_category}</span></td>
                <td>${log.target_type || '-'}</td>
                <td><span class="badge ${log.consent_used === 'Yes' ? 'bg-success' : 'bg-warning'}">${log.consent_used}</span></td>
                <td>${log.ip_address}</td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading audit logs:', error);
        showAlert('Failed to load audit logs', 'danger');
    }
}

// Handle Logout with confirmation
function handleLogout(e) {
    e.preventDefault();
    
    if (confirm('Are you sure you want to logout? Any unsaved changes will be lost.')) {
        // Log the logout action before leaving
        fetch('/insurance/api/audit/log-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'Logout', category: 'Session' })
        }).finally(() => {
            window.location.href = '/logout';
        });
    }
}

// Load settlement records
async function loadSettlements() {
    try {
        const response = await fetch('/insurance/api/settlements');
        const data = await response.json();
        
        const tbody = document.getElementById('settlementTable');
        if (!tbody) return;
        
        if (!data.settlements || data.settlements.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center text-muted py-4">
                        No settlement records found
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = data.settlements.map(s => `
            <tr>
                <td>${s.claim_id}</td>
                <td>${s.policy_number}</td>
                <td>₹${formatNumber(s.approved_amount)}</td>
                <td>${s.settlement_date}</td>
                <td>${s.payment_mode}</td>
                <td>${s.beneficiary}</td>
                <td><span class="badge bg-${s.status === 'Completed' ? 'success' : 'warning'}">${s.status}</span></td>
                <td>${s.reference_number || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewSettlementDetails('${s.claim_id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading settlements:', error);
    }
}

// Load medical reviews
async function loadMedicalReviews() {
    try {
        const response = await fetch('/insurance/api/medical-reviews');
        const data = await response.json();
        
        const container = document.getElementById('medicalReviewsContainer');
        if (!container) return;
        
        if (!data.reviews || data.reviews.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-clipboard-check fa-3x mb-3"></i>
                    <p>No pending medical reviews</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = data.reviews.map(r => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <h6>${r.claim_id} - ${r.patient_name}</h6>
                        <span class="badge bg-${r.priority === 'High' ? 'danger' : 'warning'}">${r.priority}</span>
                    </div>
                    <p class="small mb-2"><strong>Diagnosis:</strong> ${r.diagnosis}</p>
                    <p class="small mb-2"><strong>Treatment:</strong> ${r.treatment_type}</p>
                    <p class="small mb-0"><strong>Amount:</strong> ₹${formatNumber(r.claimed_amount)}</p>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading medical reviews:', error);
    }
}

// Load documents
async function loadDocuments() {
    try {
        const response = await fetch('/insurance/api/documents');
        const data = await response.json();
        
        const container = document.getElementById('documentsContainer');
        if (!container) return;
        
        if (!data.documents || data.documents.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-folder-open fa-3x mb-3"></i>
                    <p>No documents found</p>
                </div>
            `;
            return;
        }
        
        // Group documents by type
        const grouped = {};
        data.documents.forEach(doc => {
            if (!grouped[doc.document_type]) {
                grouped[doc.document_type] = [];
            }
            grouped[doc.document_type].push(doc);
        });
        
        container.innerHTML = Object.entries(grouped).map(([type, docs]) => `
            <div class="mb-4">
                <h6 class="border-bottom pb-2">${type}</h6>
                <div class="list-group">
                    ${docs.map(doc => `
                        <div class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <i class="fas fa-file-${getFileIcon(doc.file_type)} me-2"></i>
                                ${doc.file_name}
                                <small class="text-muted ms-2">${doc.upload_date}</small>
                            </div>
                            <button class="btn btn-sm btn-outline-primary" onclick="viewDocument('${doc.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading documents:', error);
    }
}

// Get file icon based on type
function getFileIcon(fileType) {
    const icons = {
        'pdf': 'pdf',
        'image': 'image',
        'jpg': 'image',
        'png': 'image',
        'doc': 'word',
        'docx': 'word',
        'xls': 'excel',
        'xlsx': 'excel'
    };
    return icons[fileType?.toLowerCase()] || 'alt';
}

// View document
function viewDocument(docId) {
    window.open(`/insurance/api/document/${docId}/view`, '_blank');
}

// View settlement details
function viewSettlementDetails(claimId) {
    viewClaimDetails(claimId);
}

// Investigate fraud case
async function investigateFraud(claimId) {
    if (!confirm('Start fraud investigation for this claim?')) return;
    
    try {
        const response = await fetch(`/insurance/api/fraud/investigate/${claimId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Investigation initiated successfully', 'success');
            loadFraudCases();
        } else {
            showAlert(data.error || 'Failed to initiate investigation', 'danger');
        }
    } catch (error) {
        console.error('Error initiating investigation:', error);
        showAlert('Failed to initiate investigation', 'danger');
    }
}

// Show review form for claim decision
function showReviewForm(claimId) {
    const content = document.getElementById('claimDetailContent');
    
    content.innerHTML += `
        <hr>
        <h5>Review Decision</h5>
        <form id="claimReviewForm" onsubmit="submitClaimReview(event, '${claimId}')">
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label class="form-label">Decision <span class="text-danger">*</span></label>
                    <select class="form-select" id="reviewDecision" required onchange="toggleApprovedAmountField()">
                        <option value="">Select Decision</option>
                        <option value="Approved">Approve Claim</option>
                        <option value="Rejected">Reject Claim</option>
                    </select>
                </div>
                <div class="col-md-6 mb-3" id="approvedAmountDiv">
                    <label class="form-label">Approved Amount (₹)</label>
                    <input type="number" class="form-control" id="reviewApprovedAmount" placeholder="Leave empty to approve full amount">
                </div>
            </div>
            <div class="mb-3">
                <label class="form-label">Remarks <span class="text-danger">*</span></label>
                <textarea class="form-control" id="reviewRemarks" rows="3" required placeholder="Enter reason for approval or rejection..."></textarea>
            </div>
            <button type="submit" class="btn btn-success">
                <i class="fas fa-check me-2"></i>Submit Review
            </button>
        </form>
    `;
}

// Toggle approved amount field visibility based on decision
function toggleApprovedAmountField() {
    const decision = document.getElementById('reviewDecision').value;
    const amountDiv = document.getElementById('approvedAmountDiv');
    if (decision === 'Rejected') {
        amountDiv.style.display = 'none';
        document.getElementById('reviewApprovedAmount').value = '';
    } else {
        amountDiv.style.display = 'block';
    }
}

// Submit claim review
async function submitClaimReview(e, claimId) {
    e.preventDefault();
    
    const decision = document.getElementById('reviewDecision').value;
    const approvedAmount = document.getElementById('reviewApprovedAmount')?.value || '';
    const remarks = document.getElementById('reviewRemarks').value;
    
    if (!decision) {
        showAlert('Please select a decision', 'warning');
        return;
    }
    
    if (!remarks) {
        showAlert('Please enter remarks', 'warning');
        return;
    }
    
    try {
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Submitting...';
        }
        
        const response = await fetch(`/insurance/api/claim/${claimId}/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                decision,
                approved_amount: approvedAmount,
                remarks
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Claim review submitted successfully', 'success');
            const modal = document.getElementById('claimDetailModal');
            if (modal) {
                const modalInstance = bootstrap.Modal.getInstance(modal);
                if (modalInstance) modalInstance.hide();
            }
            loadClaims();
        } else {
            showAlert(data.error || data.message || 'Failed to submit review', 'danger');
        }
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check me-2"></i>Submit Review';
        }
    } catch (error) {
        console.error('Error submitting review:', error);
        showAlert('Failed to submit review', 'danger');
    }
}

// ==================== ADD POLICY FOR CLIENT ====================

// Search client by Health Card ID
let searchTimeout = null;
document.getElementById('addPolicyClientId')?.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    const healthCardId = this.value.trim();
    const statusDiv = document.getElementById('clientIdStatus');
    const nameInput = document.getElementById('addPolicyClientName');
    
    if (healthCardId.length < 3) {
        statusDiv.innerHTML = '';
        nameInput.value = '';
        return;
    }
    
    statusDiv.innerHTML = '<span class="text-muted"><i class="fas fa-spinner fa-spin"></i> Searching...</span>';
    
    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`/insurance/api/search-client?health_card_id=${encodeURIComponent(healthCardId)}`);
            const data = await response.json();
            
            if (data.success) {
                statusDiv.innerHTML = '<span class="text-success"><i class="fas fa-check-circle"></i> Client found</span>';
                nameInput.value = data.client.name;
                nameInput.dataset.clientId = data.client.id;
            } else {
                statusDiv.innerHTML = `<span class="text-danger"><i class="fas fa-times-circle"></i> ${data.message}</span>`;
                nameInput.value = '';
                nameInput.dataset.clientId = '';
            }
        } catch (error) {
            statusDiv.innerHTML = '<span class="text-danger"><i class="fas fa-times-circle"></i> Error searching</span>';
            nameInput.value = '';
        }
    }, 500);
});

// Submit add policy form
document.getElementById('submitAddPolicyBtn')?.addEventListener('click', async function() {
    const clientId = document.getElementById('addPolicyClientName')?.dataset?.clientId;
    const policyNumber = document.getElementById('addPolicyNumber').value.trim();
    const sumInsured = document.getElementById('addPolicySumInsured').value;
    const startDate = document.getElementById('addPolicyStartDate').value;
    const endDate = document.getElementById('addPolicyEndDate').value;
    
    // Validation
    if (!clientId) {
        showAlert('Please enter a valid client Health Card ID', 'warning');
        return;
    }
    if (!policyNumber) {
        showAlert('Policy number is required', 'warning');
        return;
    }
    if (!sumInsured) {
        showAlert('Sum insured is required', 'warning');
        return;
    }
    if (!startDate || !endDate) {
        showAlert('Start and end dates are required', 'warning');
        return;
    }
    
    const formData = {
        client_id: parseInt(clientId),
        policy_number: policyNumber,
        policy_name: document.getElementById('addPolicyName').value,
        policy_type: document.getElementById('addPolicyType').value,
        coverage_type: document.getElementById('addPolicyCoverageType').value,
        sum_insured: parseFloat(sumInsured),
        premium_amount: parseFloat(document.getElementById('addPolicyPremium').value) || 0,
        start_date: startDate,
        end_date: endDate
    };
    
    try {
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Adding...';
        
        const response = await fetch('/insurance/api/add-policy-for-client', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(data.message, 'success');
            // Close modal and reset form
            bootstrap.Modal.getInstance(document.getElementById('addPolicyModal')).hide();
            document.getElementById('addPolicyForClientForm').reset();
            document.getElementById('clientIdStatus').innerHTML = '';
            document.getElementById('addPolicyClientName').dataset.clientId = '';
            // Reload policyholders
            loadPolicyholders();
        } else {
            showAlert(data.message || 'Failed to add policy', 'danger');
        }
    } catch (error) {
        console.error('Error adding policy:', error);
        showAlert('Failed to add policy', 'danger');
    } finally {
        this.disabled = false;
        this.innerHTML = '<i class="fas fa-save me-2"></i>Add Policy';
    }
});

// Utility Functions
function formatNumber(num) {
    return new Intl.NumberFormat('en-IN').format(num);
}

function showAlert(message, type = 'info') {
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3" role="alert" style="z-index: 9999; min-width: 300px;">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', alertHtml);
    
    setTimeout(() => {
        document.querySelector('.alert')?.remove();
    }, 5000);
}

// Export for use in onclick handlers
window.viewPolicyDetails = (policyNumber) => {
    document.getElementById('policyNumberInput').value = policyNumber;
    loadPolicyDetails(policyNumber);
    showPage('policy-details');
};

window.viewClaimDetails = viewClaimDetails;
window.viewCashlessDetails = viewCashlessDetails;

// View client's medical bills with consent
async function viewClientMedicalBills(clientId) {
    try {
        const response = await fetch(`/insurance/api/client/${clientId}/medical-bills`);
        const data = await response.json();
        
        if (!data.success) {
            showAlert(data.error || 'Failed to load medical bills', 'danger');
            return;
        }
        
        // Create modal to display bills
        let modalHtml = `
            <div class="modal fade" id="clientBillsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-info text-white">
                            <h5 class="modal-title"><i class="fas fa-receipt me-2"></i>Client Medical Bills</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${data.bills.length === 0 ? 
                                '<p class="text-center text-muted py-4">No medical bills found for this client</p>' :
                                `<div class="table-responsive">
                                    <table class="table table-hover">
                                        <thead class="table-light">
                                            <tr>
                                                <th>Bill #</th>
                                                <th>Date</th>
                                                <th>Facility</th>
                                                <th>Service</th>
                                                <th>Amount</th>
                                                <th>Status</th>
                                                <th>Document</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${data.bills.map(b => `
                                                <tr>
                                                    <td>${b.bill_number}</td>
                                                    <td>${b.bill_date || 'N/A'}</td>
                                                    <td>${b.facility_name}</td>
                                                    <td>${b.service_type || 'N/A'}</td>
                                                    <td>₹${formatNumber(b.net_amount || b.total_amount)}</td>
                                                    <td><span class="badge bg-${b.payment_status === 'Paid' ? 'success' : 'warning'}">${b.payment_status}</span></td>
                                                    <td>${b.document_path ? `<a href="${b.document_path}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="fas fa-eye"></i></a>` : 'N/A'}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>`
                            }
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        document.getElementById('clientBillsModal')?.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = new bootstrap.Modal(document.getElementById('clientBillsModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error loading client bills:', error);
        showAlert('Failed to load medical bills. Check consent status.', 'danger');
    }
}

window.viewClientMedicalBills = viewClientMedicalBills;
