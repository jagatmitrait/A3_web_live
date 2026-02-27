document.addEventListener('DOMContentLoaded', function () {
    // Initialize Dashboard
    initializeDashboard();

    // Navigation Logic
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    const pages = document.querySelectorAll('.content-page');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPageId = item.getAttribute('data-page') + '-page';

            // Update Active State
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            pages.forEach(page => {
                page.classList.remove('active');
                if (page.id === targetPageId) {
                    page.classList.add('active');
                }
            });
        });
    });

    // Date Display
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', dateOptions);

    // Search Logic
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('patientSearchInput');

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => searchPatients(searchInput.value));
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchPatients(searchInput.value);
        });
    }
});

function initializeDashboard() {
    fetchDashboardStats();
    fetchTodayAppointments();

    // Add event listeners for navigation
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = item.getAttribute('data-page');
            navigateTo(pageId);
        });
    });
}

function navigateTo(pageId) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="${pageId}"]`)?.classList.add('active');

    // Update active page content
    document.querySelectorAll('.content-page').forEach(page => page.classList.remove('active'));
    document.getElementById(`${pageId}-page`)?.classList.add('active');

    // Load page-specific data
    if (pageId === 'appointments') {
        fetchAllAppointments();
    }
}

function fetchAllAppointments(filter = 'all') {
    const tableBody = document.getElementById('allAppointmentsTable');
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-5"><div class="spinner-border text-danger" role="status"></div></td></tr>';

    fetch(`/api/doctor/appointments/all?filter=${filter}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderAllAppointments(data.appointments);
            } else {
                tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-danger">Failed to load appointments</td></tr>';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-danger">Error loading appointments</td></tr>';
        });
}

function renderAllAppointments(appointments) {
    const tableBody = document.getElementById('allAppointmentsTable');
    tableBody.innerHTML = '';

    if (appointments.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-muted">No appointments found</td></tr>';
        return;
    }

    appointments.forEach(appt => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="ps-4">
                <div class="fw-bold">${appt.date}</div>
                <div class="small text-muted">${appt.time}</div>
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <img src="https://ui-avatars.com/api/?name=${appt.patient}&background=random" class="rounded-circle me-2" width="32" height="32">
                    <div>
                        <div class="fw-bold">${appt.patient}</div>
                        <div class="small text-muted">UID: ${appt.uid}</div>
                    </div>
                </div>
            </td>
            <td>${appt.type}</td>
            <td><span class="badge bg-${getStatusColor(appt.status)}-subtle text-${getStatusColor(appt.status)}">${appt.status}</span></td>
            <td class="text-end pe-4">
                <button class="btn btn-sm btn-outline-primary" onclick="requestAccess('${appt.uid}')">View</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function getStatusColor(status) {
    switch (status.toLowerCase()) {
        case 'completed': return 'success';
        case 'in progress': return 'danger';
        case 'waiting': return 'warning';
        case 'scheduled': return 'primary';
        case 'cancelled': return 'secondary';
        default: return 'secondary';
    }
}

function filterAppointments(filter) {
    // Update active button state
    document.querySelectorAll('.btn-group .btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    fetchAllAppointments(filter);
}

function fetchDashboardStats() {
    fetch('/api/doctor/dashboard/stats')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateStats(data.stats);
            }
        })
        .catch(error => console.error('Error fetching stats:', error));
}

function updateStats(stats) {
    document.getElementById('todayAppointmentsCount').textContent = stats.todayAppointments;
    document.getElementById('pendingPatientsCount').textContent = stats.pendingPatients;
    document.getElementById('completedCount').textContent = stats.completed;
    document.getElementById('labReportsCount').textContent = stats.labReports;
}

function fetchTodayAppointments() {
    fetch('/api/doctor/appointments/today')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderAppointments(data.appointments);
                // Find next patient (first waiting or in-progress)
                const nextPatient = data.appointments.find(a => a.status === 'Waiting' || a.status === 'In Progress');
                renderNextPatient(nextPatient);
            }
        })
        .catch(error => console.error('Error fetching appointments:', error));
}

function renderAppointments(appointments) {
    const listContainer = document.getElementById('todayAppointmentsList');
    listContainer.innerHTML = '';

    if (appointments.length === 0) {
        listContainer.innerHTML = '<div class="text-center py-4 text-muted">No appointments for today</div>';
        return;
    }

    appointments.forEach(appt => {
        const item = document.createElement('div');
        item.className = 'appointment-list-item';

        let statusBadge = '';
        if (appt.status === 'Completed') statusBadge = '<span class="badge bg-success-subtle text-success">Completed</span>';
        else if (appt.status === 'In Progress') statusBadge = '<span class="badge bg-danger-subtle text-danger">In Progress</span>';
        else if (appt.status === 'Waiting') statusBadge = '<span class="badge bg-warning-subtle text-warning">Waiting</span>';
        else statusBadge = '<span class="badge bg-secondary-subtle text-secondary">Scheduled</span>';

        // Ensure we have UID for actions. If not in API, use a placeholder or handle gracefully.
        // Assuming API returns 'uid' in appointment object. If not, we might need to adjust API.
        const uid = appt.uid || '';

        item.innerHTML = `
            <div class="appt-time">${appt.time}</div>
            <div class="patient-info">
                <div class="patient-name">${appt.patient}</div>
                <div class="appt-type">${appt.type}</div>
            </div>
            <div class="d-flex align-items-center gap-3">
                ${statusBadge}
                <div class="appt-actions">
                    <button class="btn-icon-sm btn-view" title="View Patient" onclick="requestAccess('${uid}')"><i class="fas fa-eye"></i></button>

                </div>
            </div>
        `;
        listContainer.appendChild(item);
    });
}

