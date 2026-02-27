document.addEventListener('DOMContentLoaded', function () {
    // Initialize Dashboard
    initializeDashboard();

    // Navigation Logic
    const navItems = document.querySelectorAll('.nav-item .nav-link');
    const pages = document.querySelectorAll('.content-page');
    const pageTitle = document.getElementById('pageTitle');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPageId = item.getAttribute('data-page') + '-page';
            const title = item.textContent.trim();

            // Update Active State
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            pages.forEach(page => {
                page.classList.remove('active');
                if (page.id === targetPageId) {
                    page.classList.add('active');
                }
            });

            // Update Title
            pageTitle.textContent = title;
        });
    });

    // Date Display
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', dateOptions);

    // Add Doctor Form Logic
    const addDoctorForm = document.getElementById('addDoctorForm');
    if (addDoctorForm) {
        addDoctorForm.addEventListener('submit', handleAddDoctor);
    }

    // Add Department Form Logic
    const addDepartmentForm = document.getElementById('addDepartmentForm');
    if (addDepartmentForm) {
        addDepartmentForm.addEventListener('submit', handleAddDepartment);
    }
});

function initializeDashboard() {
    fetchStats();
    fetchDoctors();
    fetchDepartments();
    fetchAnalytics();
}

function fetchStats() {
    fetch('/api/hospital/stats')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('totalDoctors').textContent = data.stats.doctors;
                document.getElementById('totalPatients').textContent = data.stats.patients;
                document.getElementById('todayAppointments').textContent = data.stats.appointments;
                document.getElementById('totalRevenue').textContent = data.stats.revenue;
            }
        })
        .catch(error => console.error('Error fetching stats:', error));
}

function fetchAnalytics() {
    fetch('/api/hospital/analytics')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderAnalytics(data.analytics);
            }
        })
        .catch(error => console.error('Error fetching analytics:', error));
}

function renderAnalytics(data) {
    // Revenue Growth
    document.getElementById('revenueGrowth').textContent = data.revenue_growth;

    // Department Performance
    const deptContainer = document.getElementById('analyticsDeptPerformance');
    deptContainer.innerHTML = '';

    if (data.department_performance.length === 0) {
        deptContainer.innerHTML = '<div class="text-center py-4 text-muted">No data available</div>';
    } else {
        data.department_performance.forEach(dept => {
            let colorClass = 'bg-primary';
            if (dept.score >= 80) colorClass = 'bg-success';
            else if (dept.score < 50) colorClass = 'bg-danger';
            else if (dept.score < 70) colorClass = 'bg-warning';

            const div = document.createElement('div');
            div.className = 'mb-3';
            div.innerHTML = `
                <div class="d-flex justify-content-between small mb-1">
                    <span>${dept.name}</span>
                    <span class="fw-bold">${dept.score}%</span>
                </div>
                <div class="progress" style="height: 6px;">
                    <div class="progress-bar ${colorClass}" style="width: ${dept.score}%"></div>
                </div>
            `;
            deptContainer.appendChild(div);
        });
    }

    // Recent Activity
    const activityBody = document.getElementById('analyticsActivityLog');
    activityBody.innerHTML = '';

    if (data.recent_activity.length === 0) {
        activityBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No recent activity</td></tr>';
    } else {
        data.recent_activity.forEach(act => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="ps-4 fw-bold">${act.action}</td>
                <td>${act.details}</td>
                <td class="text-muted small">${act.time}</td>
                <td class="text-end pe-4"><span class="badge bg-light text-success border border-success">Completed</span></td>
            `;
            activityBody.appendChild(tr);
        });
    }
}

function fetchDoctors() {
    fetch('/api/hospital/doctors')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderDoctors(data.doctors);
            }
        })
        .catch(error => console.error('Error fetching doctors:', error));
}

function fetchDepartments() {
    fetch('/api/hospital/departments')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderDepartments(data.departments);
            }
        })
        .catch(error => console.error('Error fetching departments:', error));
}

function renderDoctors(doctors) {
    const tbody = document.getElementById('doctorsTableBody');
    tbody.innerHTML = '';

    if (doctors.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No doctors found</td></tr>';
        return;
    }

    doctors.forEach(doc => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <div class="bg-light rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">
                        <i class="fas fa-user-md text-secondary"></i>
                    </div>
                    <div>
                        <div class="fw-bold">${doc.name}</div>
                        <div class="small text-muted">${doc.uid}</div>
                    </div>
                </div>
            </td>
            <td><span class="badge bg-primary-subtle text-primary">${doc.specialty}</span></td>
            <td>
                <div class="small"><i class="fas fa-phone me-1 text-muted"></i> ${doc.phone}</div>
                <div class="small"><i class="fas fa-envelope me-1 text-muted"></i> ${doc.email}</div>
            </td>
            <td><span class="badge bg-success-subtle text-success">${doc.status}</span></td>
            <td class="text-end">
                <button class="btn btn-sm btn-light text-muted"><i class="fas fa-ellipsis-v"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderDepartments(departments) {
    const tbody = document.getElementById('departmentsTableBody');
    tbody.innerHTML = '';

    if (departments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No departments found</td></tr>';
        return;
    }

    departments.forEach(dept => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <div class="bg-light rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">
                        <i class="fas fa-building text-secondary"></i>
                    </div>
                    <div class="fw-bold">${dept.name}</div>
                </div>
            </td>
            <td>${dept.head}</td>
            <td>${dept.created_at}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-danger" onclick="deleteDepartment(${dept.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function handleAddDoctor(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Basic client-side validation
    if (data.uid.length !== 16) {
        alert('UID must be exactly 16 digits');
        return;
    }

    fetch('/api/hospital/doctors/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                alert('Doctor added successfully!');
                const modal = bootstrap.Modal.getInstance(document.getElementById('addDoctorModal'));
                modal.hide();
                form.reset();
                fetchDoctors(); // Refresh list
                fetchStats();   // Refresh stats
            } else {
                alert('Error: ' + result.message);
            }
        })
        .catch(error => {
            console.error('Error adding doctor:', error);
            alert('An error occurred while adding the doctor.');
        });
}

function handleAddDepartment(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    fetch('/api/hospital/departments/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                alert('Department added successfully!');
                const modal = bootstrap.Modal.getInstance(document.getElementById('addDepartmentModal'));
                modal.hide();
                form.reset();
                fetchDepartments();
            } else {
                alert('Error: ' + result.message);
            }
        })
        .catch(error => {
            console.error('Error adding department:', error);
            alert('An error occurred while adding the department.');
        });
}

function deleteDepartment(id) {
    if (!confirm('Are you sure you want to delete this department?')) return;

    fetch(`/api/hospital/departments/delete/${id}`, {
        method: 'DELETE'
    })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                fetchDepartments();
            } else {
                alert('Error: ' + result.message);
            }
        })
        .catch(error => console.error('Error deleting department:', error));
}