function renderNextPatient(patient) {
    const container = document.getElementById('nextPatientCard');
    if (!patient) {
        container.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="fas fa-coffee fa-2x mb-2"></i>
                <p>No patients in waiting queue</p>
            </div>
        `;
        return;
    }

    const uid = patient.uid || '';

    container.innerHTML = `
        <div class="d-flex align-items-center mb-3">
            <img src="https://ui-avatars.com/api/?name=${patient.patient}&background=random" class="rounded-circle me-3" width="50" height="50">
            <div>
                <h5 class="mb-0">${patient.patient}</h5>
                <small class="text-muted">${patient.type}</small>
            </div>
        </div>
        <div class="d-flex justify-content-between mb-3">
            <div class="text-center">
                <small class="text-muted d-block">Time</small>
                <strong>${patient.time}</strong>
            </div>
            <div class="text-center">
                <small class="text-muted d-block">Status</small>
                <span class="badge ${patient.status === 'In Progress' ? 'bg-danger' : 'bg-warning'}">${patient.status}</span>
            </div>
        </div>
        <div class="d-grid">
            <button class="btn btn-danger" onclick="startConsultation('${uid}', '${patient.patient}', '', '')">
                <i class="fas fa-stethoscope me-2"></i> ${patient.status === 'In Progress' ? 'Resume Consultation' : 'Start Consultation'}
            </button>
        </div>
    `;
}

function showCreateAppointmentModal() {
    const modal = new bootstrap.Modal(document.getElementById('createAppointmentModal'));
    modal.show();
}

function showUploadReportModal() {
    const modal = new bootstrap.Modal(document.getElementById('uploadReportModal'));
    modal.show();
}

// Handle Forms
document.addEventListener('DOMContentLoaded', function () {
    const createAppointmentForm = document.getElementById('createAppointmentForm');
    if (createAppointmentForm) {
        createAppointmentForm.addEventListener('submit', function (e) {
            e.preventDefault();
            // Placeholder logic - in real app, send to API
            alert('Appointment booked successfully! (Simulation)');
            bootstrap.Modal.getInstance(document.getElementById('createAppointmentModal')).hide();
            createAppointmentForm.reset();
        });
    }

    const uploadReportForm = document.getElementById('uploadReportForm');
    if (uploadReportForm) {
        uploadReportForm.addEventListener('submit', function (e) {
            e.preventDefault();
            // Placeholder logic
            alert('Report uploaded successfully! (Simulation)');
            bootstrap.Modal.getInstance(document.getElementById('uploadReportModal')).hide();
            uploadReportForm.reset();
        });
    }
});

function searchPatients(query, tableId = 'patientResultsTable') {
    const tbody = document.getElementById(tableId);
    if (!tbody) return; // Safety check

    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5"><div class="spinner-border text-danger" role="status"></div></td></tr>';

    fetch(`/api/doctor/patients/search?query=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderPatientResults(data.patients, tableId);
            } else {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-danger">Error fetching results</td></tr>';
            }
        })
        .catch(error => {
            console.error('Error searching patients:', error);
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-danger">Error searching patients</td></tr>';
        });
}

function renderPatientResults(patients, tableId = 'patientResultsTable') {
    const tbody = document.getElementById(tableId);
    if (!tbody) return;

    tbody.innerHTML = '';

    if (patients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-muted">No patients found</td></tr>';
        return;
    }

    patients.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-4">
                <div class="d-flex align-items-center">
                    <img src="${p.image}" class="rounded-circle me-3" width="40" height="40">
                    <div>
                        <div class="fw-bold">${p.full_name}</div>
                        <div class="small text-muted">${p.email}</div>
                    </div>
                </div>
            </td>
            <td><span class="badge bg-light text-dark border">${p.uid}</span></td>
            <td>${p.phone}</td>
            <td><span class="badge bg-success-subtle text-success">Active</span></td>
            <td class="text-end pe-4">
                <button class="btn btn-sm btn-outline-danger" onclick="requestAccess('${p.uid}')">
                    <i class="fas fa-eye me-1"></i> View
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}



// --- Consultation Logic ---

function startConsultation(uid, name, age, bloodGroup) {
    // Close modal if open
    const modalEl = document.getElementById('patientSummaryModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    // Switch to consultation tab
    document.querySelector('.nav-item[data-page="consultations"]').click();

    // Show workspace, hide start screen
    document.getElementById('consultationWorkspace').classList.remove('d-none');
    document.getElementById('consultationStartScreen').classList.add('d-none');

    // Populate Patient Header
    document.getElementById('activePatientName').textContent = name;
    document.getElementById('activePatientUID').textContent = uid;
    document.getElementById('activePatientAge').textContent = age || '--';
    document.getElementById('activePatientGender').textContent = bloodGroup || '--'; // Using blood group slot for now or generic
    document.getElementById('activePatientImg').src = `https://ui-avatars.com/api/?name=${name}&background=random`;

    // Reset Forms
    document.getElementById('soapSubjective').value = '';
    document.getElementById('soapObjective').value = '';
    document.getElementById('soapAssessment').value = '';
    document.getElementById('soapPlan').value = '';
    document.getElementById('prescriptionList').innerHTML = '';
    document.getElementById('labList').innerHTML = '';

    // Add initial rows
    addPrescriptionRow();
    addLabRow();
}

function cancelConsultation() {
    if (confirm('Are you sure you want to cancel? All unsaved data will be lost.')) {
        document.getElementById('consultationWorkspace').classList.add('d-none');
        document.getElementById('consultationStartScreen').classList.remove('d-none');
    }
}

function viewPatient(uid) {
    if (!uid) return;

    // Fetch patient details
    fetch(`/api/doctor/patient/${uid}/summary`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const modal = new bootstrap.Modal(document.getElementById('patientSummaryModal'));
                modal.show();
                renderPatientSummary(data.summary);
            } else {
                alert('Patient not found');
            }
        })
        .catch(err => console.error(err));
}

function addPrescriptionRow() {
    const container = document.getElementById('prescriptionList');
    const id = Date.now();
    const div = document.createElement('div');
    div.className = 'prescription-row mb-3 border-bottom pb-3';
    div.innerHTML = `
        <div class="d-flex gap-2 mb-2">
            <input type="text" class="form-control form-control-sm" placeholder="Medication Name" name="med_name_${id}">
            <button class="btn btn-sm btn-outline-danger" onclick="this.closest('.prescription-row').remove()"><i class="fas fa-trash"></i></button>
        </div>
        <div class="row g-2">
            <div class="col-4">
                <input type="text" class="form-control form-control-sm" placeholder="Dose (e.g. 500mg)" name="med_dose_${id}">
            </div>
            <div class="col-4">
                <input type="text" class="form-control form-control-sm" placeholder="Freq (e.g. 1-0-1)" name="med_freq_${id}">
            </div>
            <div class="col-4">
                <input type="text" class="form-control form-control-sm" placeholder="Duration (e.g. 5 days)" name="med_dur_${id}">
            </div>
            <div class="col-12">
                <input type="text" class="form-control form-control-sm" placeholder="Instructions (e.g. After food)" name="med_instr_${id}">
            </div>
        </div>
    `;
    container.appendChild(div);
}

function addLabRow() {
    const container = document.getElementById('labList');
    const id = Date.now();
    const div = document.createElement('div');
    div.className = 'lab-row mb-2 d-flex gap-2';
    div.innerHTML = `
        <input type="text" class="form-control form-control-sm" placeholder="Test Name (e.g. CBC)" name="lab_name_${id}">
        <select class="form-select form-select-sm" style="width: 100px;" name="lab_urgency_${id}">
            <option value="Routine">Routine</option>
            <option value="Urgent">Urgent</option>
        </select>
        <button class="btn btn-sm btn-outline-danger" onclick="this.closest('.lab-row').remove()"><i class="fas fa-trash"></i></button>
    `;
    container.appendChild(div);
}

function saveConsultation() {
    const uid = document.getElementById('activePatientUID').textContent;
    if (!uid || uid === '--') return;

    const data = {
        patient_uid: uid,
        subjective: document.getElementById('soapSubjective').value,
        objective: document.getElementById('soapObjective').value,
        assessment: document.getElementById('soapAssessment').value,
        plan: document.getElementById('soapPlan').value,
        prescriptions: [],
        lab_orders: []
    };

    // Collect Prescriptions
    document.querySelectorAll('.prescription-row').forEach(row => {
        const name = row.querySelector('input[name^="med_name"]').value;
        if (name) {
            data.prescriptions.push({
                name: name,
                dosage: row.querySelector('input[name^="med_dose"]').value,
                frequency: row.querySelector('input[name^="med_freq"]').value,
                duration: row.querySelector('input[name^="med_dur"]').value,
                instructions: row.querySelector('input[name^="med_instr"]').value
            });
        }
    });

    // Collect Lab Orders
    document.querySelectorAll('.lab-row').forEach(row => {
        const name = row.querySelector('input[name^="lab_name"]').value;
        if (name) {
            data.lab_orders.push({
                test_name: name,
                urgency: row.querySelector('select[name^="lab_urgency"]').value
            });
        }
    });

    // Send to Backend
    fetch('/api/doctor/consultation/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                alert('Consultation saved successfully!');
                document.getElementById('consultationWorkspace').classList.add('d-none');
                document.getElementById('consultationStartScreen').classList.remove('d-none');
            } else {
                alert('Error saving consultation: ' + result.message);
            }
        })
        .catch(error => console.error('Error:', error));
}

function renderPatientSummary(summary) {
    // Personal Info
    document.getElementById('modalPatientName').textContent = summary.personal_info.name;
    document.getElementById('modalPatientUID').textContent = summary.personal_info.uid;
    document.getElementById('modalPatientAge').textContent = summary.personal_info.age || '--';
    document.getElementById('modalPatientBlood').textContent = summary.personal_info.blood_group || '--';
    document.getElementById('modalPatientEmail').textContent = summary.personal_info.email;
    document.getElementById('modalPatientPhone').textContent = summary.personal_info.phone;
    document.getElementById('modalPatientImg').src = `https://ui-avatars.com/api/?name=${summary.personal_info.name}&background=random`;

    // Store UID for Full Access
    const fullAccessBtn = document.getElementById('modalFullAccessBtn');
    if (fullAccessBtn) {
        fullAccessBtn.onclick = () => {
            bootstrap.Modal.getInstance(document.getElementById('patientSummaryModal')).hide();
            requestAccess(summary.personal_info.uid);
        };
    }

    // Helper to render list or empty message
    const renderList = (elementId, items, renderer) => {
        const el = document.getElementById(elementId);
        if (!items || items.length === 0) {
            el.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No records found</td></tr>';
            if (elementId === 'allergiesList') {
                el.innerHTML = '<div class="col-12 text-center text-muted">No allergies recorded</div>';
            }
            return;
        }
        el.innerHTML = items.map(renderer).join('');
    };

    // Allergies
    renderList('allergiesList', summary.allergies, a => `
        <div class="col-md-6">
            <div class="p-2 border rounded bg-light">
                <div class="d-flex justify-content-between">
                    <strong class="text-danger">${a.allergen}</strong>
                    <span class="badge bg-${a.severity === 'High' ? 'danger' : 'warning'}">${a.severity}</span>
                </div>
                <div class="small text-muted">${a.reaction}</div>
            </div>
        </div>
    `);

    // Surgeries
    renderList('surgeriesList', summary.surgeries, s => `
        <tr>
            <td>${s.procedure}</td>
            <td>${s.date}</td>
            <td>${s.hospital}</td>
        </tr>
    `);

    // Implants
    renderList('implantsList', summary.implants, i => `
        <tr>
            <td>${i.type}</td>
            <td>${i.model}</td>
            <td>${i.site}</td>
            <td>${i.date}</td>
        </tr>
    `);

    // Vaccinations
    renderList('vaccinationsList', summary.vaccinations, v => `
        <tr>
            <td>${v.vaccine}</td>
            <td>${v.date}</td>
        </tr>
    `);

    // Family History
    renderList('familyList', summary.family_history, f => `
        <tr>
            <td>${f.condition}</td>
            <td>${f.relation}</td>
        </tr>
    `);

    // Consultations
    renderList('consultationsList', summary.consultations, c => `
        <tr>
            <td>${c.date}</td>
            <td>${c.doctor}</td>
            <td>${c.assessment}</td>
        </tr>
    `);

    // Start Consultation Button in Modal
    const newBtn = document.getElementById('modalStartConsultationBtn');
    // Remove old listeners to prevent duplicates (cloning is a simple way)
    const clone = newBtn.cloneNode(true);
    newBtn.parentNode.replaceChild(clone, newBtn);

    clone.addEventListener('click', () => {
        startConsultation(
            summary.personal_info.uid,
            summary.personal_info.name,
            summary.personal_info.age,
            summary.personal_info.blood_group
        );
    });
}


// --- OTP Access Logic ---

let currentOtpUid = null;
let otpTimerInterval = null;

function requestAccess(uid) {
    if (!uid) return;
    currentOtpUid = uid;

    // Reset Modal State
    document.getElementById('otpPatientUid').textContent = uid;
    document.getElementById('otpStep1').classList.remove('d-none');
    document.getElementById('otpStep2').classList.add('d-none');
    document.getElementById('otpInput').value = '';

    const modal = new bootstrap.Modal(document.getElementById('otpRequestModal'));
    modal.show();
}

function sendOtp() {
    if (!currentOtpUid) return;

    const btn = document.querySelector('#otpStep1 button');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';

    fetch('/api/doctor/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_uid: currentOtpUid })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                document.getElementById('otpStep1').classList.add('d-none');
                document.getElementById('otpStep2').classList.remove('d-none');
                startOtpTimer();
                // Focus input
                setTimeout(() => document.getElementById('otpInput').focus(), 500);
            } else {
                alert('Error sending OTP: ' + data.message);
            }
        })
        .catch(err => {
            console.error(err);
            alert('Failed to send OTP');
        })
        .finally(() => {
            btn.disabled = false;
            btn.innerHTML = originalText;
        });
}

function verifyOtp() {
    const otp = document.getElementById('otpInput').value;
    if (!otp || otp.length !== 6) {
        alert('Please enter a valid 6-digit OTP');
        return;
    }

    const btn = document.querySelector('#otpStep2 .btn-success');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Verifying...';

    fetch('/api/doctor/verify-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_uid: currentOtpUid, otp: otp })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // Redirect to Doctor View
                window.location.href = data.redirect_url;
            } else {
                alert('Invalid OTP: ' + data.message);
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        })
        .catch(err => {
            console.error(err);
            alert('Verification failed');
            btn.disabled = false;
            btn.innerHTML = originalText;
        });
}

function startOtpTimer() {
    let timeLeft = 30;
    const timerEl = document.getElementById('otpTimer');

    if (otpTimerInterval) clearInterval(otpTimerInterval);

    otpTimerInterval = setInterval(() => {
        timeLeft--;
        timerEl.textContent = `00:${timeLeft.toString().padStart(2, '0')}`;

        if (timeLeft <= 0) {
            clearInterval(otpTimerInterval);
            // Enable resend? For now just stop.
        }
    }, 1000);
}


// =============================================================================
// PATIENT RECORDS PAGE FUNCTIONALITY
// =============================================================================

let recordsSelectedPatient = null;

// Initialize patient records search
document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('recordsPatientSearch');
    if (searchInput) {
        searchInput.addEventListener('input', drSearchPatients);
    }
});

function drSearchPatients() {
    const query = document.getElementById('recordsPatientSearch').value;
    const results = document.getElementById('recordsPatientResults');

    if (query.length < 2) {
        results.innerHTML = '';
        results.style.display = 'none';
        return;
    }

    results.innerHTML = '<div class="search-item text-muted">Searching...</div>';
    results.style.display = 'block';

    fetch(`/api/doctor/patients/search?query=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(data => {
            if (data.success && data.patients && data.patients.length > 0) {
                results.innerHTML = data.patients.map(p =>
                    `<div class="search-item" onclick='drSelectPatient(${JSON.stringify(p)})'>
                        <strong>${p.full_name}</strong> 
                        <span class="text-muted">| ${p.uid || 'No UID'}</span>
                    </div>`
                ).join('');
            } else {
                results.innerHTML = '<div class="search-item text-muted">No patients found</div>';
            }
        })
        .catch(() => {
            results.innerHTML = '<div class="search-item text-danger">Search error</div>';
        });
}

function drSelectPatient(patient) {
    recordsSelectedPatient = patient;
    document.getElementById('recordsPatientSearch').value = '';
    document.getElementById('recordsPatientResults').innerHTML = '';
    document.getElementById('recordsPatientResults').style.display = 'none';
    document.getElementById('recordsSelectedPatient').style.display = 'block';
    document.getElementById('recordsPatientName').textContent = patient.full_name;
    document.getElementById('recordsPatientUID').textContent = patient.uid || 'No UID';
    document.getElementById('recordsPatientAge').textContent = (patient.age || '?') + 'y';
    document.getElementById('recordsPatientBlood').textContent = patient.blood_group || 'Blood: ?';

    // Load patient records
    drLoadMedicalRecords();
}

function clearRecordsPatient() {
    recordsSelectedPatient = null;
    document.getElementById('recordsSelectedPatient').style.display = 'none';
    document.getElementById('drMedicalHistoryList').innerHTML = `
        <div class="text-center py-5 text-muted">
            <i class="fas fa-search fa-2x mb-3 opacity-25"></i>
            <p>Select a patient to view medical history</p>
        </div>`;
    document.getElementById('drLifestyleContent').innerHTML = `
        <div class="text-center py-5 text-muted">
            <i class="fas fa-search fa-2x mb-3 opacity-25"></i>
            <p>Select a patient to view lifestyle assessment</p>
        </div>`;
}

function drLoadMedicalRecords() {
    if (!recordsSelectedPatient) return;

    fetch(`/api/patient/${recordsSelectedPatient.uid}/medical-records`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                drRenderMedicalHistory(data.medical_history || []);
                drRenderLifestyle(data.lifestyle);

                // Update counts
                document.getElementById('drMedicalCount').textContent = (data.medical_history || []).length;
                document.getElementById('drAllergyCount').textContent = data.allergies_count || 0;
                document.getElementById('drSurgeryCount').textContent = data.surgeries_count || 0;
                document.getElementById('drVaccinationCount').textContent = data.vaccinations_count || 0;
                document.getElementById('drImplantCount').textContent = data.implants_count || 0;
                document.getElementById('drFamilyHistoryCount').textContent = data.family_history_count || 0;
            }
        })
        .catch(err => console.error('Error loading records:', err));
}

function drRenderMedicalHistory(records) {
    const container = document.getElementById('drMedicalHistoryList');

    if (records.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="fas fa-clipboard-list fa-2x mb-3 opacity-25"></i>
                <p>No medical history records found</p>
            </div>`;
        return;
    }

    container.innerHTML = records.map(r => `
        <div class="border rounded p-3 mb-3 ${r.is_active ? '' : 'bg-light'}">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <strong>${r.condition_name}</strong>
                    <span class="badge bg-secondary ms-2">${drFormatRecordType(r.record_type)}</span>
                    ${r.severity ? `<span class="badge bg-${drGetSeverityColor(r.severity)} ms-1">${r.severity}</span>` : ''}
                </div>
                <div>
                    <span class="badge bg-${r.is_active ? 'warning' : 'success'}">${r.is_active ? 'Active' : 'Resolved'}</span>
                    <button class="btn btn-sm btn-outline-danger ms-2" onclick="drDeleteMedicalHistory(${r.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            ${r.diagnosis_date ? `<small class="text-muted">Diagnosed: ${r.diagnosis_date}</small>` : ''}
            ${r.treatment ? `<p class="mb-0 mt-2 small">${r.treatment}</p>` : ''}
        </div>
    `).join('');
}

function drFormatRecordType(type) {
    const types = {
        'chronic': 'Chronic',
        'past_illness': 'Past Illness',
        'hospitalization': 'Hospitalization',
        'ncd': 'NCD',
        'communicable': 'Communicable',
        'genetic': 'Genetic',
        'mental_health': 'Mental Health'
    };
    return types[type] || type;
}

function drGetSeverityColor(severity) {
    const colors = { 'mild': 'info', 'moderate': 'warning', 'severe': 'danger', 'critical': 'dark' };
    return colors[severity] || 'secondary';
}

function drRenderLifestyle(data) {
    const container = document.getElementById('drLifestyleContent');

    if (!data) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="fas fa-clipboard-list fa-2x mb-3 opacity-25"></i>
                <p>No lifestyle assessment recorded</p>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div class="row">
            <div class="col-md-4 mb-3">
                <div class="border rounded p-3">
                    <h6 class="text-muted"><i class="fas fa-smoking me-1"></i> Substance Use</h6>
                    <p class="mb-1"><strong>Tobacco:</strong> ${data.tobacco_use || 'N/A'}</p>
                    <p class="mb-1"><strong>Alcohol:</strong> ${data.alcohol_use || 'N/A'}</p>
                    <p class="mb-0"><strong>Substance Abuse:</strong> ${data.substance_abuse ? 'Yes' : 'No'}</p>
                </div>
            </div>
            <div class="col-md-4 mb-3">
                <div class="border rounded p-3">
                    <h6 class="text-muted"><i class="fas fa-running me-1"></i> Physical Activity</h6>
                    <p class="mb-1"><strong>Level:</strong> ${data.physical_activity_level || 'N/A'}</p>
                    <p class="mb-0"><strong>Exercise:</strong> ${data.exercise_frequency || 'N/A'}</p>
                </div>
            </div>
            <div class="col-md-4 mb-3">
                <div class="border rounded p-3">
                    <h6 class="text-muted"><i class="fas fa-weight me-1"></i> Body Metrics</h6>
                    <p class="mb-1"><strong>BMI:</strong> ${data.bmi || 'N/A'} (${data.bmi_category || '-'})</p>
                    <p class="mb-0"><strong>Weight:</strong> ${data.current_weight || 'N/A'} kg</p>
                </div>
            </div>
            <div class="col-md-4 mb-3">
                <div class="border rounded p-3">
                    <h6 class="text-muted"><i class="fas fa-utensils me-1"></i> Diet</h6>
                    <p class="mb-1"><strong>Type:</strong> ${data.diet_type || 'N/A'}</p>
                    <p class="mb-0"><strong>Quality:</strong> ${data.diet_quality || 'N/A'}</p>
                </div>
            </div>
            <div class="col-md-4 mb-3">
                <div class="border rounded p-3">
                    <h6 class="text-muted"><i class="fas fa-bed me-1"></i> Sleep & Stress</h6>
                    <p class="mb-1"><strong>Sleep:</strong> ${data.sleep_hours_avg || 'N/A'} hrs (${data.sleep_quality || '-'})</p>
                    <p class="mb-0"><strong>Stress:</strong> ${data.stress_level || 'N/A'}</p>
                </div>
            </div>
            <div class="col-md-4 mb-3">
                <div class="border rounded p-3">
                    <h6 class="text-muted"><i class="fas fa-briefcase me-1"></i> Occupation</h6>
                    <p class="mb-1"><strong>Job:</strong> ${data.occupation || 'N/A'}</p>
                    <p class="mb-0"><strong>Night Shift:</strong> ${data.night_shift_work ? 'Yes' : 'No'}</p>
                </div>
            </div>
        </div>
    `;
}

function showDrAddMedicalHistoryModal() {
    if (!recordsSelectedPatient) {
        alert('Please select a patient first');
        return;
    }
    document.getElementById('drAddMedicalHistoryForm').reset();
    new bootstrap.Modal(document.getElementById('drAddMedicalHistoryModal')).show();
}

function drSaveMedicalHistory() {
    if (!recordsSelectedPatient) return;

    const data = {
        record_type: document.getElementById('drMhRecordType').value,
        condition_name: document.getElementById('drMhConditionName').value,
        diagnosis_date: document.getElementById('drMhDiagnosisDate').value || null,
        severity: document.getElementById('drMhSeverity').value || null,
        is_active: document.getElementById('drMhIsActive').value === 'true',
        treatment: document.getElementById('drMhTreatment').value || null,
        notes: document.getElementById('drMhNotes').value || null
    };

    if (!data.record_type || !data.condition_name) {
        alert('Please fill in required fields');
        return;
    }

    fetch(`/api/patient/${recordsSelectedPatient.uid}/medical-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
        .then(r => r.json())
        .then(result => {
            if (result.success) {
                bootstrap.Modal.getInstance(document.getElementById('drAddMedicalHistoryModal')).hide();
                drLoadMedicalRecords();
                alert('Medical history record added successfully!');
            } else {
                alert('Error: ' + (result.error || 'Unknown error'));
            }
        });
}

function drDeleteMedicalHistory(id) {
    if (!confirm('Are you sure you want to delete this record?')) return;

    fetch(`/api/patient/${recordsSelectedPatient.uid}/medical-history/${id}`, {
        method: 'DELETE'
    })
        .then(r => r.json())
        .then(result => {
            if (result.success) {
                drLoadMedicalRecords();
            } else {
                alert('Error: ' + (result.error || 'Unknown error'));
            }
        });
}

// Add CSS for search results dropdown
(function () {
    const style = document.createElement('style');
    style.textContent = `
        .search-results-dropdown {
            position: absolute;
            z-index: 1000;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            max-height: 200px;
            overflow-y: auto;
            display: none;
            width: calc(50% - 30px);
        }
        .search-results-dropdown .search-item {
            padding: 10px 15px;
            cursor: pointer;
            border-bottom: 1px solid #f0f0f0;
        }
        .search-results-dropdown .search-item:hover {
            background: #f8f9fa;
        }
    `;
    document.head.appendChild(style);
})();


// =============================================================================
// PHASE 4: VITALS FUNCTIONALITY
// =============================================================================

function showDrAddVitalsModal() {
    if (!recordsSelectedPatient) {
        alert('Please select a patient first');
        return;
    }
    // Reset form
    document.getElementById('drAddVitalsForm').reset();
    const modal = new bootstrap.Modal(document.getElementById('drAddVitalsModal'));
    modal.show();
}

function drSaveVitals() {
    if (!recordsSelectedPatient) return;

    const data = {
        systolic_bp: document.getElementById('drVitalSystolic').value || null,
        diastolic_bp: document.getElementById('drVitalDiastolic').value || null,
        heart_rate: document.getElementById('drVitalHeartRate').value || null,
        respiratory_rate: document.getElementById('drVitalRespRate').value || null,
        spo2: document.getElementById('drVitalSpO2').value || null,
        temperature: document.getElementById('drVitalTemp').value || null,
        pain_score: document.getElementById('drVitalPain').value || null,
        blood_sugar: document.getElementById('drVitalBG').value || null,
        weight: document.getElementById('drVitalWeight').value || null,
        height: document.getElementById('drVitalHeight').value || null,
        visit_type: document.getElementById('drVitalVisitType').value,
        notes: document.getElementById('drVitalNotes').value || null
    };

    fetch(`/api/patient/${recordsSelectedPatient.uid}/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
        .then(r => r.json())
        .then(result => {
            if (result.success) {
                bootstrap.Modal.getInstance(document.getElementById('drAddVitalsModal')).hide();
                alert('Vitals recorded successfully!');
                drLoadVitals();
            } else {
                alert('Error: ' + (result.error || 'Unknown error'));
            }
        })
        .catch(err => {
            console.error(err);
            alert('Error saving vitals');
        });
}

function drLoadVitals() {
    if (!recordsSelectedPatient) return;

    const container = document.getElementById('drVitalsList');
    container.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-danger"></div></div>';

    fetch(`/api/patient/${recordsSelectedPatient.uid}/vitals`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                drRenderVitals(data.vitals);
            } else {
                container.innerHTML = '<div class="text-center text-danger py-3">Error loading vitals</div>';
            }
        })
        .catch(() => {
            container.innerHTML = '<div class="text-center text-danger py-3">Error loading vitals</div>';
        });
}

function drRenderVitals(vitals) {
    const container = document.getElementById('drVitalsList');

    if (!vitals || vitals.length === 0) {
        container.innerHTML = '<div class="text-center py-5 text-muted"><i class="fas fa-heartbeat fa-2x mb-3 opacity-25"></i><p>No vitals recorded yet</p></div>';
        return;
    }

    container.innerHTML = '<div class="table-responsive"><table class="table table-hover"><thead><tr>' +
        '<th>Date</th><th>BP</th><th>HR</th><th>RR</th><th>SpO2</th><th>Temp</th><th>Pain</th><th>Weight/BMI</th><th>By</th></tr></thead><tbody>' +
        vitals.map(v => `<tr>
            <td>${v.recorded_at ? new Date(v.recorded_at).toLocaleDateString() : '-'}</td>
            <td>${v.systolic_bp && v.diastolic_bp ? v.systolic_bp + '/' + v.diastolic_bp : '-'}</td>
            <td>${v.heart_rate || '-'}</td>
            <td>${v.respiratory_rate || '-'}</td>
            <td>${v.spo2 ? v.spo2 + '%' : '-'}</td>
            <td>${v.temperature ? v.temperature + '°F' : '-'}</td>
            <td>${v.pain_score !== null ? v.pain_score + '/10' : '-'}</td>
            <td>${v.weight ? v.weight + 'kg' : '-'}${v.bmi ? ' (BMI: ' + v.bmi + ')' : ''}</td>
            <td>${v.doctor || v.health_worker || '-'}</td>
        </tr>`).join('') + '</tbody></table></div>';
}


// =============================================================================
// PHASE 4: INVESTIGATIONS FUNCTIONALITY
// =============================================================================

function showDrOrderInvestigationModal() {
    if (!recordsSelectedPatient) {
        alert('Please select a patient first');
        return;
    }
    // Reset form
    document.getElementById('drOrderInvestigationForm').reset();
    document.getElementById('drInvCategory').innerHTML = '<option value="">Select type first...</option>';
    const modal = new bootstrap.Modal(document.getElementById('drOrderInvestigationModal'));
    modal.show();
}

function updateInvCategories() {
    const type = document.getElementById('drInvType').value;
    const catSelect = document.getElementById('drInvCategory');

    const categories = {
        lab: ['Blood Test', 'Urine Test', 'Stool Test', 'CSF', 'Other'],
        imaging: ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'ECG', 'Echo', 'Other'],
        pathology: ['Biopsy', 'Cytology', 'Histopathology', 'Other'],
        microbiology: ['Blood Culture', 'Urine Culture', 'Sputum Culture', 'Wound Swab', 'Sensitivity', 'Other']
    };

    catSelect.innerHTML = '<option value="">Select...</option>';
    if (categories[type]) {
        categories[type].forEach(cat => {
            catSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
    }
}

function drOrderInvestigation() {
    if (!recordsSelectedPatient) return;

    const type = document.getElementById('drInvType').value;
    const name = document.getElementById('drInvName').value;

    if (!type || !name) {
        alert('Please fill required fields');
        return;
    }

    const data = {
        investigation_type: type,
        category: document.getElementById('drInvCategory').value || null,
        test_name: name,
        urgency: document.getElementById('drInvUrgency').value,
        clinical_indication: document.getElementById('drInvIndication').value || null,
        notes: document.getElementById('drInvNotes').value || null
    };

    fetch(`/api/patient/${recordsSelectedPatient.uid}/investigations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
        .then(r => r.json())
        .then(result => {
            if (result.success) {
                bootstrap.Modal.getInstance(document.getElementById('drOrderInvestigationModal')).hide();
                alert('Investigation ordered successfully!');
                drLoadInvestigations();
            } else {
                alert('Error: ' + (result.error || 'Unknown error'));
            }
        })
        .catch(err => {
            console.error(err);
            alert('Error ordering investigation');
        });
}

function drLoadInvestigations() {
    if (!recordsSelectedPatient) return;

    const container = document.getElementById('drInvestigationsList');
    container.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-info"></div></div>';

    fetch(`/api/patient/${recordsSelectedPatient.uid}/investigations`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                drRenderInvestigations(data.investigations);
            } else {
                container.innerHTML = '<div class="text-center text-danger py-3">Error loading investigations</div>';
            }
        })
        .catch(() => {
            container.innerHTML = '<div class="text-center text-danger py-3">Error loading investigations</div>';
        });
}

function drRenderInvestigations(investigations) {
    const container = document.getElementById('drInvestigationsList');

    if (!investigations || investigations.length === 0) {
        container.innerHTML = '<div class="text-center py-5 text-muted"><i class="fas fa-flask fa-2x mb-3 opacity-25"></i><p>No investigations ordered yet</p></div>';
        return;
    }

    container.innerHTML = '<div class="table-responsive"><table class="table table-hover"><thead><tr>' +
        '<th>Date</th><th>Type</th><th>Test Name</th><th>Status</th><th>Result</th><th>Ordered By</th></tr></thead><tbody>' +
        investigations.map(inv => {
            const statusBadge = {
                'Ordered': 'warning',
                'Completed': 'success',
                'Processing': 'info',
                'Cancelled': 'secondary'
            }[inv.status] || 'secondary';

            return `<tr>
                <td>${inv.ordered_at ? new Date(inv.ordered_at).toLocaleDateString() : '-'}</td>
                <td><span class="badge bg-primary-subtle text-primary">${inv.investigation_type}</span></td>
                <td><strong>${inv.test_name}</strong>${inv.category ? '<br><small class="text-muted">' + inv.category + '</small>' : ''}</td>
                <td><span class="badge bg-${statusBadge}">${inv.status}</span></td>
                <td>${inv.result_value ? inv.result_value + (inv.result_unit ? ' ' + inv.result_unit : '') : (inv.impression ? inv.impression.substring(0, 50) + '...' : '-')}</td>
                <td>${inv.orderer || '-'}</td>
            </tr>`;
        }).join('') + '</tbody></table></div>';
}

// Update drSelectPatient to load vitals and investigations
const originalDrSelectPatient = drSelectPatient;
drSelectPatient = function (patient) {
    originalDrSelectPatient(patient);
    drLoadVitals();
    drLoadInvestigations();
};
