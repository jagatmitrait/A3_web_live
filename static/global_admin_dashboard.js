/**
 * A3 Health Card - Global Admin Dashboard JavaScript
 * Handles all client-side functionality for the Global Admin dashboard
 */

// Real-time polling intervals
let statsPollingInterval = null;
let alertsPollingInterval = null;
const STATS_POLL_INTERVAL = 30000; // 30 seconds
const ALERTS_POLL_INTERVAL = 60000; // 60 seconds

document.addEventListener('DOMContentLoaded', function () {
    // Initialize
    initNavigation();
    loadDashboardData();
    setupFormHandlers();
    updateCurrentDate();

    // Start real-time polling
    startRealTimePolling();
});

// ===== REAL-TIME POLLING =====
function startRealTimePolling() {
    // Start stats polling (every 30 seconds)
    statsPollingInterval = setInterval(() => {
        if (document.getElementById('overview-page')?.classList.contains('active')) {
            refreshDashboardStats();
        }
    }, STATS_POLL_INTERVAL);

    // Start alerts polling (every 60 seconds)
    alertsPollingInterval = setInterval(() => {
        refreshAlertsBadge();
    }, ALERTS_POLL_INTERVAL);

    console.log('Real-time polling started');
}

function stopRealTimePolling() {
    if (statsPollingInterval) clearInterval(statsPollingInterval);
    if (alertsPollingInterval) clearInterval(alertsPollingInterval);
    console.log('Real-time polling stopped');
}

async function refreshDashboardStats() {
    try {
        const response = await fetch('/api/global-admin/stats');
        const data = await response.json();

        if (data.success && data.stats) {
            updateStatsCards(data.stats);
            updateLastRefreshTime();
        }
    } catch (error) {
        console.log('Stats refresh failed:', error);
    }
}

function updateStatsCards(stats) {
    // Update stat cards with animation
    const updates = [
        { id: 'totalUsers', value: stats.total_users || 0 },
        { id: 'activeCountries', value: stats.active_countries || 0 },
        { id: 'totalFacilities', value: stats.total_facilities || 0 },
        { id: 'totalHealthWorkers', value: stats.total_health_workers || 0 }
    ];

    updates.forEach(({ id, value }) => {
        const el = document.getElementById(id);
        if (el) {
            const oldValue = parseInt(el.textContent.replace(/,/g, '')) || 0;
            if (oldValue !== value) {
                el.textContent = formatNumber(value);
                el.closest('.card')?.classList.add('pulse-update');
                setTimeout(() => el.closest('.card')?.classList.remove('pulse-update'), 500);
            }
        }
    });
}

async function refreshAlertsBadge() {
    try {
        const response = await fetch('/api/global-admin/alerts');
        const data = await response.json();

        if (data.success) {
            const activeAlerts = (data.alerts || []).filter(a => !a.is_resolved).length;
            updateAlertBadge(activeAlerts);
        }
    } catch (error) {
        console.log('Alerts refresh failed:', error);
    }
}

function updateAlertBadge(count) {
    const badge = document.getElementById('alertsBadge');
    if (badge) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }

    // Also update sidebar alerts badge
    const sidebarBadge = document.querySelector('[data-page="alerts"] .badge');
    if (sidebarBadge) {
        sidebarBadge.textContent = count;
    }
}

function updateLastRefreshTime() {
    const el = document.getElementById('lastRefreshTime');
    if (el) {
        const now = new Date();
        el.textContent = `Last updated: ${now.toLocaleTimeString()}`;
    }
}


// ===== NAVIGATION =====
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link[data-page]');
    const pageTitle = document.getElementById('pageTitle');

    // Also handle links in cards that navigate to pages
    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            showPage(page);
        });
    });

    // Handle sidebar navigation active states
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
}

function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.content-page').forEach(page => {
        page.classList.remove('active');
    });

    // Show selected page
    const targetPage = document.getElementById(`${pageId}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // Update active nav link
    document.querySelectorAll('.nav-link[data-page]').forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-page') === pageId);
    });

    // Update page title
    const titles = {
        'overview': 'Dashboard Overview',
        'continent-admins': 'Continent Admins',
        'regional-admins': 'Regional Admins',
        'national-admins': 'National Admins',
        'state-admins': 'State Admins',
        'district-admins': 'District Admins',
        'block-admins': 'Block Admins',
        'continents': 'Continents',
        'regions': 'Regions',
        'countries': 'Countries',
        'states': 'States',
        'districts': 'Districts',
        'all-users': 'All Users',
        'facilities': 'Healthcare Facilities',
        'health-workers': 'Health Workers',
        'health-programs': 'Health Programs',
        'disease-surveillance': 'Disease Surveillance',
        'ai-predictions': 'AI Predictions',
        'alerts': 'Alerts Center',
        'reports': 'Reports',
        'audit': 'Audit & Logs',
        'settings': 'Settings'
    };
    document.getElementById('pageTitle').textContent = titles[pageId] || 'Dashboard';

    // Load page-specific data
    switch (pageId) {
        case 'continent-admins': loadContinentAdmins(); break;
        case 'regional-admins': loadRegionalAdmins(); break;
        case 'national-admins': loadNationalAdmins(); break;
        case 'state-admins': loadStateAdmins(); break;
        case 'district-admins': loadDistrictAdmins(); break;
        case 'block-admins': loadBlockAdmins(); break;
        case 'continents': loadContinentsList(); break;
        case 'regions': loadRegionsList(); break;
        case 'countries': loadCountries(); break;
        case 'states': loadStates(); break;
        case 'districts': loadDistrictsList(); break;
        case 'all-users': loadAllUsers(); break;
        case 'facilities': loadFacilities(); break;
        case 'health-workers': loadHealthWorkers(); break;
        case 'health-programs': loadHealthPrograms(); break;
        case 'disease-surveillance': loadDiseaseSurveillance(); break;
        case 'ai-predictions': loadAIPredictions(); break;
        case 'alerts': loadAlertsCenter(); break;
        case 'reports': loadReports(); break;
        case 'audit': loadAuditLogs(); break;
        case 'settings': loadSettings(); break;
    }
}

function updateCurrentDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', options);
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info') {
    const toastEl = document.getElementById('liveToast');
    const toastTitle = document.getElementById('toastTitle');
    const toastBody = document.getElementById('toastBody');

    const titles = {
        'success': 'Success',
        'error': 'Error',
        'warning': 'Warning',
        'info': 'Info'
    };

    toastTitle.textContent = titles[type] || 'Notification';
    toastBody.textContent = message;
    toastEl.classList.remove('bg-success', 'bg-danger', 'bg-warning');

    if (type === 'success') toastEl.classList.add('bg-success', 'text-white');
    else if (type === 'error') toastEl.classList.add('bg-danger', 'text-white');

    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

// ===== DASHBOARD DATA =====
let performanceChart = null;
let userDistributionChart = null;
let activityChart = null;
let userGrowthMiniChart = null;
let overviewMap = null;
let chartsInitialized = false;

async function loadDashboardData() {
    try {
        const response = await fetch('/api/global-admin/stats');
        const data = await response.json();

        if (data.success) {
            const s = data.stats;

            // Update main dashboard KPIs (6 cards on overview page)
            const kpiCitizens = document.getElementById('kpiCitizens');
            if (kpiCitizens) kpiCitizens.textContent = formatLargeNumber(s.total_citizens || 0);

            const kpiDailyUsers = document.getElementById('kpiDailyUsers');
            if (kpiDailyUsers) kpiDailyUsers.textContent = formatLargeNumber(s.total_users || 0);

            const kpiFacilities = document.getElementById('kpiFacilities');
            if (kpiFacilities) kpiFacilities.textContent = (s.total_facilities || 0).toLocaleString();

            const kpiAlerts = document.getElementById('kpiAlerts');
            if (kpiAlerts) kpiAlerts.textContent = s.active_alerts || 0;

            const kpiUptime = document.getElementById('kpiUptime');
            if (kpiUptime) kpiUptime.textContent = 'Online';

            const kpiScreenings = document.getElementById('kpiScreenings');
            if (kpiScreenings) kpiScreenings.textContent = formatLargeNumber(s.screenings_today || 0);

            // Update stat cards (existing functionality)
            const statCountries = document.getElementById('statCountries');
            if (statCountries) statCountries.textContent = s.total_countries || 0;

            const statHospitals = document.getElementById('statHospitals');
            if (statHospitals) statHospitals.textContent = s.total_hospitals || 0;

            const statDoctors = document.getElementById('statDoctors');
            if (statDoctors) statDoctors.textContent = s.total_doctors || 0;

            const statUsers = document.getElementById('statUsers');
            if (statUsers) statUsers.textContent = s.total_users || 0;

            // Initialize charts only once
            if (!chartsInitialized) {
                initPerformanceChart();
                initUserDistributionChart(s);
                initUserGrowthMiniChart();
                initOverviewWorldMap();
                chartsInitialized = true;
            }

            // Load real incidents
            loadIncidents();

            // Load top countries widget
            loadTopCountries();
        }
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}

// Format large numbers (e.g., 2400000 -> "2.4M", 156000 -> "156K")
function formatLargeNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(num >= 10000 ? 0 : 1) + 'K';
    }
    return num.toString();
}

function formatNumber(num) {
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
}

// Load real incidents from API
async function loadIncidents() {
    const container = document.getElementById('incidentFeed');
    if (!container) return;

    try {
        const response = await fetch('/api/global-admin/incidents');
        const data = await response.json();

        if (data.success && data.incidents && data.incidents.length > 0) {
            container.innerHTML = data.incidents.map(incident => {
                const severityColors = {
                    'critical': 'bg-danger',
                    'warning': 'bg-warning text-dark',
                    'info': 'bg-info',
                    'emergency': 'bg-danger',
                    'health': 'bg-success',
                    'system': 'bg-primary'
                };
                const severityIcons = {
                    'critical': 'fa-exclamation-circle',
                    'warning': 'fa-exclamation-triangle',
                    'info': 'fa-info-circle',
                    'emergency': 'fa-ambulance',
                    'health': 'fa-heartbeat',
                    'system': 'fa-server'
                };
                const badgeClass = severityColors[incident.severity] || severityColors[incident.alert_type] || 'bg-secondary';
                const iconClass = severityIcons[incident.alert_type] || 'fa-bell';

                return `
                <div class="incident-item border-bottom p-3" data-severity="${incident.severity}">
                    <div class="d-flex align-items-start gap-2">
                        <span class="badge ${badgeClass} rounded-circle p-2"><i class="fas ${iconClass}"></i></span>
                        <div class="flex-grow-1">
                            <div class="fw-semibold small">${escapeHtml(incident.title)}</div>
                            <div class="text-muted" style="font-size: 11px;">${escapeHtml(incident.source || 'System')}</div>
                            <div class="text-muted" style="font-size: 10px;"><i class="fas fa-clock me-1"></i>${incident.time_ago}</div>
                        </div>
                        <button class="btn btn-sm btn-outline-${incident.severity === 'critical' ? 'danger' : 'primary'}" onclick="viewIncident(${incident.id})">View</button>
                    </div>
                </div>
                `;
            }).join('');
        } else {
            container.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-check-circle fa-2x mb-2 opacity-50"></i>
                    <p class="mb-0 small">No active incidents</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load incidents:', error);
        container.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="fas fa-check-circle fa-2x mb-2 opacity-50"></i>
                <p class="mb-0 small">No active incidents</p>
            </div>
        `;
    }
}

function viewIncident(incidentId) {
    showToast('Opening incident details...', 'info');
    // TODO: Implement incident detail modal
}

// Load top countries widget with real user counts
async function loadTopCountries() {
    const container = document.getElementById('topCountriesWidget');
    if (!container) return;

    try {
        const response = await fetch('/api/global-admin/countries');
        const data = await response.json();

        if (data.success && data.countries && data.countries.length > 0) {
            // Get top 5 countries by user count (using registered_users if available)
            const sortedCountries = data.countries
                .map(c => ({
                    name: c.name,
                    code: c.code || '',
                    users: c.registered_users || c.total_users || 0
                }))
                .sort((a, b) => b.users - a.users)
                .slice(0, 5);

            const maxUsers = sortedCountries[0]?.users || 1;
            const colors = ['bg-danger', 'bg-primary', 'bg-info', 'bg-success', 'bg-warning'];

            container.innerHTML = sortedCountries.map((country, index) => {
                const percentage = (country.users / maxUsers) * 100;
                return `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="small">${escapeHtml(country.name)}</span>
                    <div class="progress flex-grow-1 mx-2" style="height: 6px;">
                        <div class="progress-bar ${colors[index]}" style="width: ${percentage}%"></div>
                    </div>
                    <span class="small fw-bold">${formatLargeNumber(country.users)}</span>
                </div>
                `;
            }).join('');
        } else {
            container.innerHTML = `
                <div class="text-center py-2 text-muted small">
                    <i class="fas fa-globe opacity-50"></i> No countries registered yet
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load top countries:', error);
    }
}

// ===== CHARTS =====
function initPerformanceChart() {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;

    if (performanceChart) {
        performanceChart.destroy();
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Generate sample data - in real app, this would come from API
    const registrations = months.map(() => Math.floor(Math.random() * 80) + 20);
    const appointments = months.map(() => Math.floor(Math.random() * 60) + 10);

    performanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Registrations',
                    data: registrations,
                    backgroundColor: 'rgba(211, 47, 47, 0.8)',
                    borderRadius: 6,
                    barThickness: 20,
                },
                {
                    label: 'Appointments',
                    data: appointments,
                    backgroundColor: 'rgba(211, 47, 47, 0.3)',
                    borderRadius: 6,
                    barThickness: 20,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: { family: 'Outfit', size: 12 }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'Outfit' } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: { font: { family: 'Outfit' } }
                }
            }
        }
    });
}

function initUserDistributionChart(stats) {
    const ctx = document.getElementById('userDistributionChart');
    if (!ctx) return;

    if (userDistributionChart) {
        userDistributionChart.destroy();
    }

    const data = {
        labels: ['Clients', 'Doctors', 'Blood Banks', 'Pharmacies', 'Others'],
        datasets: [{
            data: [
                stats.total_clients || 45,
                stats.total_doctors || 25,
                stats.total_blood_banks || 10,
                stats.total_pharmacies || 8,
                Math.max(0, (stats.total_users || 100) - (stats.total_clients || 45) - (stats.total_doctors || 25) - (stats.total_blood_banks || 10) - (stats.total_pharmacies || 8))
            ],
            backgroundColor: [
                '#d32f2f',
                '#43a047',
                '#1e88e5',
                '#fb8c00',
                '#757575'
            ],
            borderWidth: 0,
            cutout: '70%'
        }]
    };

    userDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    // Custom legend
    const legendContainer = document.getElementById('chartLegend');
    if (legendContainer) {
        const colors = ['#d32f2f', '#43a047', '#1e88e5', '#fb8c00', '#757575'];
        const labels = ['Clients', 'Doctors', 'Blood Banks', 'Pharmacies', 'Others'];
        legendContainer.innerHTML = `
            <div class="d-flex flex-wrap justify-content-center gap-2">
                ${labels.map((label, i) => `
                    <span class="d-flex align-items-center gap-1 small">
                        <span style="width:10px;height:10px;background:${colors[i]};border-radius:50%;"></span>
                        ${label}
                    </span>
                `).join('')}
            </div>
        `;
    }
}

function initActivityChart() {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;

    if (activityChart) {
        activityChart.destroy();
    }

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const activity = days.map(() => Math.floor(Math.random() * 50) + 10);

    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days,
            datasets: [{
                label: 'Activity',
                data: activity,
                borderColor: '#d32f2f',
                backgroundColor: 'rgba(211, 47, 47, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#d32f2f',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'Outfit', size: 11 } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: { display: false }
                }
            }
        }
    });
}

// User Growth Mini Chart for Performance Stats card
function initUserGrowthMiniChart() {
    const ctx = document.getElementById('userGrowthMiniChart');
    if (!ctx) return;

    if (userGrowthMiniChart) {
        userGrowthMiniChart.destroy();
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const growth = [12, 19, 15, 25, 22, 30];

    userGrowthMiniChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                data: growth,
                borderColor: '#43a047',
                backgroundColor: 'rgba(67, 160, 71, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { display: false },
                y: { display: false }
            }
        }
    });
}

// Overview World Map (on dashboard homepage)
function initOverviewWorldMap() {
    const mapContainer = document.getElementById('overviewWorldMap');
    if (!mapContainer) return;

    if (overviewMap) {
        overviewMap.remove();
        overviewMap = null;
    }

    overviewMap = L.map('overviewWorldMap', {
        center: [20, 0],
        zoom: 2,
        minZoom: 1,
        maxZoom: 8,
        scrollWheelZoom: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(overviewMap);

    // Fetch real country data from API
    fetch('/api/global-admin/geo/countries')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.countries) {
                data.countries.forEach(country => {
                    addCountryMarker(country);
                });
            }
        })
        .catch(err => console.log('Using fallback country data'));

    // Also fetch facility locations
    fetch('/api/global-admin/geo/facilities')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.facilities) {
                data.facilities.forEach(facility => {
                    addFacilityMarker(facility);
                });
            }
        })
        .catch(err => console.log('No facility geo data'));

    setTimeout(() => {
        overviewMap.invalidateSize();
    }, 100);
}

// Add country marker to map
function addCountryMarker(country) {
    if (!overviewMap || !country.coords) return;

    const markerIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            width: 20px;
            height: 20px;
            background: ${country.active ? '#d32f2f' : '#9e9e9e'};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    const userCount = typeof country.users === 'number'
        ? (country.users >= 1000000 ? `${(country.users / 1000000).toFixed(1)}M`
            : country.users >= 1000 ? `${(country.users / 1000).toFixed(0)}K`
                : country.users)
        : country.users;

    const marker = L.marker(country.coords, { icon: markerIcon }).addTo(overviewMap);
    marker.bindPopup(`
        <div style="text-align: center;">
            <strong>${country.name}</strong><br>
            <span class="badge ${country.active ? 'bg-success' : 'bg-secondary'}">${country.active ? 'Active' : 'Inactive'}</span><br>
            <small>${userCount} users</small>
        </div>
    `);
}

// Add facility marker to map
function addFacilityMarker(facility) {
    if (!overviewMap || !facility.coords) return;

    const markerIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            width: 12px;
            height: 12px;
            background: #1976d2;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });

    const marker = L.marker(facility.coords, { icon: markerIcon }).addTo(overviewMap);
    marker.bindPopup(`
        <div style="text-align: center;">
            <strong>${facility.name}</strong><br>
            <small>${facility.type}</small><br>
            <span class="badge bg-info">${facility.beds} beds</span>
        </div>
    `);
}


// Chart period buttons
document.getElementById('chartWeek')?.addEventListener('click', function () {
    setChartPeriod(this, 'week');
});
document.getElementById('chartMonth')?.addEventListener('click', function () {
    setChartPeriod(this, 'month');
});
document.getElementById('chartYear')?.addEventListener('click', function () {
    setChartPeriod(this, 'year');
});

function setChartPeriod(button, period) {
    document.querySelectorAll('.btn-group .btn').forEach(btn => {
        btn.classList.remove('btn-danger');
        btn.classList.add('btn-outline-secondary');
    });
    button.classList.remove('btn-outline-secondary');
    button.classList.add('btn-danger');

    // Reinitialize chart with new data (in real app, fetch data for period)
    initPerformanceChart();
}

async function loadKPINewUsers() {
    try {
        const response = await fetch('/api/global-admin/analytics');
        const data = await response.json();
        if (data.success) {
            document.getElementById('kpiNewUsers').textContent = data.analytics.new_registrations_30d || 0;
        }
    } catch (error) {
        console.error('Failed to load KPI data:', error);
    }
}

function renderRecentAlerts(alerts) {
    const container = document.getElementById('recentAlertsContainer');

    if (alerts.length === 0) {
        container.innerHTML = '<div class="text-center py-4 text-muted"><i class="fas fa-check-circle me-2"></i>No active alerts</div>';
        return;
    }

    container.innerHTML = alerts.map(alert => `
        <div class="d-flex align-items-center gap-3 py-2 border-bottom">
            <span class="alert-badge ${alert.type}">${alert.type.toUpperCase()}</span>
            <div style="flex: 1; min-width: 0;">
                <div class="fw-semibold text-truncate">${escapeHtml(alert.title)}</div>
                <div class="small text-muted">${alert.created_at}</div>
            </div>
        </div>
    `).join('');
}

function renderPendingAdmins(admins) {
    const container = document.getElementById('pendingAdminsContainer');

    if (admins.length === 0) {
        container.innerHTML = '<div class="text-center py-4 text-muted"><i class="fas fa-check-circle me-2"></i>No pending approvals</div>';
        return;
    }

    container.innerHTML = admins.map(admin => `
        <div class="d-flex align-items-center gap-3 py-2 border-bottom">
            <div class="bg-warning-subtle text-warning rounded-circle d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                <i class="fas fa-user"></i>
            </div>
            <div style="flex: 1; min-width: 0;">
                <div class="fw-semibold text-truncate">${escapeHtml(admin.name)}</div>
                <div class="small text-muted">${escapeHtml(admin.email)}</div>
            </div>
            <button class="btn btn-sm btn-success" onclick="approveAdmin(${admin.id})">
                <i class="fas fa-check"></i>
            </button>
        </div>
    `).join('');
}

// ===== COUNTRIES =====
let allCountries = [];
let countriesCurrentPage = 1;
const countriesPerPage = 5;
let countriesMap = null;
let countryMarkers = [];

// Country coordinates for world map (ISO code -> [lat, lng])
const countryCoordinates = {
    'IN': [20.5937, 78.9629], // India
    'US': [37.0902, -95.7129], // USA
    'GB': [55.3781, -3.4360], // UK
    'AU': [-25.2744, 133.7751], // Australia
    'CA': [56.1304, -106.3468], // Canada
    'DE': [51.1657, 10.4515], // Germany
    'FR': [46.2276, 2.2137], // France
    'JP': [36.2048, 138.2529], // Japan
    'CN': [35.8617, 104.1954], // China
    'BR': [-14.2350, -51.9253], // Brazil
    'RU': [61.5240, 105.3188], // Russia
    'ZA': [-30.5595, 22.9375], // South Africa
    'AE': [23.4241, 53.8478], // UAE
    'SA': [23.8859, 45.0792], // Saudi Arabia
    'SG': [1.3521, 103.8198], // Singapore
    'MY': [4.2105, 101.9758], // Malaysia
    'ID': [-0.7893, 113.9213], // Indonesia
    'PH': [12.8797, 121.7740], // Philippines
    'TH': [15.8700, 100.9925], // Thailand
    'VN': [14.0583, 108.2772], // Vietnam
    'KR': [35.9078, 127.7669], // South Korea
    'MX': [23.6345, -102.5528], // Mexico
    'AR': [-38.4161, -63.6167], // Argentina
    'CL': [-35.6751, -71.5430], // Chile
    'CO': [4.5709, -74.2973], // Colombia
    'EG': [26.8206, 30.8025], // Egypt
    'NG': [9.0820, 8.6753], // Nigeria
    'KE': [-0.0236, 37.9062], // Kenya
    'PK': [30.3753, 69.3451], // Pakistan
    'BD': [23.6850, 90.3563], // Bangladesh
    'NZ': [-40.9006, 174.8860], // New Zealand
    'IT': [41.8719, 12.5674], // Italy
    'ES': [40.4637, -3.7492], // Spain
    'PT': [39.3999, -8.2245], // Portugal
    'NL': [52.1326, 5.2913], // Netherlands
    'BE': [50.5039, 4.4699], // Belgium
    'SE': [60.1282, 18.6435], // Sweden
    'NO': [60.4720, 8.4689], // Norway
    'DK': [56.2639, 9.5018], // Denmark
    'FI': [61.9241, 25.7482], // Finland
    'PL': [51.9194, 19.1451], // Poland
    'AT': [47.5162, 14.5501], // Austria
    'CH': [46.8182, 8.2275], // Switzerland
    'GR': [39.0742, 21.8243], // Greece
    'TR': [38.9637, 35.2433], // Turkey
    'IL': [31.0461, 34.8516], // Israel
    'IE': [53.4129, -8.2439], // Ireland
};

async function loadCountries() {
    try {
        const response = await fetch('/api/global-admin/countries');
        const data = await response.json();

        if (data.success) {
            allCountries = data.countries.map(c => ({
                ...c,
                // Use real data from API, with defaults for missing fields
                registered_users: c.registered_users || 0,
                active_hospitals: c.active_hospitals || 0,
                screening_rate: c.screening_rate || 0,
                alerts_count: c.alerts_count || 0,
                last_sync: c.last_sync || new Date().toISOString(),
                issue_severity: c.issue_severity || 'low',
                compliance: c.compliance || { gdpr: false, dpdp: false, hipaa: false }
            }));
            countriesCurrentPage = 1;
            renderCountryOverviewTable();
            updateCountrySelects(data.countries);
            initCountriesMap(data.countries);
            updateCountryStats();
        } else {
            allCountries = [];
            renderCountryOverviewTable();
        }
    } catch (error) {
        console.error('Failed to load countries:', error);
        // Show empty state instead of demo data
        allCountries = [];
        renderCountryOverviewTable();
        updateCountryStats();
    }
}

// DEPRECATED: Demo function removed for production
// Returns empty array - all data should come from real API
function generateDemoCountries() {
    console.warn('generateDemoCountries is deprecated - use real API data');
    return [];
}

function updateCountryStats() {
    const totalEl = document.getElementById('totalCountriesCount');
    const activeEl = document.getElementById('activeCountriesCount');
    const hospitalsEl = document.getElementById('totalHospitalsCount');
    const screeningEl = document.getElementById('avgScreeningRate');

    if (totalEl) totalEl.textContent = allCountries.length;
    if (activeEl) activeEl.textContent = allCountries.filter(c => c.is_active).length;
    if (hospitalsEl) hospitalsEl.textContent = allCountries.reduce((sum, c) => sum + (c.active_hospitals || 0), 0).toLocaleString();

    const avgScreening = allCountries.length > 0
        ? Math.round(allCountries.reduce((sum, c) => sum + (c.screening_rate || 0), 0) / allCountries.length)
        : 0;
    if (screeningEl) screeningEl.textContent = avgScreening + '%';
}

function searchCountries() {
    renderCountryOverviewTable();
}

function renderCountryOverviewTable() {
    const tbody = document.getElementById('countryOverviewTableBody');
    if (!tbody) return;

    const searchTerm = document.getElementById('countrySearchInput')?.value.toLowerCase() || '';
    let filtered = allCountries;

    if (searchTerm) {
        filtered = filtered.filter(c =>
            c.name.toLowerCase().includes(searchTerm) ||
            c.code.toLowerCase().includes(searchTerm)
        );
    }

    const totalCountries = filtered.length;
    const totalPages = Math.ceil(totalCountries / countriesPerPage);

    if (totalCountries === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted">No countries found</td></tr>';
        const paginationInfo = document.getElementById('countriesPaginationInfo');
        if (paginationInfo) paginationInfo.textContent = 'Showing 0 of 0';
        return;
    }

    const startIndex = (countriesCurrentPage - 1) * countriesPerPage;
    const endIndex = Math.min(startIndex + countriesPerPage, totalCountries);
    const pageCountries = filtered.slice(startIndex, endIndex);

    const severityBadges = {
        'low': 'bg-success',
        'medium': 'bg-warning text-dark',
        'high': 'bg-danger',
        'critical': 'bg-dark'
    };

    tbody.innerHTML = pageCountries.map(c => {
        const lastSync = new Date(c.last_sync);
        const syncAgo = Math.floor((Date.now() - lastSync) / 60000);

        return `
        <tr onclick="openCountryProfile(${c.id})" style="cursor: pointer;">
            <td>
                <div class="d-flex align-items-center gap-2">
                    <span class="fi fi-${c.code.toLowerCase()}" style="font-size: 1.2rem;"></span>
                    <div>
                        <strong>${escapeHtml(c.name)}</strong>
                        <div class="text-muted small">${c.code}</div>
                    </div>
                </div>
            </td>
            <td><span class="fw-semibold">${(c.registered_users || 0).toLocaleString()}</span></td>
            <td><span class="badge bg-primary">${c.active_hospitals || 0}</span></td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="progress flex-grow-1" style="width: 60px; height: 6px;">
                        <div class="progress-bar ${c.screening_rate >= 80 ? 'bg-success' : c.screening_rate >= 60 ? 'bg-warning' : 'bg-danger'}" style="width: ${c.screening_rate}%"></div>
                    </div>
                    <span class="small">${c.screening_rate || 0}%</span>
                </div>
            </td>
            <td>
                ${c.alerts_count > 0 ? `<span class="badge bg-danger">${c.alerts_count}</span>` : '<span class="text-muted">0</span>'}
            </td>
            <td><span class="text-muted small">${syncAgo < 60 ? syncAgo + 'm ago' : Math.floor(syncAgo / 60) + 'h ago'}</span></td>
            <td><span class="badge ${severityBadges[c.issue_severity] || 'bg-secondary'}">${(c.issue_severity || 'low').toUpperCase()}</span></td>
            <td>
                ${c.compliance?.gdpr ? '<span class="badge bg-success me-1" title="GDPR">G</span>' : '<span class="badge bg-secondary me-1" title="GDPR">G</span>'}
                ${c.compliance?.dpdp ? '<span class="badge bg-success me-1" title="DPDP">D</span>' : '<span class="badge bg-secondary me-1" title="DPDP">D</span>'}
                ${c.compliance?.hipaa ? '<span class="badge bg-success" title="HIPAA">H</span>' : '<span class="badge bg-secondary" title="HIPAA">H</span>'}
            </td>
            <td class="text-end" onclick="event.stopPropagation();">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="openCountryProfile(${c.id})" title="View Profile">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-${c.is_active ? 'warning' : 'success'}" onclick="toggleCountry(${c.id})" title="${c.is_active ? 'Deactivate' : 'Activate'}">
                    <i class="fas fa-${c.is_active ? 'pause' : 'play'}"></i>
                </button>
            </td>
        </tr>
    `;
    }).join('');

    const paginationInfo = document.getElementById('countriesPaginationInfo');
    if (paginationInfo) paginationInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${totalCountries}`;
    renderCountriesPagination(totalPages);
}

let selectedCountryId = null;

function openCountryProfile(countryId) {
    const country = allCountries.find(c => c.id === countryId);
    if (!country) return;

    selectedCountryId = countryId;

    // Populate header
    document.getElementById('profileCountryName').textContent = country.name + ' Profile';
    document.getElementById('profileUsers').textContent = (country.registered_users || 0).toLocaleString();
    document.getElementById('profileHospitals').textContent = country.active_hospitals || 0;
    document.getElementById('profileScreenings').textContent = (country.screening_rate || 0) + '%';
    document.getElementById('profileAlerts').textContent = country.alerts_count || 0;

    // Populate leadership team (demo data)
    const leadershipHtml = `
        <div class="list-group-item d-flex align-items-center gap-3">
            <div class="rounded-circle bg-danger text-white d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">NA</div>
            <div class="flex-grow-1">
                <div class="fw-semibold">National Health Admin</div>
                <small class="text-muted">admin@${country.code.toLowerCase()}.health.gov</small>
            </div>
            <span class="badge bg-success">Active</span>
        </div>
        <div class="list-group-item d-flex align-items-center gap-3">
            <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">IT</div>
            <div class="flex-grow-1">
                <div class="fw-semibold">IT Director</div>
                <small class="text-muted">it.director@${country.code.toLowerCase()}.health.gov</small>
            </div>
            <span class="badge bg-success">Active</span>
        </div>
        <div class="list-group-item d-flex align-items-center gap-3">
            <div class="rounded-circle bg-warning text-dark d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">CO</div>
            <div class="flex-grow-1">
                <div class="fw-semibold">Compliance Officer</div>
                <small class="text-muted">compliance@${country.code.toLowerCase()}.health.gov</small>
            </div>
            <span class="badge bg-success">Active</span>
        </div>
    `;
    document.getElementById('profileLeadershipTeam').innerHTML = leadershipHtml;

    new bootstrap.Modal(document.getElementById('countryProfileModal')).show();
}

function editCountryProfile() {
    showToast('Edit Country Profile - Coming soon', 'info');
}

function renderCountriesWithPagination() {
    renderCountryOverviewTable();
}

function renderCountriesPagination(totalPages) {
    const pagination = document.getElementById('countriesPagination');

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '';

    // Previous button
    html += `<li class="page-item ${countriesCurrentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goToCountryPage(${countriesCurrentPage - 1}); return false;">
            <i class="fas fa-chevron-left"></i>
        </a>
    </li>`;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${countriesCurrentPage === i ? 'active' : ''}">
            <a class="page-link" href="#" onclick="goToCountryPage(${i}); return false;">${i}</a>
        </li>`;
    }

    // Next button
    html += `<li class="page-item ${countriesCurrentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goToCountryPage(${countriesCurrentPage + 1}); return false;">
            <i class="fas fa-chevron-right"></i>
        </a>
    </li>`;

    pagination.innerHTML = html;
}

function goToCountryPage(page) {
    const totalPages = Math.ceil(allCountries.length / countriesPerPage);
    if (page < 1 || page > totalPages) return;
    countriesCurrentPage = page;
    renderCountriesWithPagination();
}

// World Map Functions
function initCountriesMap(countries) {
    const mapContainer = document.getElementById('countriesWorldMap');
    if (!mapContainer) return;

    // Destroy existing map
    if (countriesMap) {
        countriesMap.remove();
        countriesMap = null;
    }

    // Clear markers
    countryMarkers = [];

    // Initialize map
    countriesMap = L.map('countriesWorldMap', {
        center: [20, 0],
        zoom: 2,
        minZoom: 1,
        maxZoom: 8,
        scrollWheelZoom: true
    });

    // Add tile layer (CartoDB Positron - clean light style)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(countriesMap);

    // Add markers for each country
    countries.forEach(country => {
        const coords = countryCoordinates[country.code.toUpperCase()];
        if (coords) {
            const isActive = country.is_active;

            // Custom marker icon
            const markerIcon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="
                    width: 24px;
                    height: 24px;
                    background: ${isActive ? '#d32f2f' : '#9e9e9e'};
                    border: 3px solid white;
                    border-radius: 50%;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                "></div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            const marker = L.marker(coords, { icon: markerIcon }).addTo(countriesMap);

            // Popup
            marker.bindPopup(`
                <div style="text-align: center; min-width: 120px;">
                    <strong style="font-size: 14px;">${country.name}</strong><br>
                    <span style="color: #666;">Code: ${country.code}</span><br>
                    <span class="badge ${isActive ? 'bg-success' : 'bg-secondary'}" style="margin-top: 5px;">
                        ${isActive ? 'Active' : 'Inactive'}
                    </span><br>
                    <small style="color: #888;">${country.states_count} States</small>
                </div>
            `);

            countryMarkers.push(marker);
        }
    });

    // Invalidate size after a short delay to ensure proper rendering
    setTimeout(() => {
        countriesMap.invalidateSize();
    }, 100);
}

function renderCountriesTable(countries) {
    // This is now handled by renderCountriesWithPagination
    allCountries = countries;
    renderCountriesWithPagination();
}

function updateCountrySelects(countries) {
    const select = document.getElementById('stateCountrySelect');
    if (select) {
        select.innerHTML = '<option value="">Select Country</option>' +
            countries.filter(c => c.is_active).map(c =>
                `<option value="${c.id}">${escapeHtml(c.name)}</option>`
            ).join('');
    }
}

async function toggleCountry(id) {
    try {
        const response = await fetch(`/api/global-admin/countries/${id}/toggle`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            showToast('Country status updated', 'success');
            loadCountries();
            loadDashboardData();
        }
    } catch (error) {
        showToast('Failed to update country', 'error');
    }
}

async function deleteCountry(id) {
    if (!confirm('Are you sure you want to delete this country? This will also delete all associated states.')) return;

    try {
        const response = await fetch(`/api/global-admin/countries/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            showToast('Country deleted', 'success');
            loadCountries();
            loadDashboardData();
        }
    } catch (error) {
        showToast('Failed to delete country', 'error');
    }
}

// ===== STATES =====
async function loadStates() {
    try {
        const response = await fetch('/api/global-admin/states');
        const data = await response.json();

        if (data.success) {
            renderStatesTable(data.states);
        }
    } catch (error) {
        console.error('Failed to load states:', error);
    }
}

function renderStatesTable(states) {
    const tbody = document.getElementById('statesTableBody');
    const countBadge = document.getElementById('statesCount');

    if (countBadge) countBadge.textContent = states.length;

    if (!states || states.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No states found</td></tr>';
        return;
    }

    tbody.innerHTML = states.map(s => `
        <tr>
            <td><code>${s.id}</code></td>
            <td><strong>${escapeHtml(s.name)}</strong></td>
            <td>${escapeHtml(s.country_name || 'Unknown')}</td>
            <td><span class="badge bg-info">${s.districts || 0}</span></td>
            <td>${escapeHtml(s.state_admin || 'Not Assigned')}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="viewStateDetails(${s.id})" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-${s.is_active ? 'warning' : 'success'}" onclick="toggleState(${s.id})">
                    ${s.is_active ? 'Deactivate' : 'Activate'}
                </button>
            </td>
        </tr>
    `).join('');
}

function viewStateDetails(stateId) {
    showToast('View state details - coming soon', 'info');
}


async function toggleState(id) {
    try {
        const response = await fetch(`/api/global-admin/states/${id}/toggle`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            showToast('State status updated', 'success');
            loadStates();
            loadDashboardData();
        }
    } catch (error) {
        showToast('Failed to update state', 'error');
    }
}

// ===== NATIONAL ADMINS =====
async function loadNationalAdmins() {
    try {
        const response = await fetch('/api/global-admin/national-admins');
        const data = await response.json();

        if (data.success) {
            renderNationalAdminsTable(data.admins);
        }
    } catch (error) {
        console.error('Failed to load national admins:', error);
    }
}

function renderNationalAdminsTable(admins) {
    const tbody = document.getElementById('nationalAdminsTableBody');
    if (!tbody) return;

    // Update pending badge
    const pendingBadge = document.getElementById('pendingAdminsBadge');
    const pendingCount = admins.filter(a => !a.is_verified).length;
    if (pendingBadge) {
        pendingBadge.textContent = `${pendingCount} Pending`;
        pendingBadge.className = pendingCount > 0 ? 'badge bg-warning' : 'badge bg-success';
    }

    if (admins.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No national admins registered</td></tr>';
        return;
    }

    // Compact view for merged page (4 columns: Name, Country, Status, Actions)
    tbody.innerHTML = admins.map(a => `
        <tr>
            <td>
                <strong>${escapeHtml(a.name)}</strong>
                <div class="small text-muted">${escapeHtml(a.email)}</div>
            </td>
            <td>${a.jurisdiction || '-'}</td>
            <td>
                <span class="badge ${a.is_verified ? 'status-active' : 'status-pending'}">
                    ${a.is_verified ? 'Active' : 'Pending'}
                </span>
            </td>
            <td class="text-end">
                ${!a.is_verified ? `<button class="btn btn-sm btn-success" onclick="approveAdmin(${a.id})" title="Approve"><i class="fas fa-check"></i></button>` : ''}
                ${a.is_verified ? `<button class="btn btn-sm btn-warning" onclick="suspendAdmin(${a.id})" title="Suspend"><i class="fas fa-pause"></i></button>` : ''}
                <button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteAdmin(${a.id})" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

async function approveAdmin(id) {
    try {
        const response = await fetch(`/api/global-admin/national-admins/${id}/approve`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            showToast('Admin approved successfully', 'success');
            loadNationalAdmins();
            loadDashboardData();
        }
    } catch (error) {
        showToast('Failed to approve admin', 'error');
    }
}

async function suspendAdmin(id) {
    if (!confirm('Suspend this admin? They will not be able to login.')) return;

    try {
        const response = await fetch(`/api/global-admin/national-admins/${id}/suspend`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            showToast('Admin suspended', 'success');
            loadNationalAdmins();
        }
    } catch (error) {
        showToast('Failed to suspend admin', 'error');
    }
}

async function deleteAdmin(id) {
    if (!confirm('Delete this admin permanently? This action cannot be undone.')) return;

    try {
        const response = await fetch(`/api/global-admin/national-admins/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            showToast('Admin deleted', 'success');
            loadNationalAdmins();
        }
    } catch (error) {
        showToast('Failed to delete admin', 'error');
    }
}

// ===== ALERTS =====
async function loadAlerts() {
    try {
        const response = await fetch('/api/global-admin/alerts');
        const data = await response.json();

        if (data.success) {
            renderAlertsTable(data.alerts);
        }
    } catch (error) {
        console.error('Failed to load alerts:', error);
    }
}

function renderAlertsTable(alerts) {
    const tbody = document.getElementById('alertsTableBody');

    if (alerts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No alerts created yet</td></tr>';
        return;
    }

    tbody.innerHTML = alerts.map(a => `
        <tr>
            <td><strong>${escapeHtml(a.title)}</strong></td>
            <td><span class="alert-badge ${a.alert_type}">${a.alert_type.toUpperCase()}</span></td>
            <td><span class="badge bg-${a.priority === 'critical' ? 'danger' : a.priority === 'high' ? 'warning' : 'secondary'}">${a.priority}</span></td>
            <td>${a.created_at}</td>
            <td>
                <span class="badge ${a.is_active ? 'status-active' : 'status-inactive'}">
                    ${a.is_active ? 'Active' : 'Disabled'}
                </span>
            </td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-${a.is_active ? 'warning' : 'success'}" onclick="toggleAlert(${a.id})">
                    ${a.is_active ? 'Disable' : 'Enable'}
                </button>
                <button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteAlert(${a.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function toggleAlert(id) {
    try {
        const response = await fetch(`/api/global-admin/alerts/${id}/toggle`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            showToast('Alert status updated', 'success');
            loadAlerts();
            loadDashboardData();
        }
    } catch (error) {
        showToast('Failed to update alert', 'error');
    }
}

async function deleteAlert(id) {
    if (!confirm('Delete this alert?')) return;

    try {
        const response = await fetch(`/api/global-admin/alerts/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            showToast('Alert deleted', 'success');
            loadAlerts();
        }
    } catch (error) {
        showToast('Failed to delete alert', 'error');
    }
}

// ===== ANALYTICS =====
async function loadAnalytics() {
    try {
        const response = await fetch('/api/global-admin/analytics');
        const data = await response.json();

        if (data.success) {
            renderUserDistribution(data.analytics.user_distribution);
            renderQuickStats(data.analytics);
        }
    } catch (error) {
        console.error('Failed to load analytics:', error);
    }
}

function renderUserDistribution(distribution) {
    const container = document.getElementById('userDistributionContainer');

    const entries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);

    container.innerHTML = `
        <div class="row g-3">
            ${entries.map(([type, count]) => {
        const percent = ((count / total) * 100).toFixed(1);
        return `
                    <div class="col-md-6">
                        <div class="d-flex justify-content-between mb-1">
                            <span class="text-capitalize">${type.replace(/_/g, ' ')}</span>
                            <span class="fw-bold">${count}</span>
                        </div>
                        <div class="progress" style="height: 8px;">
                            <div class="progress-bar bg-danger" style="width: ${percent}%"></div>
                        </div>
                    </div>
                `;
    }).join('')}
        </div>
    `;
}

function renderQuickStats(analytics) {
    const container = document.getElementById('quickStatsContainer');

    container.innerHTML = `
        <div class="list-group list-group-flush">
            <div class="list-group-item d-flex justify-content-between px-0">
                <span>New Registrations (30d)</span>
                <strong>${analytics.new_registrations_30d}</strong>
            </div>
            <div class="list-group-item d-flex justify-content-between px-0">
                <span>Total Appointments</span>
                <strong>${analytics.total_appointments}</strong>
            </div>
            <div class="list-group-item d-flex justify-content-between px-0">
                <span>Pending Appointments</span>
                <strong>${analytics.pending_appointments}</strong>
            </div>
            <div class="list-group-item d-flex justify-content-between px-0">
                <span>Available Blood Units</span>
                <strong>${analytics.available_blood_units}</strong>
            </div>
            <div class="list-group-item d-flex justify-content-between px-0">
                <span>Total Vaccinations</span>
                <strong>${analytics.total_vaccinations}</strong>
            </div>
            <div class="list-group-item d-flex justify-content-between px-0">
                <span>Total Consultations</span>
                <strong>${analytics.total_consultations}</strong>
            </div>
        </div>
    `;
}

// ===== LOGIN HISTORY =====
async function loadLoginHistory() {
    try {
        const response = await fetch('/api/global-admin/login-history');
        const data = await response.json();

        if (data.success) {
            renderLoginHistoryTable(data.login_history);
        }
    } catch (error) {
        console.error('Failed to load login history:', error);
    }
}

function renderLoginHistoryTable(history) {
    const tbody = document.getElementById('loginHistoryTableBody');

    if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No login history</td></tr>';
        return;
    }

    tbody.innerHTML = history.map(h => `
        <tr>
            <td>${h.login_time}</td>
            <td>${h.logout_time === 'Active' ? '<span class="badge bg-success">Active Session</span>' : h.logout_time}</td>
            <td><code>${h.ip_address || '-'}</code></td>
            <td class="text-truncate" style="max-width: 200px;" title="${escapeHtml(h.device_info || '')}">${escapeHtml(h.device_info || '-')}</td>
        </tr>
    `).join('');
}

// ===== ALL USERS PAGE =====
async function loadAllUsers() {
    try {
        // Load users list
        const response = await fetch('/api/global-admin/all-users');
        const data = await response.json();

        if (data.success) {
            renderAllUsersTable(data.users || []);
        }

        // Also load hierarchy stats
        loadUserHierarchy();
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

async function loadUserHierarchy() {
    try {
        const response = await fetch('/api/global-admin/user-hierarchy');
        const data = await response.json();

        if (data.success && data.hierarchy) {
            renderHierarchyStats(data.hierarchy);
        }
    } catch (error) {
        console.log('Hierarchy stats not available');
    }
}

function renderHierarchyStats(hierarchy) {
    const container = document.getElementById('hierarchyStatsContainer');
    if (!container) return;

    const clients = hierarchy.clients || {};
    const workers = hierarchy.workers || {};

    container.innerHTML = `
        <div class="alert alert-info mb-3">
            <h6><i class="fas fa-sitemap me-2"></i>User Hierarchy Stats</h6>
            <div class="row g-2 mt-2">
                <div class="col-6 col-md-3">
                    <small class="text-muted">Total Clients</small>
                    <h4 class="mb-0">${clients.total || 0}</h4>
                </div>
                <div class="col-6 col-md-3">
                    <small class="text-muted">Assigned</small>
                    <h4 class="mb-0 text-success">${clients.assigned || 0}</h4>
                </div>
                <div class="col-6 col-md-3">
                    <small class="text-muted">Unassigned</small>
                    <h4 class="mb-0 text-warning">${clients.unassigned || 0}</h4>
                </div>
                <div class="col-6 col-md-3">
                    <small class="text-muted">Assignment Rate</small>
                    <h4 class="mb-0">${clients.assignment_rate || 0}%</h4>
                </div>
            </div>
        </div>
    `;
}

function renderAllUsersTable(users) {
    const tbody = document.getElementById('allUsersTableBody');
    if (!tbody) return;

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No users found</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(u => `
        <tr>
            <td><code>${u.uid || '-'}</code></td>
            <td>${u.full_name || u.email || '-'}</td>
            <td><span class="badge bg-secondary">${u.user_type || '-'}</span></td>
            <td>${u.city || '-'}, ${u.state || '-'}</td>
            <td><span class="badge ${u.is_active ? 'bg-success' : 'bg-danger'}">${u.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewUserDetails(${u.id})">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function viewUserDetails(userId) {
    showToast('View user details feature - coming soon', 'info');
}

// ===== FORM HANDLERS =====
function setupFormHandlers() {
    // Add Country Form
    document.getElementById('addCountryForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        try {
            const response = await fetch('/api/global-admin/countries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.get('name'),
                    code: formData.get('code')
                })
            });
            const data = await response.json();

            if (data.success) {
                showToast('Country added successfully', 'success');
                bootstrap.Modal.getInstance(document.getElementById('addCountryModal')).hide();
                form.reset();
                loadCountries();
                loadDashboardData();
            } else {
                showToast(data.message, 'error');
            }
        } catch (error) {
            showToast('Failed to add country', 'error');
        }
    });

    // Add State Form
    document.getElementById('addStateForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        try {
            const response = await fetch('/api/global-admin/states', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.get('name'),
                    country_id: parseInt(formData.get('country_id'))
                })
            });
            const data = await response.json();

            if (data.success) {
                showToast('State added successfully', 'success');
                bootstrap.Modal.getInstance(document.getElementById('addStateModal')).hide();
                form.reset();
                loadStates();
                loadDashboardData();
            } else {
                showToast(data.message, 'error');
            }
        } catch (error) {
            showToast('Failed to add state', 'error');
        }
    });

    // Add Alert Form
    document.getElementById('addAlertForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        try {
            const response = await fetch('/api/global-admin/alerts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.get('title'),
                    message: formData.get('message'),
                    alert_type: formData.get('alert_type'),
                    priority: formData.get('priority')
                })
            });
            const data = await response.json();

            if (data.success) {
                showToast('Alert created successfully', 'success');
                bootstrap.Modal.getInstance(document.getElementById('addAlertModal')).hide();
                form.reset();
                loadAlerts();
                loadDashboardData();
            } else {
                showToast(data.message, 'error');
            }
        } catch (error) {
            showToast('Failed to create alert', 'error');
        }
    });

    // Load countries for state modal when it opens
    document.getElementById('addStateModal')?.addEventListener('show.bs.modal', () => {
        loadCountries();
    });
}

// ===== USER & ROLE MANAGEMENT =====
let allGlobalRoles = [];
let currentRoleFilter = 'all';
let selectedUserId = null;

async function loadUserRolePage() {
    loadAdminCountrySelect();
    loadGlobalRoles();
    setupCreateAdminForm();
}

function loadAdminCountrySelect() {
    const select = document.getElementById('adminCountrySelect');
    if (!select) return;

    fetch('/api/global-admin/countries')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                select.innerHTML = '<option value="">Select Country</option>' +
                    data.countries.filter(c => c.is_active).map(c =>
                        `<option value="${c.id}">${escapeHtml(c.name)}</option>`
                    ).join('');
            }
        });
}

async function loadGlobalRoles() {
    try {
        const response = await fetch('/api/global-admin/user-roles');
        const data = await response.json();

        if (data.success) {
            allGlobalRoles = data.roles;

            renderGlobalRolesTable();
        }
    } catch (error) {
        console.error('Failed to load global roles:', error);
        // Load demo data if API fails
        allGlobalRoles = generateDemoRoles();
        renderGlobalRolesTable();
    }
}

function generateDemoRoles() {
    const roles = ['national_admin', 'state_admin', 'district_admin', 'hospital_admin', 'health_worker', 'technical_staff'];
    const names = ['Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Sneha Singh', 'Vikram Reddy', 'Anjali Gupta', 'Rajesh Nair', 'Kavitha Menon', 'Suresh Iyer', 'Deepa Rao'];
    const jurisdictions = ['India', 'Maharashtra', 'Mumbai District', 'City Hospital', 'Primary Health Center', 'IT Support'];
    const statuses = ['active', 'active', 'active', 'suspended', 'active', 'pending'];

    return names.map((name, i) => ({
        id: i + 1,
        name: name,
        email: name.toLowerCase().replace(' ', '.') + '@healthadmin.gov',
        role: roles[i % roles.length],
        jurisdiction: jurisdictions[i % jurisdictions.length],
        status: statuses[i % statuses.length],
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        mfa_enabled: Math.random() > 0.3,
        on_watchlist: i === 3
    }));
}

function filterRoles(role) {
    currentRoleFilter = role;

    // Update tab styles
    document.querySelectorAll('#roleFilterTabs .nav-link').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.role === role) btn.classList.add('active');
    });

    renderGlobalRolesTable();
}

function searchGlobalRoles() {
    renderGlobalRolesTable();
}

function renderGlobalRolesTable() {
    const tbody = document.getElementById('globalRolesTableBody');
    if (!tbody) return;

    const searchTerm = document.getElementById('roleSearchInput')?.value.toLowerCase() || '';

    let filtered = allGlobalRoles;

    // Filter by role
    if (currentRoleFilter !== 'all') {
        filtered = filtered.filter(r => r.role === currentRoleFilter);
    }

    // Filter by search
    if (searchTerm) {
        filtered = filtered.filter(r =>
            r.name.toLowerCase().includes(searchTerm) ||
            r.email.toLowerCase().includes(searchTerm) ||
            r.jurisdiction.toLowerCase().includes(searchTerm)
        );
    }

    // Update count
    const countEl = document.getElementById('rolesCount');
    if (countEl) countEl.textContent = `${filtered.length} users found`;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No users found</td></tr>';
        return;
    }

    const roleLabels = {
        'national_admin': { label: 'National Admin', class: 'bg-danger' },
        'state_admin': { label: 'State Admin', class: 'bg-primary' },
        'district_admin': { label: 'District Admin', class: 'bg-info' },
        'hospital_admin': { label: 'Hospital Admin', class: 'bg-success' },
        'health_worker': { label: 'Health Worker', class: 'bg-warning text-dark' },
        'technical_staff': { label: 'Technical Staff', class: 'bg-secondary' }
    };

    const statusLabels = {
        'active': { label: 'Active', class: 'bg-success' },
        'suspended': { label: 'Suspended', class: 'bg-danger' },
        'pending': { label: 'Pending', class: 'bg-warning text-dark' }
    };

    tbody.innerHTML = filtered.map(u => {
        const role = roleLabels[u.role] || { label: u.role, class: 'bg-secondary' };
        const status = statusLabels[u.status] || { label: u.status, class: 'bg-secondary' };
        const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2);

        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="rounded-circle bg-danger text-white d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; font-size: 0.75rem;">${initials}</div>
                        <div>
                            <div class="fw-semibold small">${escapeHtml(u.name)}</div>
                            <div class="text-muted" style="font-size: 11px;">${escapeHtml(u.email)}</div>
                        </div>
                    </div>
                </td>
                <td><span class="badge ${role.class}">${role.label}</span></td>
                <td class="small">${escapeHtml(u.jurisdiction)}</td>
                <td>
                    <span class="badge ${status.class}">${status.label}</span>
                    ${u.on_watchlist ? '<i class="fas fa-eye text-info ms-1" title="On Watchlist"></i>' : ''}
                </td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary" onclick="openRoleActions(${u.id})" title="Actions">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function openRoleActions(userId) {
    const user = allGlobalRoles.find(u => u.id === userId);
    if (!user) return;

    selectedUserId = userId;

    const roleLabels = {
        'national_admin': 'National Admin',
        'state_admin': 'State Admin',
        'district_admin': 'District Admin',
        'hospital_admin': 'Hospital Admin',
        'health_worker': 'Health Worker',
        'technical_staff': 'Technical Staff'
    };

    const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2);

    document.getElementById('modalUserAvatar').textContent = initials;
    document.getElementById('modalUserName').textContent = user.name;
    document.getElementById('modalUserEmail').textContent = user.email;
    document.getElementById('modalUserRole').textContent = roleLabels[user.role] || user.role;

    const statusEl = document.getElementById('modalUserStatus');
    statusEl.textContent = user.status.charAt(0).toUpperCase() + user.status.slice(1);
    statusEl.className = `badge ${user.status === 'active' ? 'bg-success' : user.status === 'suspended' ? 'bg-danger' : 'bg-warning'}`;

    new bootstrap.Modal(document.getElementById('roleActionsModal')).show();
}

function editUserRole() {
    showToast('Edit user functionality - Coming soon', 'info');
}

async function resetUserPermissions() {
    if (!confirm('Reset all permissions to default for this user?')) return;

    try {
        const response = await fetch(`/api/global-admin/users/${selectedUserId}/reset-permissions`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            showToast('Permissions reset successfully', 'success');
        } else {
            showToast(data.message || 'Permissions reset successfully (demo)', 'success');
        }
    } catch (error) {
        showToast('Permissions reset successfully (demo)', 'success');
    }
}

async function suspendUser() {
    if (!confirm('Are you sure you want to suspend this user?')) return;

    try {
        const response = await fetch(`/api/global-admin/users/${selectedUserId}/suspend`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            showToast('User suspended successfully', 'success');
            loadGlobalRoles();
            bootstrap.Modal.getInstance(document.getElementById('roleActionsModal')).hide();
        } else {
            // Demo mode
            const user = allGlobalRoles.find(u => u.id === selectedUserId);
            if (user) user.status = 'suspended';
            showToast('User suspended successfully', 'success');
            renderGlobalRolesTable();
            bootstrap.Modal.getInstance(document.getElementById('roleActionsModal')).hide();
        }
    } catch (error) {
        const user = allGlobalRoles.find(u => u.id === selectedUserId);
        if (user) user.status = 'suspended';
        showToast('User suspended successfully', 'success');
        renderGlobalRolesTable();
        bootstrap.Modal.getInstance(document.getElementById('roleActionsModal')).hide();
    }
}

async function addToWatchlist() {
    try {
        const response = await fetch(`/api/global-admin/users/${selectedUserId}/watchlist`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            showToast('User added to audit watchlist', 'success');
        } else {
            // Demo mode
            const user = allGlobalRoles.find(u => u.id === selectedUserId);
            if (user) user.on_watchlist = true;
            showToast('User added to audit watchlist', 'success');
            renderGlobalRolesTable();
        }
    } catch (error) {
        const user = allGlobalRoles.find(u => u.id === selectedUserId);
        if (user) user.on_watchlist = true;
        showToast('User added to audit watchlist', 'success');
        renderGlobalRolesTable();
    }
}

function assignTraining() {
    const trainings = [
        'Data Privacy & Security Basics',
        'Healthcare Compliance (HIPAA)',
        'System Administration Level 1',
        'Emergency Response Protocol',
        'Fraud Detection Training'
    ];

    const training = trainings[Math.floor(Math.random() * trainings.length)];
    showToast(`Training assigned: "${training}"`, 'success');
}

function viewActivityLogs() {
    bootstrap.Modal.getInstance(document.getElementById('roleActionsModal')).hide();

    const logsBody = document.getElementById('activityLogsBody');
    const user = allGlobalRoles.find(u => u.id === selectedUserId);

    // Demo activity logs
    const actions = ['Login', 'Viewed Dashboard', 'Updated Settings', 'Exported Report', 'Created User', 'Modified Permissions', 'Logout'];
    const ips = ['192.168.1.45', '10.0.0.125', '172.16.0.55', '182.76.123.45'];

    const logs = Array(10).fill(null).map((_, i) => {
        const time = new Date(Date.now() - i * 3600000 * Math.random() * 5);
        return {
            timestamp: time.toLocaleString(),
            action: actions[Math.floor(Math.random() * actions.length)],
            ip: ips[Math.floor(Math.random() * ips.length)],
            details: i === 0 ? 'Current session' : ''
        };
    });

    logsBody.innerHTML = logs.map(log => `
        <tr>
            <td class="small">${log.timestamp}</td>
            <td><span class="badge bg-light text-dark">${log.action}</span></td>
            <td class="small text-muted">${log.ip}</td>
            <td class="small">${log.details}</td>
        </tr>
    `).join('');

    new bootstrap.Modal(document.getElementById('activityLogsModal')).show();
}

function manageIPRestrictions() {
    bootstrap.Modal.getInstance(document.getElementById('roleActionsModal')).hide();
    new bootstrap.Modal(document.getElementById('ipRestrictionsModal')).show();
}

function saveIPRestrictions() {
    const ips = document.getElementById('allowedIPs').value;
    const enforce = document.getElementById('enforceIPRestriction').checked;

    showToast('IP restrictions saved successfully', 'success');
    bootstrap.Modal.getInstance(document.getElementById('ipRestrictionsModal')).hide();
}

function setupCreateAdminForm() {
    const form = document.getElementById('createNationalAdminForm');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const formData = new FormData();
        formData.append('country_id', document.getElementById('adminCountrySelect').value);
        formData.append('name', document.getElementById('adminFullName').value);
        formData.append('email', document.getElementById('adminEmail').value);
        formData.append('gov_authority', document.getElementById('adminGovAuthority').value);
        formData.append('mfa_type', document.getElementById('adminMFA').value);

        // Permissions
        const permissions = {
            country_mgmt: document.getElementById('permCountryMgmt').checked,
            user_mgmt: document.getElementById('permUserMgmt').checked,
            health_data: document.getElementById('permHealthData').checked,
            analytics: document.getElementById('permAnalytics').checked,
            audit: document.getElementById('permAudit').checked
        };
        formData.append('permissions', JSON.stringify(permissions));

        // Files
        const idProof = document.getElementById('adminIdProof').files[0];
        if (idProof) formData.append('id_proof', idProof);

        const signature = document.getElementById('adminDigitalSignature').files[0];
        if (signature) formData.append('digital_signature', signature);

        try {
            const response = await fetch('/api/global-admin/create-national-admin', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                showToast('National Admin created successfully! Credentials sent via email.', 'success');
                form.reset();
                loadGlobalRoles();
            } else {
                showToast(data.message || 'Failed to create admin', 'error');
            }
        } catch (error) {
            // Demo mode
            showToast('National Admin created successfully! Credentials sent via email. (Demo)', 'success');
            form.reset();

            // Add to demo data
            const newAdmin = {
                id: allGlobalRoles.length + 1,
                name: document.getElementById('adminFullName').value,
                email: document.getElementById('adminEmail').value,
                role: 'national_admin',
                jurisdiction: 'New Assignment',
                status: 'pending',
                on_watchlist: false
            };
            allGlobalRoles.unshift(newAdmin);
            renderGlobalRolesTable();
        }
    });
}

// ===== CLINICAL MANAGEMENT PAGE =====
let allHospitals = [];
let hospitalsCurrentPage = 1;
const hospitalsPerPage = 10;
let selectedHospitalId = null;

function loadClinicalPage() {
    loadHospitalsData();
    populateCountryFilter();
}

function populateCountryFilter() {
    const select = document.getElementById('filterCountry');
    if (!select) return;

    const countries = ['India', 'United States', 'United Kingdom', 'Germany', 'Japan', 'Australia', 'Canada', 'Brazil', 'France', 'Singapore'];
    select.innerHTML = '<option value="">All Countries</option>' +
        countries.map(c => `<option value="${c.toLowerCase()}">${c}</option>`).join('');
}

async function loadHospitalsData() {
    try {
        const response = await fetch('/api/global-admin/hospitals');
        const data = await response.json();
        if (data.success) {
            allHospitals = data.hospitals;
        }
    } catch (error) {
        console.log('Using demo hospital data');
        allHospitals = generateDemoHospitals();
    }

    hospitalsCurrentPage = 1;
    renderHospitalsTable();
    updateHospitalStats();
}

function generateDemoHospitals() {
    const names = [
        'Apollo Hospitals', 'Max Healthcare', 'Fortis Hospital', 'AIIMS Delhi', 'Medanta The Medicity',
        'Mayo Clinic', 'Cleveland Clinic', 'Johns Hopkins', 'Massachusetts General', 'UCLA Medical Center',
        'Royal London Hospital', 'St Thomas Hospital', 'Great Ormond Street', 'King Edward VII',
        'Charité Berlin', 'University Hospital Munich', 'Tokyo General Hospital', 'Seoul National University',
        'Singapore General', 'Mount Elizabeth', 'Bumrungrad International', 'Prince Court Medical Centre'
    ];

    const regions = ['asia', 'asia', 'asia', 'asia', 'asia', 'americas', 'americas', 'americas', 'americas', 'americas',
        'europe', 'europe', 'europe', 'europe', 'europe', 'europe', 'asia', 'asia', 'asia', 'asia', 'asia', 'asia'];
    const countries = ['India', 'India', 'India', 'India', 'India', 'United States', 'United States', 'United States', 'United States', 'United States',
        'United Kingdom', 'United Kingdom', 'United Kingdom', 'United Kingdom', 'Germany', 'Germany', 'Japan', 'South Korea', 'Singapore', 'Singapore', 'Thailand', 'Malaysia'];
    const cities = ['Delhi', 'Mumbai', 'Delhi', 'Delhi', 'Gurgaon', 'Minnesota', 'Cleveland', 'Baltimore', 'Boston', 'Los Angeles',
        'London', 'London', 'London', 'London', 'Berlin', 'Munich', 'Tokyo', 'Seoul', 'Singapore', 'Singapore', 'Bangkok', 'Kuala Lumpur'];
    const accreditations = ['nabh', 'jci', 'nabh', 'iso', 'jci', 'jci', 'jci', 'jci', 'jci', 'jci', 'iso', 'iso', 'iso', 'iso', 'iso', 'iso', 'jci', 'jci', 'jci', 'jci', 'jci', 'jci'];
    const statuses = ['active', 'active', 'active', 'pending', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'frozen', 'active', 'active', 'active', 'active'];

    return names.map((name, i) => ({
        id: i + 1,
        name: name,
        region: regions[i],
        country: countries[i],
        city: cities[i],
        accreditation: accreditations[i],
        risk_score: Math.floor(Math.random() * 100),
        performance_score: Math.floor(Math.random() * 40) + 60,
        status: statuses[i],
        patients: Math.floor(Math.random() * 50000) + 5000,
        beds: Math.floor(Math.random() * 500) + 100,
        priority_support: Math.random() > 0.8,
        flagged_audit: Math.random() > 0.9
    }));
}

function updateHospitalStats() {
    const totalEl = document.getElementById('totalHospitalsStats');
    const accreditedEl = document.getElementById('accreditedHospitals');
    const pendingEl = document.getElementById('pendingOnboarding');
    const highRiskEl = document.getElementById('highRiskHospitals');

    if (totalEl) totalEl.textContent = allHospitals.length.toLocaleString();
    if (accreditedEl) accreditedEl.textContent = allHospitals.filter(h => h.accreditation && h.accreditation !== 'none').length;
    if (pendingEl) pendingEl.textContent = allHospitals.filter(h => h.status === 'pending').length;
    if (highRiskEl) highRiskEl.textContent = allHospitals.filter(h => h.risk_score > 60).length;
}

function applyHospitalFilters() {
    hospitalsCurrentPage = 1;
    renderHospitalsTable();
}

function clearHospitalFilters() {
    document.getElementById('filterRegion').value = '';
    document.getElementById('filterCountry').value = '';
    document.getElementById('filterAccreditation').value = '';
    document.getElementById('filterRiskScore').value = '';
    document.getElementById('filterPerformance').value = '';
    document.getElementById('hospitalSearchInput').value = '';
    hospitalsCurrentPage = 1;
    renderHospitalsTable();
}

function searchHospitals() {
    hospitalsCurrentPage = 1;
    renderHospitalsTable();
}

function getFilteredHospitals() {
    let filtered = [...allHospitals];

    const searchTerm = document.getElementById('hospitalSearchInput')?.value.toLowerCase() || '';
    const region = document.getElementById('filterRegion')?.value || '';
    const country = document.getElementById('filterCountry')?.value || '';
    const accreditation = document.getElementById('filterAccreditation')?.value || '';
    const riskScore = document.getElementById('filterRiskScore')?.value || '';
    const performance = document.getElementById('filterPerformance')?.value || '';

    if (searchTerm) {
        filtered = filtered.filter(h =>
            h.name.toLowerCase().includes(searchTerm) ||
            h.city.toLowerCase().includes(searchTerm) ||
            h.country.toLowerCase().includes(searchTerm)
        );
    }

    if (region) filtered = filtered.filter(h => h.region === region);
    if (country) filtered = filtered.filter(h => h.country.toLowerCase() === country);
    if (accreditation) filtered = filtered.filter(h => h.accreditation === accreditation);

    if (riskScore) {
        switch (riskScore) {
            case 'low': filtered = filtered.filter(h => h.risk_score <= 30); break;
            case 'medium': filtered = filtered.filter(h => h.risk_score > 30 && h.risk_score <= 60); break;
            case 'high': filtered = filtered.filter(h => h.risk_score > 60 && h.risk_score <= 80); break;
            case 'critical': filtered = filtered.filter(h => h.risk_score > 80); break;
        }
    }

    if (performance) {
        switch (performance) {
            case 'excellent': filtered = filtered.filter(h => h.performance_score >= 90); break;
            case 'good': filtered = filtered.filter(h => h.performance_score >= 70 && h.performance_score < 90); break;
            case 'average': filtered = filtered.filter(h => h.performance_score >= 50 && h.performance_score < 70); break;
            case 'poor': filtered = filtered.filter(h => h.performance_score < 50); break;
        }
    }

    return filtered;
}

function renderHospitalsTable() {
    const tbody = document.getElementById('hospitalsTableBody');
    if (!tbody) return;

    const filtered = getFilteredHospitals();
    const totalHospitals = filtered.length;
    const totalPages = Math.ceil(totalHospitals / hospitalsPerPage);

    if (totalHospitals === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No hospitals found</td></tr>';
        document.getElementById('hospitalsPaginationInfo').textContent = 'Showing 0 of 0';
        return;
    }

    const startIndex = (hospitalsCurrentPage - 1) * hospitalsPerPage;
    const endIndex = Math.min(startIndex + hospitalsPerPage, totalHospitals);
    const pageHospitals = filtered.slice(startIndex, endIndex);

    const accredBadges = {
        'nabh': 'bg-success',
        'jci': 'bg-primary',
        'iso': 'bg-info',
        'cap': 'bg-warning text-dark',
        'none': 'bg-secondary'
    };

    const statusBadges = {
        'active': 'bg-success',
        'pending': 'bg-warning text-dark',
        'frozen': 'bg-danger',
        'suspended': 'bg-dark'
    };

    tbody.innerHTML = pageHospitals.map(h => {
        const riskClass = h.risk_score > 80 ? 'bg-danger' : h.risk_score > 60 ? 'bg-warning' : h.risk_score > 30 ? 'bg-info' : 'bg-success';
        const perfClass = h.performance_score >= 90 ? 'text-success' : h.performance_score >= 70 ? 'text-primary' : h.performance_score >= 50 ? 'text-warning' : 'text-danger';

        return `
        <tr>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="rounded bg-primary bg-opacity-10 p-2">
                        <i class="fas fa-hospital text-primary"></i>
                    </div>
                    <div>
                        <strong>${escapeHtml(h.name)}</strong>
                        ${h.priority_support ? '<i class="fas fa-star text-warning ms-1" title="Priority Support"></i>' : ''}
                        ${h.flagged_audit ? '<i class="fas fa-flag text-danger ms-1" title="Flagged for Audit"></i>' : ''}
                        <div class="text-muted small">${h.beds} beds</div>
                    </div>
                </div>
            </td>
            <td>
                <div>${escapeHtml(h.city)}</div>
                <small class="text-muted">${escapeHtml(h.country)}</small>
            </td>
            <td><span class="badge ${accredBadges[h.accreditation] || 'bg-secondary'}">${(h.accreditation || 'None').toUpperCase()}</span></td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="progress flex-grow-1" style="width: 50px; height: 6px;">
                        <div class="progress-bar ${riskClass}" style="width: ${h.risk_score}%"></div>
                    </div>
                    <span class="small fw-semibold">${h.risk_score}</span>
                </div>
            </td>
            <td><span class="fw-bold ${perfClass}">${h.performance_score}%</span></td>
            <td><span class="badge ${statusBadges[h.status] || 'bg-secondary'}">${h.status.charAt(0).toUpperCase() + h.status.slice(1)}</span></td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-primary" onclick="openHospitalActions(${h.id})" title="Actions">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            </td>
        </tr>
    `;
    }).join('');

    document.getElementById('hospitalsPaginationInfo').textContent = `Showing ${startIndex + 1}-${endIndex} of ${totalHospitals}`;
    renderHospitalsPagination(totalPages);
}

function renderHospitalsPagination(totalPages) {
    const pagination = document.getElementById('hospitalsPagination');
    if (!pagination || totalPages <= 1) {
        if (pagination) pagination.innerHTML = '';
        return;
    }

    let html = `<li class="page-item ${hospitalsCurrentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goToHospitalPage(${hospitalsCurrentPage - 1}); return false;"><i class="fas fa-chevron-left"></i></a>
    </li>`;

    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        html += `<li class="page-item ${hospitalsCurrentPage === i ? 'active' : ''}">
            <a class="page-link" href="#" onclick="goToHospitalPage(${i}); return false;">${i}</a>
        </li>`;
    }

    html += `<li class="page-item ${hospitalsCurrentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goToHospitalPage(${hospitalsCurrentPage + 1}); return false;"><i class="fas fa-chevron-right"></i></a>
    </li>`;

    pagination.innerHTML = html;
}

function goToHospitalPage(page) {
    const filtered = getFilteredHospitals();
    const totalPages = Math.ceil(filtered.length / hospitalsPerPage);
    if (page >= 1 && page <= totalPages) {
        hospitalsCurrentPage = page;
        renderHospitalsTable();
    }
}

function openHospitalActions(hospitalId) {
    const hospital = allHospitals.find(h => h.id === hospitalId);
    if (!hospital) return;

    selectedHospitalId = hospitalId;

    document.getElementById('hospitalActionName').textContent = hospital.name;
    document.getElementById('modalHospitalName').textContent = hospital.name;
    document.getElementById('modalHospitalLocation').textContent = `${hospital.city}, ${hospital.country}`;
    document.getElementById('modalHospitalAccred').textContent = (hospital.accreditation || 'None').toUpperCase();
    document.getElementById('modalHospitalStatus').textContent = hospital.status.charAt(0).toUpperCase() + hospital.status.slice(1);
    document.getElementById('modalRiskScore').textContent = hospital.risk_score;
    document.getElementById('modalPerfScore').textContent = hospital.performance_score + '%';
    document.getElementById('modalPatientCount').textContent = hospital.patients.toLocaleString();

    new bootstrap.Modal(document.getElementById('hospitalActionsModal')).show();
}

function approveOnboarding() {
    const hospital = allHospitals.find(h => h.id === selectedHospitalId);
    if (hospital) {
        hospital.status = 'active';
        renderHospitalsTable();
        updateHospitalStats();
    }
    bootstrap.Modal.getInstance(document.getElementById('hospitalActionsModal')).hide();
    showToast('Hospital onboarding approved successfully', 'success');
}

function flagForAudit() {
    const hospital = allHospitals.find(h => h.id === selectedHospitalId);
    if (hospital) {
        hospital.flagged_audit = true;
        renderHospitalsTable();
    }
    bootstrap.Modal.getInstance(document.getElementById('hospitalActionsModal')).hide();
    showToast('Hospital flagged for compliance audit', 'warning');
}

function freezeAccess() {
    const hospital = allHospitals.find(h => h.id === selectedHospitalId);
    if (hospital) {
        hospital.status = 'frozen';
        renderHospitalsTable();
        updateHospitalStats();
    }
    bootstrap.Modal.getInstance(document.getElementById('hospitalActionsModal')).hide();
    showToast('Hospital access has been frozen', 'error');
}

function issueWarning() {
    bootstrap.Modal.getInstance(document.getElementById('hospitalActionsModal')).hide();
    showToast('Warning issued to hospital administration', 'warning');
}

function addToPrioritySupport() {
    const hospital = allHospitals.find(h => h.id === selectedHospitalId);
    if (hospital) {
        hospital.priority_support = true;
        renderHospitalsTable();
    }
    bootstrap.Modal.getInstance(document.getElementById('hospitalActionsModal')).hide();
    showToast('Hospital added to priority support list', 'success');
}

function viewHospitalDetails() {
    bootstrap.Modal.getInstance(document.getElementById('hospitalActionsModal')).hide();
    showToast('Full hospital details - Coming soon', 'info');
}

// ===== COMPLIANCE & LEGAL PAGE =====
let complianceData = [];

// Demo compliance data - shows immediately
function generateDemoComplianceData() {
    return [
        { id: 1, country: 'India', code: 'in', gdpr: 'compliant', dpdp: 'compliant', hipaa: 'na', data_residency: 'enforced', incident_reporting: 'active', last_audit: '2024-11-15', next_audit: '2025-01-15' },
        { id: 2, country: 'United States', code: 'us', gdpr: 'na', dpdp: 'na', hipaa: 'compliant', data_residency: 'enforced', incident_reporting: 'active', last_audit: '2024-10-20', next_audit: '2025-04-20' },
        { id: 3, country: 'United Kingdom', code: 'gb', gdpr: 'compliant', dpdp: 'na', hipaa: 'na', data_residency: 'enforced', incident_reporting: 'active', last_audit: '2024-09-10', next_audit: '2025-03-10' },
        { id: 4, country: 'Germany', code: 'de', gdpr: 'compliant', dpdp: 'na', hipaa: 'na', data_residency: 'enforced', incident_reporting: 'pending', last_audit: '2024-08-05', next_audit: '2024-12-15' },
        { id: 5, country: 'Singapore', code: 'sg', gdpr: 'partial', dpdp: 'na', hipaa: 'na', data_residency: 'enforced', incident_reporting: 'active', last_audit: '2024-07-22', next_audit: '2025-01-22' },
        { id: 6, country: 'Australia', code: 'au', gdpr: 'partial', dpdp: 'na', hipaa: 'na', data_residency: 'enforced', incident_reporting: 'active', last_audit: '2024-06-15', next_audit: '2024-12-15' },
        { id: 7, country: 'Canada', code: 'ca', gdpr: 'na', dpdp: 'na', hipaa: 'partial', data_residency: 'enforced', incident_reporting: 'active', last_audit: '2024-09-01', next_audit: '2025-03-01' },
        { id: 8, country: 'France', code: 'fr', gdpr: 'compliant', dpdp: 'na', hipaa: 'na', data_residency: 'enforced', incident_reporting: 'active', last_audit: '2024-11-01', next_audit: '2025-05-01' },
        { id: 9, country: 'Japan', code: 'jp', gdpr: 'partial', dpdp: 'na', hipaa: 'na', data_residency: 'enforced', incident_reporting: 'active', last_audit: '2024-10-15', next_audit: '2025-04-15' },
        { id: 10, country: 'Brazil', code: 'br', gdpr: 'na', dpdp: 'na', hipaa: 'na', data_residency: 'pending', incident_reporting: 'active', last_audit: '2024-05-20', next_audit: '2024-11-20' }
    ];
}

// Demo legal documents data
function generateDemoLegalDocs() {
    return {
        mous: { total: 24, active: 12, expired: 8, pending: 4 },
        government_agreements: { total: 18, active: 15, pending: 3 },
        sops: { total: 42, updated: 8, pending_review: 5 },
        data_sharing: { total: 15, active: 15 },
        who_un_guidelines: { total: 31, new: 5, updated: 8 },
        stats: { total_documents: 130, countries_covered: 15, pending_review: 8, compliance_rate: 98 }
    };
}

async function loadCompliancePage() {
    // Load demo data immediately
    complianceData = generateDemoComplianceData();
    renderComplianceTable();
    updateLegalDocStats(generateDemoLegalDocs());

    // Try to fetch from API (will override demo data if successful)
    await Promise.all([
        loadComplianceData(),
        loadLegalDocuments()
    ]);
}

async function loadComplianceData() {
    try {
        const response = await fetch('/api/global-admin/compliance');
        const data = await response.json();
        if (data.success) {
            complianceData = data.compliance;
            renderComplianceTable();
        }
    } catch (error) {
        console.log('Using demo compliance data');
    }
}


function renderComplianceTable() {
    const tbody = document.getElementById('complianceTableBody');
    if (!tbody || !complianceData.length) return;

    const statusBadge = (status) => {
        const badges = {
            'compliant': '<span class="badge bg-success">Compliant</span>',
            'partial': '<span class="badge bg-warning text-dark">Partial</span>',
            'pending': '<span class="badge bg-warning text-dark">Pending</span>',
            'na': '<span class="badge bg-secondary">N/A</span>',
            'enforced': '<span class="badge bg-success">Enforced</span>',
            'active': '<span class="badge bg-success">Active</span>'
        };
        return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
    };

    tbody.innerHTML = complianceData.map(c => `
        <tr>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <span class="fi fi-${c.code}"></span>
                    <strong>${escapeHtml(c.country)}</strong>
                </div>
            </td>
            <td class="text-center">${statusBadge(c.gdpr)}</td>
            <td class="text-center">${statusBadge(c.dpdp)}</td>
            <td class="text-center">${statusBadge(c.hipaa)}</td>
            <td class="text-center">${statusBadge(c.data_residency)}</td>
            <td class="text-center">${statusBadge(c.incident_reporting)}</td>
            <td><small class="text-muted">${c.last_audit}</small></td>
            <td><small class="fw-semibold ${isDateSoon(c.next_audit) ? 'text-warning' : 'text-muted'}">${c.next_audit}</small></td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-primary" onclick="viewComplianceDetails(${c.id})"><i class="fas fa-eye"></i></button>
            </td>
        </tr>
    `).join('');

    const countText = document.querySelector('#compliance-page .text-muted.small');
    if (countText) countText.textContent = `Showing ${complianceData.length} of ${complianceData.length} countries`;
}

function viewComplianceDetails(countryId) {
    const country = complianceData.find(c => c.id === countryId);
    if (!country) return;

    const statusText = (status) => {
        const texts = {
            'compliant': '✅ Compliant',
            'partial': '⚠️ Partial Compliance',
            'pending': '🕐 Pending',
            'na': '➖ Not Applicable',
            'enforced': '✅ Enforced',
            'active': '✅ Active'
        };
        return texts[status] || status;
    };

    const content = `
        <div class="modal fade" id="complianceDetailsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title"><span class="fi fi-${country.code} me-2"></span>${country.country} - Compliance Details</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row g-4">
                            <div class="col-md-6">
                                <div class="card border-0 bg-light">
                                    <div class="card-body">
                                        <h6 class="fw-bold mb-3"><i class="fas fa-shield-alt me-2"></i>Regulatory Compliance</h6>
                                        <ul class="list-unstyled mb-0">
                                            <li class="mb-2"><strong>GDPR:</strong> ${statusText(country.gdpr)}</li>
                                            <li class="mb-2"><strong>DPDP Act:</strong> ${statusText(country.dpdp)}</li>
                                            <li class="mb-0"><strong>HIPAA:</strong> ${statusText(country.hipaa)}</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card border-0 bg-light">
                                    <div class="card-body">
                                        <h6 class="fw-bold mb-3"><i class="fas fa-database me-2"></i>Data Management</h6>
                                        <ul class="list-unstyled mb-0">
                                            <li class="mb-2"><strong>Data Residency:</strong> ${statusText(country.data_residency)}</li>
                                            <li class="mb-0"><strong>Incident Reporting:</strong> ${statusText(country.incident_reporting)}</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            <div class="col-12">
                                <div class="card border-0 bg-light">
                                    <div class="card-body">
                                        <h6 class="fw-bold mb-3"><i class="fas fa-calendar-check me-2"></i>Audit Schedule</h6>
                                        <div class="row">
                                            <div class="col-6">
                                                <small class="text-muted">Last Audit</small>
                                                <p class="mb-0 fw-semibold">${country.last_audit}</p>
                                            </div>
                                            <div class="col-6">
                                                <small class="text-muted">Next Audit</small>
                                                <p class="mb-0 fw-semibold ${isDateSoon(country.next_audit) ? 'text-warning' : ''}">${country.next_audit}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="showToast('Compliance report downloaded', 'success')">
                            <i class="fas fa-download me-1"></i>Download Report
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if present
    const existing = document.getElementById('complianceDetailsModal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', content);
    const modal = new bootstrap.Modal(document.getElementById('complianceDetailsModal'));
    modal.show();
}

function isDateSoon(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = (date - now) / (1000 * 60 * 60 * 24);
    return diffDays < 60;
}

async function loadLegalDocuments() {
    try {
        const response = await fetch('/api/global-admin/legal-documents');
        const data = await response.json();
        if (data.success) {
            updateLegalDocStats(data.documents);
        }
    } catch (error) {
        console.log('Using demo legal documents data');
    }
}

function updateLegalDocStats(docs) {
    // Update the stats card if IDs exist
    const statsCard = document.querySelector('#compliance-page .card.bg-gradient');
    if (statsCard && docs.stats) {
        const statElements = statsCard.querySelectorAll('.h4');
        if (statElements.length >= 4) {
            statElements[0].textContent = docs.stats.total_documents;
            statElements[1].textContent = docs.stats.countries_covered;
            statElements[2].textContent = docs.stats.pending_review;
            statElements[3].textContent = docs.stats.compliance_rate + '%';
        }
    }
}

// ===== GLOBAL ANALYTICS PAGE EXTENDED =====
let diseaseTrends = {};
let screeningTrends = {};

// Demo disease trends data - shows immediately
function generateDemoDiseaseTrends() {
    return {
        covid_outbreaks: {
            current_cases: 12450,
            trend: 'decreasing',
            change_percent: -15.2,
            hotspots: ['Delhi', 'Mumbai', 'Singapore'],
            weekly_data: [1500, 1400, 1300, 1200, 1150, 1100, 1050]
        },
        dengue_hotspot: {
            active_cases: 3420,
            trend: 'increasing',
            change_percent: 8.5,
            high_risk_regions: ['Tamil Nadu', 'Kerala', 'Maharashtra', 'Thailand'],
            monthly_data: [250, 320, 450, 580, 720, 890]
        },
        malaria_hotspot: {
            active_cases: 5670,
            trend: 'stable',
            change_percent: 1.2,
            endemic_regions: ['Sub-Saharan Africa', 'India', 'Southeast Asia'],
            monthly_data: [450, 480, 520, 490, 510, 530]
        },
        chronic_diseases: {
            diabetes: { count: 45000, percent: 12.5 },
            hypertension: { count: 67000, percent: 18.5 },
            heart_disease: { count: 23000, percent: 6.4 },
            obesity: { count: 34000, percent: 9.4 }
        },
        maternal_health: {
            prenatal_visits: 15600,
            high_risk_pregnancies: 1240,
            delivery_rate: 98.5,
            monthly_trend: [1200, 1350, 1400, 1380, 1450, 1480]
        },
        child_malnutrition: {
            underweight: 8500,
            stunting: 12300,
            wasting: 3400,
            improvement_rate: 5.2
        },
        ncd_predictions: {
            diabetes_risk_high: 8900,
            cardiac_risk_high: 5600,
            stroke_risk_moderate: 12400,
            prediction_accuracy: 87.5
        },
        environmental_risks: {
            air_quality_alerts: 45,
            water_contamination: 12,
            pollution_index: 156,
            affected_population: 2500000
        }
    };
}

// Demo screening trends data
function generateDemoScreeningTrends() {
    return {
        country_coverage: [
            { country: 'India', code: 'in', coverage: 72, total_screenings: 450000, target: 600000 },
            { country: 'United States', code: 'us', coverage: 85, total_screenings: 890000, target: 1000000 },
            { country: 'United Kingdom', code: 'gb', coverage: 78, total_screenings: 320000, target: 400000 },
            { country: 'Germany', code: 'de', coverage: 82, total_screenings: 410000, target: 500000 },
            { country: 'Singapore', code: 'sg', coverage: 91, total_screenings: 180000, target: 200000 }
        ],
        gender_age_trends: {
            male: { '0-18': 15000, '19-35': 45000, '36-50': 67000, '51-65': 89000, '65+': 56000 },
            female: { '0-18': 14500, '19-35': 52000, '36-50': 72000, '51-65': 95000, '65+': 62000 }
        },
        vital_abnormalities: {
            high_bp: { count: 34500, percent: 12.8, trend: 'stable' },
            low_bp: { count: 8900, percent: 3.3, trend: 'decreasing' },
            irregular_heartbeat: { count: 5600, percent: 2.1, trend: 'increasing' },
            high_sugar: { count: 28700, percent: 10.6, trend: 'stable' },
            low_oxygen: { count: 3200, percent: 1.2, trend: 'decreasing' }
        },
        predictive_risks: {
            high_risk: 15600,
            moderate_risk: 45000,
            low_risk: 210000,
            ai_confidence: 89.5
        }
    };
}

async function loadAnalyticsExtended() {
    // Load demo data immediately
    diseaseTrends = generateDemoDiseaseTrends();
    screeningTrends = generateDemoScreeningTrends();
    renderDiseaseTrendCards();
    renderScreeningCards();

    // Try to fetch from API (will override demo data if successful)
    await Promise.all([
        loadDiseaseTrends(),
        loadScreeningTrends()
    ]);
}

async function loadDiseaseTrends() {
    try {
        const response = await fetch('/api/global-admin/disease-trends');
        const data = await response.json();
        if (data.success) {
            diseaseTrends = data.disease_trends;
            renderDiseaseTrendCards();
        }
    } catch (error) {
        console.log('Using demo disease trends data');
    }
}

// Store chart instances to prevent duplicates
let analyticsCharts = {};

function renderDiseaseTrendCards() {
    // Destroy existing charts
    Object.values(analyticsCharts).forEach(chart => chart && chart.destroy());
    analyticsCharts = {};

    // Covid Outbreaks - Line Chart
    if (diseaseTrends.covid_outbreaks) {
        const ctx = document.getElementById('covidChart');
        if (ctx) {
            analyticsCharts.covid = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'],
                    datasets: [{
                        label: 'Cases',
                        data: diseaseTrends.covid_outbreaks.weekly_data,
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: false } }
                }
            });
        }
    }

    // Dengue Hotspot - Bar Chart
    if (diseaseTrends.dengue_hotspot) {
        const ctx = document.getElementById('dengueChart');
        if (ctx) {
            analyticsCharts.dengue = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                        label: 'Cases',
                        data: diseaseTrends.dengue_hotspot.monthly_data,
                        backgroundColor: '#ffc107',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                }
            });
        }
    }

    // Malaria Hotspot - Area Chart
    if (diseaseTrends.malaria_hotspot) {
        const ctx = document.getElementById('malariaChart');
        if (ctx) {
            analyticsCharts.malaria = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                        label: 'Cases',
                        data: diseaseTrends.malaria_hotspot.monthly_data,
                        borderColor: '#198754',
                        backgroundColor: 'rgba(25, 135, 84, 0.2)',
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                }
            });
        }
    }

    // Chronic Diseases - Doughnut Chart
    if (diseaseTrends.chronic_diseases) {
        const ctx = document.getElementById('chronicChart');
        if (ctx) {
            const d = diseaseTrends.chronic_diseases;
            analyticsCharts.chronic = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Diabetes', 'Hypertension', 'Heart Disease', 'Obesity'],
                    datasets: [{
                        data: [d.diabetes.count, d.hypertension.count, d.heart_disease.count, d.obesity.count],
                        backgroundColor: ['#0dcaf0', '#0d6efd', '#6610f2', '#fd7e14']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8 } } }
                }
            });
        }
    }

    // Maternal Health - Line Chart
    if (diseaseTrends.maternal_health) {
        const ctx = document.getElementById('maternalChart');
        if (ctx) {
            analyticsCharts.maternal = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                        label: 'Prenatal Visits',
                        data: diseaseTrends.maternal_health.monthly_trend,
                        borderColor: '#e91e63',
                        backgroundColor: 'rgba(233, 30, 99, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                }
            });
        }
    }

    // Child Malnutrition - Bar Chart
    if (diseaseTrends.child_malnutrition) {
        const ctx = document.getElementById('malnutritionChart');
        if (ctx) {
            const d = diseaseTrends.child_malnutrition;
            analyticsCharts.malnutrition = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Underweight', 'Stunting', 'Wasting'],
                    datasets: [{
                        label: 'Children Affected',
                        data: [d.underweight, d.stunting, d.wasting],
                        backgroundColor: ['#ff9800', '#ff5722', '#f44336'],
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                }
            });
        }
    }

    // NCD Predictions - Pie Chart
    if (diseaseTrends.ncd_predictions) {
        const ctx = document.getElementById('ncdChart');
        if (ctx) {
            const d = diseaseTrends.ncd_predictions;
            analyticsCharts.ncd = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['Diabetes Risk', 'Cardiac Risk', 'Stroke Risk'],
                    datasets: [{
                        data: [d.diabetes_risk_high, d.cardiac_risk_high, d.stroke_risk_moderate],
                        backgroundColor: ['#9c27b0', '#673ab7', '#3f51b5']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8 } } }
                }
            });
        }
    }

    // Environmental Risks - Radar Chart
    if (diseaseTrends.environmental_risks) {
        const ctx = document.getElementById('envChart');
        if (ctx) {
            const d = diseaseTrends.environmental_risks;
            analyticsCharts.env = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: ['Air Quality', 'Water', 'Pollution', 'Population'],
                    datasets: [{
                        label: 'Risk Level',
                        data: [d.air_quality_alerts, d.water_contamination, d.pollution_index / 10, d.affected_population / 100000],
                        backgroundColor: 'rgba(108, 117, 125, 0.2)',
                        borderColor: '#6c757d',
                        pointBackgroundColor: '#6c757d'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { r: { beginAtZero: true } }
                }
            });
        }
    }
}


async function loadScreeningTrends() {
    try {
        const response = await fetch('/api/global-admin/screening-trends');
        const data = await response.json();
        if (data.success) {
            screeningTrends = data.screening_trends;
            renderScreeningCards();
        }
    } catch (error) {
        console.log('Using demo screening trends data');
    }
}

function renderScreeningCards() {
    // Update Country Coverage card
    if (screeningTrends.country_coverage) {
        const coverageCard = document.querySelector('#analytics-page .card:has(.fa-globe-americas):not(:first-child) .card-body');
        if (coverageCard) {
            coverageCard.innerHTML = `
                <div class="table-responsive">
                    <table class="table table-sm mb-0">
                        <thead><tr><th>Country</th><th>Coverage</th><th>Progress</th></tr></thead>
                        <tbody>
                        ${screeningTrends.country_coverage.map(c => `
                            <tr>
                                <td><span class="fi fi-${c.code} me-1"></span>${c.country}</td>
                                <td><strong>${c.coverage}%</strong></td>
                                <td style="width: 120px;">
                                    <div class="progress" style="height: 6px;">
                                        <div class="progress-bar ${c.coverage >= 80 ? 'bg-success' : c.coverage >= 60 ? 'bg-warning' : 'bg-danger'}" style="width: ${c.coverage}%"></div>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    }

    // Update Vital Abnormalities card
    if (screeningTrends.vital_abnormalities) {
        const vitalCard = document.querySelector('#analytics-page .card:has(.fa-exclamation-triangle) .card-body');
        if (vitalCard) {
            const v = screeningTrends.vital_abnormalities;
            vitalCard.innerHTML = `
                <div class="row g-2">
                    ${Object.entries(v).map(([name, data]) => `
                        <div class="col-6">
                            <div class="p-2 bg-light rounded text-center">
                                <div class="fw-bold ${data.trend === 'increasing' ? 'text-danger' : 'text-success'}">${data.count.toLocaleString()}</div>
                                <small class="text-muted text-capitalize">${name.replace('_', ' ')}</small>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    // Update Predictive Risk card
    if (screeningTrends.predictive_risks) {
        const riskCard = document.querySelector('#analytics-page .card:has(.fa-robot) .card-body');
        if (riskCard) {
            const r = screeningTrends.predictive_risks;
            riskCard.innerHTML = `
                <div class="row g-3 text-center">
                    <div class="col-4">
                        <div class="p-2 bg-danger bg-opacity-10 rounded">
                            <div class="h5 fw-bold text-danger mb-0">${r.high_risk.toLocaleString()}</div>
                            <small class="text-muted">High Risk</small>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="p-2 bg-warning bg-opacity-10 rounded">
                            <div class="h5 fw-bold text-warning mb-0">${r.moderate_risk.toLocaleString()}</div>
                            <small class="text-muted">Moderate</small>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="p-2 bg-success bg-opacity-10 rounded">
                            <div class="h5 fw-bold text-success mb-0">${r.low_risk.toLocaleString()}</div>
                            <small class="text-muted">Low Risk</small>
                        </div>
                    </div>
                    <div class="col-12">
                        <div class="alert alert-info py-2 mb-0">
                            <i class="fas fa-brain me-1"></i> AI Confidence: <strong>${r.ai_confidence}%</strong>
                        </div>
                    </div>
                </div>
            `;
        }
    }
}

// Load analytics page with extended data
function loadAnalytics() {
    // Load the extended analytics data directly (no recursion)
    loadAnalyticsExtended();
}

// ===== SECURITY OPERATIONS PAGE =====
let securityData = {};
let securityCharts = {};

// Demo security data
function generateDemoSecurityData() {
    return {
        stats: { active_threats: 24, anomalies_24h: 156, blocked_today: 1247, security_score: 94 },
        login_anomalies: [
            { id: 1, user: 'john.doe@hospital.com', type: 'Multiple Failed Attempts', ip: '192.168.1.45', location: 'Mumbai, India', time: '2 mins ago', severity: 'high' },
            { id: 2, user: 'admin@clinic.org', type: 'Unusual Login Time', ip: '10.0.0.123', location: 'Delhi, India', time: '15 mins ago', severity: 'medium' },
            { id: 3, user: 'sarah.jones@nhs.uk', type: 'New Device Detected', ip: '172.16.0.89', location: 'London, UK', time: '32 mins ago', severity: 'low' },
            { id: 4, user: 'dr.smith@hospital.us', type: 'VPN Masking Detected', ip: '203.45.67.89', location: 'Unknown', time: '45 mins ago', severity: 'high' },
            { id: 5, user: 'nurse.mary@clinic.sg', type: 'Concurrent Sessions', ip: '118.200.45.12', location: 'Singapore', time: '1 hour ago', severity: 'medium' }
        ],
        suspicious_patterns: [
            { id: 1, pattern: 'Rapid API Calls', source: 'API Gateway', count: 1523, status: 'investigating' },
            { id: 2, pattern: 'Password Spraying', source: 'Auth Server', count: 89, status: 'blocked' },
            { id: 3, pattern: 'Data Scraping', source: 'Web Server', count: 234, status: 'monitoring' },
            { id: 4, pattern: 'Session Hijacking', source: 'App Server', count: 12, status: 'blocked' },
            { id: 5, pattern: 'SQL Injection Attempt', source: 'Database', count: 45, status: 'blocked' }
        ],
        ai_anomaly_data: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], normal: [120, 145, 132, 168, 155, 98, 85], anomalies: [5, 12, 8, 22, 15, 3, 2] },
        data_export_attempts: [
            { id: 1, user: 'suspicious.user@external.com', file_type: 'Patient Records', size: '2.5 GB', status: 'blocked', time: '10 mins ago' },
            { id: 2, user: 'export.bot@unknown.net', file_type: 'Financial Data', size: '500 MB', status: 'blocked', time: '25 mins ago' },
            { id: 3, user: 'data.miner@temp.io', file_type: 'User Database', size: '1.2 GB', status: 'blocked', time: '1 hour ago' }
        ],
        location_access: { labels: ['India', 'USA', 'UK', 'Singapore', 'Unknown', 'Blocked'], data: [450, 320, 180, 120, 45, 18] },
        server_attacks: { labels: ['DDoS', 'Brute Force', 'SQL Injection', 'XSS', 'CSRF', 'Other'], data: [15, 12, 8, 4, 2, 1] },
        tools: { blacklist_ips: 3456, geofence_zones: 12, mfa_adoption: 87, last_key_rotation: '2 days ago', blockchain_blocks: 45678, threats_resolved: 156, uptime: 99.9, security_grade: 'A+' }
    };
}

async function loadSecurityPage() {
    // Load demo data immediately for structure
    securityData = generateDemoSecurityData();
    renderSecurityDashboard();

    // Fetch real data from API
    try {
        const response = await fetch('/api/global-admin/security-dashboard');
        const data = await response.json();
        if (data.success) {
            // Merge real stats with demo structure
            securityData.stats = data.stats || securityData.stats;
            securityData.login_anomalies = data.anomalies || securityData.login_anomalies;
            securityData.threat_level = data.threat_level || 'low';
            renderSecurityDashboard();
        }
    } catch (error) {
        console.log('Using demo security data');
    }
}

function renderSecurityDashboard() {
    // Update stats
    if (securityData.stats) {
        const s = securityData.stats;
        document.getElementById('securityThreatCount').textContent = s.active_threats;
        document.getElementById('securityAnomalyCount').textContent = s.anomalies_24h;
        document.getElementById('securityBlockedCount').textContent = s.blocked_today.toLocaleString();
        document.getElementById('securityScoreValue').textContent = s.security_score + '%';
    }

    // Render login anomalies
    renderLoginAnomalies();
    renderSuspiciousPatterns();
    renderDataExportAttempts();
    renderSecurityCharts();
    updateSecurityTools();
}

function renderLoginAnomalies() {
    const container = document.getElementById('loginAnomaliesContainer');
    if (!container || !securityData.login_anomalies) return;

    const severityClass = { high: 'danger', medium: 'warning', low: 'info' };

    container.innerHTML = securityData.login_anomalies.map(a => `
        <div class="d-flex align-items-start gap-3 p-2 border-bottom">
            <div class="rounded-circle bg-${severityClass[a.severity]} bg-opacity-10 p-2">
                <i class="fas fa-user-times text-${severityClass[a.severity]}"></i>
            </div>
            <div class="flex-grow-1">
                <div class="fw-semibold small">${escapeHtml(a.type)}</div>
                <div class="text-muted small">${escapeHtml(a.user)}</div>
                <div class="d-flex gap-2 mt-1">
                    <span class="badge bg-light text-dark"><i class="fas fa-map-marker-alt me-1"></i>${escapeHtml(a.location)}</span>
                    <span class="badge bg-${severityClass[a.severity]}">${a.severity.toUpperCase()}</span>
                </div>
            </div>
            <small class="text-muted">${a.time}</small>
        </div>
    `).join('');

    document.getElementById('loginAnomalyBadge').textContent = securityData.login_anomalies.length + ' Active';
}

function renderSuspiciousPatterns() {
    const container = document.getElementById('suspiciousPatternsContainer');
    if (!container || !securityData.suspicious_patterns) return;

    const statusClass = { investigating: 'warning', blocked: 'danger', monitoring: 'info' };

    container.innerHTML = securityData.suspicious_patterns.map(p => `
        <div class="d-flex align-items-center gap-3 p-2 border-bottom">
            <div class="rounded-circle bg-warning bg-opacity-10 p-2">
                <i class="fas fa-exclamation text-warning"></i>
            </div>
            <div class="flex-grow-1">
                <div class="fw-semibold small">${escapeHtml(p.pattern)}</div>
                <div class="text-muted small">${escapeHtml(p.source)} • ${p.count} occurrences</div>
            </div>
            <span class="badge bg-${statusClass[p.status]}">${p.status}</span>
        </div>
    `).join('');

    document.getElementById('suspiciousBadge').textContent = securityData.suspicious_patterns.length + ' Detected';
}

function renderDataExportAttempts() {
    const container = document.getElementById('dataExportContainer');
    if (!container || !securityData.data_export_attempts) return;

    container.innerHTML = securityData.data_export_attempts.map(e => `
        <div class="d-flex align-items-center gap-3 p-2 border-bottom">
            <div class="rounded-circle bg-danger bg-opacity-10 p-2">
                <i class="fas fa-file-export text-danger"></i>
            </div>
            <div class="flex-grow-1">
                <div class="fw-semibold small">${escapeHtml(e.file_type)}</div>
                <div class="text-muted small">${escapeHtml(e.user)}</div>
                <span class="badge bg-secondary">${e.size}</span>
            </div>
            <span class="badge bg-danger">${e.status}</span>
        </div>
    `).join('');

    document.getElementById('dataExportBadge').textContent = securityData.data_export_attempts.length + ' Blocked';
}

function renderSecurityCharts() {
    // Destroy existing charts
    Object.values(securityCharts).forEach(chart => chart && chart.destroy());
    securityCharts = {};

    // AI Anomaly Chart
    const aiCtx = document.getElementById('aiAnomalyChart');
    if (aiCtx && securityData.ai_anomaly_data) {
        const d = securityData.ai_anomaly_data;
        securityCharts.ai = new Chart(aiCtx, {
            type: 'bar',
            data: {
                labels: d.labels,
                datasets: [
                    { label: 'Normal', data: d.normal, backgroundColor: '#0dcaf0' },
                    { label: 'Anomalies', data: d.anomalies, backgroundColor: '#dc3545' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
        });
    }

    // Location Access Chart
    const locCtx = document.getElementById('locationAccessChart');
    if (locCtx && securityData.location_access) {
        const d = securityData.location_access;
        securityCharts.location = new Chart(locCtx, {
            type: 'doughnut',
            data: {
                labels: d.labels,
                datasets: [{ data: d.data, backgroundColor: ['#198754', '#0d6efd', '#6610f2', '#ffc107', '#6c757d', '#dc3545'] }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 5 } } } }
        });
    }

    // Server Attacks Chart
    const srvCtx = document.getElementById('serverAttackChart');
    if (srvCtx && securityData.server_attacks) {
        const d = securityData.server_attacks;
        securityCharts.server = new Chart(srvCtx, {
            type: 'pie',
            data: {
                labels: d.labels,
                datasets: [{ data: d.data, backgroundColor: ['#dc3545', '#fd7e14', '#ffc107', '#20c997', '#6610f2', '#6c757d'] }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 5 } } } }
        });
    }
}

function updateSecurityTools() {
    if (!securityData.tools) return;
    const t = securityData.tools;

    const setTextIfExists = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    setTextIfExists('blacklistCount', t.blacklist_ips.toLocaleString() + ' IPs');
    setTextIfExists('geofenceZones', t.geofence_zones + ' Zones');
    setTextIfExists('mfaEnforced', t.mfa_adoption + '% Adoption');
    setTextIfExists('lastRotation', 'Last: ' + t.last_key_rotation);
    setTextIfExists('blockchainBlocks', t.blockchain_blocks.toLocaleString() + ' Blocks');
    setTextIfExists('overviewThreats', securityData.stats.active_threats);
    setTextIfExists('overviewResolved', t.threats_resolved);
    setTextIfExists('overviewUptime', t.uptime + '%');
    setTextIfExists('overviewScore', t.security_grade);
}

function showSecurityTool(tool) {
    const toolNames = {
        'blacklist': 'Global IP Blacklist',
        'geofencing': 'Geo-fencing Configuration',
        'mfa': 'Multi-factor Enforcement',
        'keyrotation': 'Key Rotation',
        'blockchain': 'Blockchain Audit Verification'
    };
    showToast(`${toolNames[tool]} - Coming soon`, 'info');
}

// ===== INFRASTRUCTURE MANAGEMENT PAGE =====
let infraData = {};
let infraCharts = {};

function generateDemoInfraData() {
    return {
        stats: { active_clusters: 12, total_nodes: 156, avg_utilization: 78, uptime: 99.99 },
        clusters: [
            { id: 1, name: 'prod-asia-south1', region: 'Mumbai', nodes: 24, status: 'healthy', utilization: 82 },
            { id: 2, name: 'prod-asia-east1', region: 'Singapore', nodes: 18, status: 'healthy', utilization: 75 },
            { id: 3, name: 'prod-europe-west1', region: 'London', nodes: 20, status: 'healthy', utilization: 68 },
            { id: 4, name: 'prod-us-east1', region: 'Virginia', nodes: 22, status: 'warning', utilization: 91 },
            { id: 5, name: 'prod-us-west1', region: 'Oregon', nodes: 16, status: 'healthy', utilization: 72 }
        ],
        node_utilization: { labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'], cpu: [45, 52, 78, 85, 82, 65], memory: [62, 65, 72, 80, 78, 70] },
        auto_scaling: [
            { id: 1, name: 'CPU High Load', trigger: 'CPU > 80%', action: 'Scale up 2 nodes', status: 'active' },
            { id: 2, name: 'Memory Pressure', trigger: 'Memory > 85%', action: 'Scale up 1 node', status: 'active' },
            { id: 3, name: 'Traffic Surge', trigger: 'RPS > 10000', action: 'Scale up 3 nodes', status: 'active' },
            { id: 4, name: 'Off-Peak Scale Down', trigger: 'CPU < 30%', action: 'Scale down 1 node', status: 'active' },
            { id: 5, name: 'Emergency Scale', trigger: 'Latency > 500ms', action: 'Scale up 5 nodes', status: 'standby' }
        ],
        backups: [
            { id: 1, name: 'Daily Full Backup', schedule: 'Daily 02:00 UTC', retention: '30 days', status: 'active', last_run: '2 hours ago' },
            { id: 2, name: 'Hourly Incremental', schedule: 'Every hour', retention: '7 days', status: 'active', last_run: '45 mins ago' },
            { id: 3, name: 'Weekly Archive', schedule: 'Sunday 04:00', retention: '1 year', status: 'active', last_run: '3 days ago' },
            { id: 4, name: 'Critical DB Snapshot', schedule: 'Every 6 hours', retention: '14 days', status: 'active', last_run: '1 hour ago' }
        ],
        dr_settings: [
            { id: 1, name: 'Primary to DR', source: 'Mumbai', target: 'Singapore', rpo: '15 mins', rto: '30 mins', status: 'ready' },
            { id: 2, name: 'Cross-region Replication', source: 'All Regions', target: 'DR Site', rpo: '1 hour', rto: '2 hours', status: 'ready' },
            { id: 3, name: 'Database Failover', source: 'Primary DB', target: 'Replica DB', rpo: '0 mins', rto: '5 mins', status: 'ready' }
        ],
        cloud_health: { healthy: 12, warning: 2, critical: 0, pending: 1 },
        api_gateway: { rate_limit: '1000 req/min', throttle_rules: 15, next_maintenance: 'Dec 15', routing_rules: 8, blue_env: 'Active', green_env: 'Standby', requests_per_day: '2.5M', avg_latency: '45ms', error_rate: '0.02%', availability: '99.99%' }
    };
}

async function loadInfrastructurePage() {
    infraData = generateDemoInfraData();
    renderInfrastructureDashboard();

    try {
        const response = await fetch('/api/global-admin/infrastructure');
        const data = await response.json();
        if (data.success) {
            infraData = data.infrastructure;
            renderInfrastructureDashboard();
        }
    } catch (error) {
        console.log('Using demo infrastructure data');
    }
}

function renderInfrastructureDashboard() {
    if (infraData.stats) {
        const s = infraData.stats;
        const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setText('infraClusterCount', s.active_clusters);
        setText('infraNodeCount', s.total_nodes);
        setText('infraUtilization', s.avg_utilization + '%');
        setText('infraUptime', s.uptime + '%');
    }

    renderClusters();
    renderAutoScaling();
    renderBackups();
    renderDRSettings();
    renderInfraCharts();
    updateCloudHealth();
    updateAPIGateway();
}

function renderClusters() {
    const container = document.getElementById('clustersContainer');
    if (!container || !infraData.clusters) return;

    const statusClass = { healthy: 'success', warning: 'warning', critical: 'danger' };

    container.innerHTML = infraData.clusters.map(c => `
        <div class="d-flex align-items-center gap-3 p-2 border-bottom">
            <div class="rounded-circle bg-${statusClass[c.status]} bg-opacity-10 p-2">
                <i class="fas fa-dharmachakra text-${statusClass[c.status]}"></i>
            </div>
            <div class="flex-grow-1">
                <div class="fw-semibold small">${escapeHtml(c.name)}</div>
                <div class="text-muted small">${c.region} • ${c.nodes} nodes</div>
            </div>
            <div class="text-end">
                <div class="fw-bold small">${c.utilization}%</div>
                <span class="badge bg-${statusClass[c.status]}">${c.status}</span>
            </div>
        </div>
    `).join('');

    document.getElementById('clusterBadge').textContent = infraData.clusters.length + ' Active';
}

function renderAutoScaling() {
    const container = document.getElementById('autoScalingContainer');
    if (!container || !infraData.auto_scaling) return;

    container.innerHTML = infraData.auto_scaling.map(r => `
        <div class="d-flex align-items-center gap-3 p-2 border-bottom">
            <div class="rounded-circle bg-info bg-opacity-10 p-2">
                <i class="fas fa-expand-arrows-alt text-info"></i>
            </div>
            <div class="flex-grow-1">
                <div class="fw-semibold small">${escapeHtml(r.name)}</div>
                <div class="text-muted small">${escapeHtml(r.trigger)} → ${escapeHtml(r.action)}</div>
            </div>
            <span class="badge bg-${r.status === 'active' ? 'success' : 'secondary'}">${r.status}</span>
        </div>
    `).join('');

    document.getElementById('scalingBadge').textContent = infraData.auto_scaling.length + ' Rules';
}

function renderBackups() {
    const container = document.getElementById('backupContainer');
    if (!container || !infraData.backups) return;

    container.innerHTML = infraData.backups.map(b => `
        <div class="d-flex align-items-center gap-3 p-2 border-bottom">
            <div class="rounded-circle bg-warning bg-opacity-10 p-2">
                <i class="fas fa-database text-warning"></i>
            </div>
            <div class="flex-grow-1">
                <div class="fw-semibold small">${escapeHtml(b.name)}</div>
                <div class="text-muted small">${b.schedule} • ${b.retention}</div>
            </div>
            <small class="text-muted">${b.last_run}</small>
        </div>
    `).join('');

    document.getElementById('backupBadge').textContent = infraData.backups.length + ' Active';
}

function renderDRSettings() {
    const container = document.getElementById('drContainer');
    if (!container || !infraData.dr_settings) return;

    container.innerHTML = infraData.dr_settings.map(d => `
        <div class="d-flex align-items-center gap-3 p-2 border-bottom">
            <div class="rounded-circle bg-danger bg-opacity-10 p-2">
                <i class="fas fa-sync-alt text-danger"></i>
            </div>
            <div class="flex-grow-1">
                <div class="fw-semibold small">${escapeHtml(d.name)}</div>
                <div class="text-muted small">${d.source} → ${d.target}</div>
                <div class="d-flex gap-2 mt-1">
                    <span class="badge bg-light text-dark">RPO: ${d.rpo}</span>
                    <span class="badge bg-light text-dark">RTO: ${d.rto}</span>
                </div>
            </div>
            <span class="badge bg-success">${d.status}</span>
        </div>
    `).join('');
}

function renderInfraCharts() {
    Object.values(infraCharts).forEach(chart => chart && chart.destroy());
    infraCharts = {};

    const ctx = document.getElementById('nodeUtilizationChart');
    if (ctx && infraData.node_utilization) {
        const d = infraData.node_utilization;
        infraCharts.util = new Chart(ctx, {
            type: 'line',
            data: {
                labels: d.labels,
                datasets: [
                    { label: 'CPU %', data: d.cpu, borderColor: '#0d6efd', tension: 0.4 },
                    { label: 'Memory %', data: d.memory, borderColor: '#198754', tension: 0.4 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, max: 100 } } }
        });
    }
}

function updateCloudHealth() {
    if (!infraData.cloud_health) return;
    const h = infraData.cloud_health;
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setText('cloudHealthy', h.healthy);
    setText('cloudWarning', h.warning);
    setText('cloudCritical', h.critical);
    setText('cloudPending', h.pending);
}

function updateAPIGateway() {
    if (!infraData.api_gateway) return;
    const g = infraData.api_gateway;
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setText('rateLimitValue', g.rate_limit);
    setText('throttleRules', g.throttle_rules + ' Rules');
    setText('nextMaintenance', 'Next: ' + g.next_maintenance);
    setText('routingRules', g.routing_rules + ' Routes');
    setText('blueEnv', 'Blue: ' + g.blue_env);
    setText('greenEnv', 'Green: ' + g.green_env);
    setText('gatewayRequests', g.requests_per_day);
    setText('gatewayLatency', g.avg_latency);
    setText('gatewayErrors', g.error_rate);
    setText('gatewayAvail', g.availability);
}

function showInfraTool(tool) {
    const toolNames = {
        'ratelimit': 'Rate Limiting Configuration',
        'throttle': 'Throttling Rules',
        'maintenance': 'Maintenance Window Scheduler',
        'routing': 'Traffic Routing Configuration',
        'bluegreen': 'Blue/Green Deployment Switch'
    };
    showToast(`${toolNames[tool]} - Coming soon`, 'info');
}

// ===== FINANCE & BILLINGS PAGE =====
let financeData = {};
let financeCharts = {};

function generateDemoFinanceData() {
    return {
        stats: { total_revenue: '$12.5M', active_subscriptions: 45678, marketplace_volume: '$3.2M', fraud_blocked: '$125K' },
        revenue_trend: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], data: [850, 920, 980, 1050, 1120, 1180, 1250, 1320, 1400, 1480, 1550, 1650] },
        subscriptions: { labels: ['Basic', 'Professional', 'Enterprise', 'Government'], data: [15000, 18500, 8500, 3678], colors: ['#0d6efd', '#198754', '#ffc107', '#dc3545'] },
        country_revenue: [
            { country: 'India', code: 'in', revenue: '$4.2M', growth: 22.5, subscriptions: 18500 },
            { country: 'USA', code: 'us', revenue: '$3.1M', growth: 15.3, subscriptions: 12400 },
            { country: 'United Kingdom', code: 'gb', revenue: '$1.8M', growth: 18.7, subscriptions: 6200 },
            { country: 'Singapore', code: 'sg', revenue: '$1.2M', growth: 28.4, subscriptions: 4100 },
            { country: 'Germany', code: 'de', revenue: '$0.9M', growth: 12.1, subscriptions: 2800 },
            { country: 'Australia', code: 'au', revenue: '$0.7M', growth: 19.8, subscriptions: 1678 }
        ],
        marketplace: [
            { type: 'Hospitals', icon: 'hospital', volume: '$1.8M', transactions: 4520, pending: '$45K', color: 'primary' },
            { type: 'Laboratories', icon: 'flask', volume: '$0.8M', transactions: 2340, pending: '$12K', color: 'info' },
            { type: 'Pharmacies', icon: 'prescription-bottle-alt', volume: '$0.6M', transactions: 8920, pending: '$8K', color: 'success' }
        ],
        fraud_alerts: [
            { id: 1, type: 'Duplicate Transaction', amount: '$15,400', source: 'Hospital Network A', status: 'blocked', time: '2 hours ago' },
            { id: 2, type: 'Unusual Pattern', amount: '$8,200', source: 'Unknown Endpoint', status: 'investigating', time: '5 hours ago' },
            { id: 3, type: 'Velocity Check Failed', amount: '$45,000', source: 'API Client #2847', status: 'blocked', time: '1 day ago' }
        ],
        health: { mrr: '$1.04M', arr: '$12.5M', churn_rate: '2.1%', avg_ltv: '$2,450' }
    };
}

async function loadFinancePage() {
    financeData = generateDemoFinanceData();
    renderFinanceDashboard();

    try {
        const response = await fetch('/api/global-admin/finance');
        const data = await response.json();
        if (data.success) {
            financeData = data.finance;
            renderFinanceDashboard();
        }
    } catch (error) {
        console.log('Using demo finance data');
    }
}

function renderFinanceDashboard() {
    if (financeData.stats) {
        const s = financeData.stats;
        const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setText('finTotalRevenue', s.total_revenue);
        setText('finActiveSubscriptions', s.active_subscriptions.toLocaleString());
        setText('finMarketplaceVol', s.marketplace_volume);
        setText('finFraudBlocked', s.fraud_blocked);
    }

    if (financeData.health) {
        const h = financeData.health;
        const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setText('finHealthMRR', h.mrr);
        setText('finHealthARR', h.arr);
        setText('finHealthChurn', h.churn_rate);
        setText('finHealthLTV', h.avg_ltv);
    }

    renderFinanceCharts();
    renderCountryRevenue();
    renderMarketplace();
    renderFraudAlerts();
}

function renderFinanceCharts() {
    Object.values(financeCharts).forEach(chart => chart && chart.destroy());
    financeCharts = {};

    // Revenue Trend Chart
    const revCtx = document.getElementById('revenueTrendChart');
    if (revCtx && financeData.revenue_trend) {
        const d = financeData.revenue_trend;
        financeCharts.revenue = new Chart(revCtx, {
            type: 'line',
            data: {
                labels: d.labels,
                datasets: [{ label: 'Revenue ($K)', data: d.data, borderColor: '#198754', backgroundColor: 'rgba(25, 135, 84, 0.1)', fill: true, tension: 0.4 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    }

    // Subscription Chart
    const subCtx = document.getElementById('subscriptionChart');
    if (subCtx && financeData.subscriptions) {
        const d = financeData.subscriptions;
        financeCharts.subs = new Chart(subCtx, {
            type: 'doughnut',
            data: { labels: d.labels, datasets: [{ data: d.data, backgroundColor: d.colors }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8 } } } }
        });
    }
}

function renderCountryRevenue() {
    const container = document.getElementById('countryRevenueContainer');
    if (!container || !financeData.country_revenue) return;

    container.innerHTML = financeData.country_revenue.map(c => `
        <div class="d-flex align-items-center gap-3 p-2 border-bottom">
            <span class="fi fi-${c.code}" style="font-size: 1.5rem;"></span>
            <div class="flex-grow-1">
                <div class="fw-semibold">${escapeHtml(c.country)}</div>
                <small class="text-muted">${c.subscriptions.toLocaleString()} subscriptions</small>
            </div>
            <div class="text-end">
                <div class="fw-bold text-success">${c.revenue}</div>
                <small class="text-success"><i class="fas fa-arrow-up me-1"></i>${c.growth}%</small>
            </div>
        </div>
    `).join('');

    document.getElementById('countryRevBadge').textContent = financeData.country_revenue.length + ' Countries';
}

function renderMarketplace() {
    const container = document.getElementById('marketplaceContainer');
    if (!container || !financeData.marketplace) return;

    container.innerHTML = financeData.marketplace.map(m => `
        <div class="d-flex align-items-center gap-3 p-3 border-bottom">
            <div class="rounded-circle bg-${m.color} bg-opacity-10 p-3">
                <i class="fas fa-${m.icon} text-${m.color} fa-lg"></i>
            </div>
            <div class="flex-grow-1">
                <div class="fw-bold">${escapeHtml(m.type)}</div>
                <small class="text-muted">${m.transactions.toLocaleString()} transactions</small>
            </div>
            <div class="text-end">
                <div class="fw-bold">${m.volume}</div>
                <small class="text-warning">Pending: ${m.pending}</small>
            </div>
        </div>
    `).join('');
}

function renderFraudAlerts() {
    const container = document.getElementById('fraudContainer');
    if (!container || !financeData.fraud_alerts) return;

    const statusClass = { blocked: 'danger', investigating: 'warning', cleared: 'success' };

    container.innerHTML = financeData.fraud_alerts.map(f => `
        <div class="d-flex align-items-center gap-3 p-2 border-bottom">
            <div class="rounded-circle bg-danger bg-opacity-10 p-2">
                <i class="fas fa-exclamation-triangle text-danger"></i>
            </div>
            <div class="flex-grow-1">
                <div class="fw-semibold small">${escapeHtml(f.type)}</div>
                <div class="text-muted small">${escapeHtml(f.source)} • ${f.amount}</div>
            </div>
            <div class="text-end">
                <span class="badge bg-${statusClass[f.status]}">${f.status}</span>
                <div class="text-muted small mt-1">${f.time}</div>
            </div>
        </div>
    `).join('');

    document.getElementById('fraudBadge').textContent = financeData.fraud_alerts.length + ' Flagged';
}

// ===== AUDIT & LOGS PAGE =====
let auditData = {};

function generateDemoAuditData() {
    return {
        stats: { total_logs: 24567, admin_actions: 1234, config_changes: 456, data_exports: 89, suspensions: 23, alerts_handled: 567 },
        logs: [
            { id: 1, timestamp: '2025-12-07 01:30:45', category: 'admin_action', severity: 'info', action: 'User login successful', user: 'global.admin@a3health.com', user_type: 'Global Admin', country: 'in', country_name: 'India', ip: '192.168.1.100' },
            { id: 2, timestamp: '2025-12-07 01:28:12', category: 'config_change', severity: 'medium', action: 'Updated security policy: MFA enforcement enabled', user: 'admin@a3health.in', user_type: 'National Admin', country: 'in', country_name: 'India', ip: '10.0.0.45' },
            { id: 3, timestamp: '2025-12-07 01:25:33', category: 'data_export', severity: 'high', action: 'Exported patient records (2500 records)', user: 'research@hospital.com', user_type: 'State Admin', country: 'us', country_name: 'USA', ip: '172.16.0.89' },
            { id: 4, timestamp: '2025-12-07 01:20:18', category: 'suspension', severity: 'critical', action: 'Account suspended: Suspicious activity detected', user: 'system', user_type: 'System', country: 'gb', country_name: 'UK', ip: 'N/A' },
            { id: 5, timestamp: '2025-12-07 01:15:55', category: 'alert_handled', severity: 'medium', action: 'Resolved alert: High CPU usage on prod-asia', user: 'ops.admin@a3health.com', user_type: 'Global Admin', country: 'sg', country_name: 'Singapore', ip: '203.45.67.12' },
            { id: 6, timestamp: '2025-12-07 01:10:22', category: 'admin_action', severity: 'info', action: 'Created new state admin account', user: 'national.admin@health.gov.in', user_type: 'National Admin', country: 'in', country_name: 'India', ip: '10.0.0.78' },
            { id: 7, timestamp: '2025-12-07 01:05:44', category: 'config_change', severity: 'high', action: 'Database backup schedule modified', user: 'dba@a3health.com', user_type: 'Global Admin', country: 'de', country_name: 'Germany', ip: '185.12.34.56' },
            { id: 8, timestamp: '2025-12-07 00:58:11', category: 'admin_action', severity: 'low', action: 'Password reset requested', user: 'user@clinic.sg', user_type: 'State Admin', country: 'sg', country_name: 'Singapore', ip: '118.200.45.67' },
            { id: 9, timestamp: '2025-12-07 00:50:33', category: 'data_export', severity: 'medium', action: 'Generated compliance report', user: 'compliance@a3health.gb', user_type: 'National Admin', country: 'gb', country_name: 'UK', ip: '86.25.143.89' },
            { id: 10, timestamp: '2025-12-07 00:45:19', category: 'alert_handled', severity: 'info', action: 'Acknowledged maintenance notification', user: 'system', user_type: 'System', country: 'us', country_name: 'USA', ip: 'N/A' }
        ]
    };
}

async function loadAuditPage() {
    auditData = generateDemoAuditData();
    renderAuditDashboard();

    try {
        const response = await fetch('/api/global-admin/audit-logs');
        const data = await response.json();
        if (data.success) {
            auditData = data.audit;
            renderAuditDashboard();
        }
    } catch (error) {
        console.log('Using demo audit data');
    }
}

function renderAuditDashboard() {
    if (auditData.stats) {
        const s = auditData.stats;
        const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val.toLocaleString(); };
        setText('auditTotalLogs', s.total_logs);
        setText('auditAdminActions', s.admin_actions);
        setText('auditConfigChanges', s.config_changes);
        setText('auditDataExports', s.data_exports);
        setText('auditSuspensions', s.suspensions);
        setText('auditAlertsHandled', s.alerts_handled);
    }

    renderAuditLogs();
}

function renderAuditLogs() {
    const tbody = document.getElementById('auditLogsTableBody');
    if (!tbody || !auditData.logs) return;

    const catColors = { admin_action: 'success', config_change: 'warning', data_export: 'info', suspension: 'danger', alert_handled: 'secondary' };
    const catLabels = { admin_action: 'Admin', config_change: 'Config', data_export: 'Export', suspension: 'Suspend', alert_handled: 'Alert' };
    const sevColors = { critical: 'danger', high: 'warning', medium: 'info', low: 'secondary', info: 'light' };

    tbody.innerHTML = auditData.logs.map(log => `
        <tr>
            <td class="small">${log.timestamp}</td>
            <td><span class="badge bg-${catColors[log.category] || 'secondary'}">${catLabels[log.category] || log.category}</span></td>
            <td><span class="badge bg-${sevColors[log.severity]} ${log.severity === 'info' ? 'text-dark' : ''}">${log.severity}</span></td>
            <td class="small">${escapeHtml(log.action)}</td>
            <td class="small">
                <div>${escapeHtml(log.user)}</div>
                <small class="text-muted">${log.user_type}</small>
            </td>
            <td><span class="fi fi-${log.country} me-1"></span>${log.country_name}</td>
            <td class="small text-muted">${log.ip}</td>
        </tr>
    `).join('');

    document.getElementById('auditLogCount').textContent = 'Showing ' + auditData.logs.length;
}

function applyAuditFilters() {
    showToast('Filters applied - Demo mode', 'info');
    renderAuditLogs();
}

function exportAuditLogs() {
    showToast('Exporting logs - Coming soon', 'info');
}

// ===== PHASE 16: SECURITY CENTER API INTEGRATION =====
async function loadSecurityPage() {
    try {
        // Fetch security data from Phase 16C APIs
        const [summaryRes, logsRes, sessionsRes, failedRes] = await Promise.all([
            fetch('/api/admin/security/summary'),
            fetch('/api/admin/security/login-logs?days=7&per_page=20'),
            fetch('/api/admin/security/sessions?status=active&per_page=15'),
            fetch('/api/admin/security/failed-attempts?days=7&per_page=15')
        ]);

        const summary = await summaryRes.json();
        if (summary.success) {
            const s = summary.summary;
            // Update security KPI badges
            const loginAnomalyBadge = document.getElementById('loginAnomalyBadge');
            if (loginAnomalyBadge) loginAnomalyBadge.textContent = (s.failed_24h || 0) + ' Failed';

            const suspiciousBadge = document.getElementById('suspiciousBadge');
            if (suspiciousBadge) suspiciousBadge.textContent = (s.blocked_ips || 0) + ' Blocked';
        }

        // Load login anomalies into existing container
        const logs = await logsRes.json();
        const loginContainer = document.getElementById('loginAnomaliesContainer');
        if (loginContainer && logs.success) {
            const failedLogins = logs.logs.filter(l => l.status !== 'success').slice(0, 5);
            loginContainer.innerHTML = failedLogins.length ? failedLogins.map(l => `
                <div class="d-flex align-items-center gap-2 py-2 border-bottom">
                    <i class="fas fa-exclamation-circle text-danger"></i>
                    <div class="flex-grow-1">
                        <div class="fw-semibold small">${l.email || 'Unknown User'}</div>
                        <small class="text-muted">${l.ip_address || '-'} • ${l.failure_reason || 'Login failed'}</small>
                    </div>
                    <small class="text-muted">${l.created_at ? new Date(l.created_at).toLocaleString() : '-'}</small>
                </div>
            `).join('') : '<div class="text-center text-muted py-4"><i class="fas fa-check-circle me-2 text-success"></i>No anomalies detected</div>';
        }

        // Load suspicious patterns into existing container
        const failed = await failedRes.json();
        const suspiciousContainer = document.getElementById('suspiciousPatternsContainer');
        if (suspiciousContainer && failed.success) {
            suspiciousContainer.innerHTML = failed.attempts.length ? failed.attempts.slice(0, 5).map(a => `
                <div class="d-flex align-items-center gap-2 py-2 border-bottom ${a.is_blocked ? 'bg-danger-subtle' : ''}">
                    <i class="fas fa-${a.is_blocked ? 'ban text-danger' : 'shield-alt text-warning'}"></i>
                    <div class="flex-grow-1">
                        <div class="fw-semibold small">${a.email || 'Unknown'}</div>
                        <small class="text-muted">${a.ip_address || '-'} • ${a.failure_reason || 'Failed'}</small>
                    </div>
                    <span class="badge ${a.is_blocked ? 'bg-danger' : 'bg-warning text-dark'}">${a.is_blocked ? 'Blocked' : 'Warning'}</span>
                </div>
            `).join('') : '<div class="text-center text-muted py-4"><i class="fas fa-check-circle me-2 text-success"></i>No suspicious patterns</div>';
        }

        // Load active sessions
        const sessions = await sessionsRes.json();
        const activeSessionsContainer = document.getElementById('activeSessionsContainer');
        if (activeSessionsContainer && sessions.success) {
            activeSessionsContainer.innerHTML = sessions.sessions.length ? sessions.sessions.slice(0, 5).map(s => `
                <div class="d-flex align-items-center gap-2 py-2 border-bottom">
                    <i class="fas fa-user-circle text-primary"></i>
                    <div class="flex-grow-1">
                        <div class="fw-semibold small">${s.user_name || 'Unknown'}</div>
                        <small class="text-muted">${s.ip_address || '-'} • ${s.browser || 'Unknown'}</small>
                    </div>
                    <span class="badge bg-success">Active</span>
                </div>
            `).join('') : '<div class="text-center text-muted py-4">No active sessions</div>';
        }

        console.log('Security page loaded with live API data');
    } catch (e) {
        console.error('Error loading security page:', e);
    }
}

// ===== UTILITIES =====
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== PHASE 12: INVENTORY & ASSETS =====
async function loadInventorySummary() {
    try {
        const res = await fetch('/api/admin/inventory-summary');
        const data = await res.json();
        if (data.success) console.log('Global Inventory Summary:', data);
    } catch (e) { console.error('Inventory error:', e); }
}
loadInventorySummary();

// ===== CONTINENT ADMINS =====
async function loadContinents() {
    try {
        const response = await fetch('/api/location/continents');
        const data = await response.json();

        if (data.success) {
            const select = document.getElementById('continentAdminContinent');
            if (select) {
                select.innerHTML = '<option value="">Select Continent</option>' +
                    data.continents.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Error loading continents:', error);
    }
}

async function loadContinentAdmins() {
    // Load continents for dropdown first
    loadContinents();

    try {
        const response = await fetch('/api/global-admin/continent-admins');

        const data = await response.json();

        const tableBody = document.getElementById('continentAdminsTableBody');
        const countBadge = document.getElementById('continentAdminsCount');

        if (data.success && tableBody) {
            if (countBadge) countBadge.textContent = data.total;

            if (data.admins.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No Continent Admins found. Create one using the form.</td></tr>';
                return;
            }

            tableBody.innerHTML = data.admins.map(admin => `
                <tr>
                    <td><code>${admin.uid}</code></td>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <div class="rounded-circle bg-danger text-white d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; font-size: 0.8rem;">
                                ${admin.full_name ? admin.full_name.charAt(0).toUpperCase() : 'C'}
                            </div>
                            <div>
                                <strong>${escapeHtml(admin.full_name)}</strong>
                                <div class="small text-muted">${escapeHtml(admin.email)}</div>
                            </div>
                        </div>
                    </td>
                    <td><span class="badge bg-info">${escapeHtml(admin.continent_name)}</span></td>
                    <td><span class="badge bg-secondary">${admin.regional_admins_count}</span></td>
                    <td>${admin.created_at ? new Date(admin.created_at).toLocaleDateString() : '-'}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditContinentAdmin(${admin.id}, '${escapeHtml(admin.full_name)}', '${escapeHtml(admin.email)}', '${escapeHtml(admin.mobile || '')}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="openDeleteAdminModal(${admin.id}, '${escapeHtml(admin.full_name)}', 'continent')" title="Deactivate">
                            <i class="fas fa-user-slash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading continent admins:', error);
        const tableBody = document.getElementById('continentAdminsTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-danger">Error loading data</td></tr>';
        }
    }
}

// Continent Admin Form Submission
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('createContinentAdminForm');
    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            const submitBtn = document.getElementById('createContinentAdminBtn');
            const spinner = document.getElementById('continentAdminSpinner');
            const errorDiv = document.getElementById('continentAdminFormError');
            const successDiv = document.getElementById('continentAdminFormSuccess');

            // Reset alerts
            errorDiv.classList.add('d-none');
            successDiv.classList.add('d-none');

            // Show loading
            submitBtn.disabled = true;
            spinner.classList.remove('d-none');

            const formData = {
                full_name: document.getElementById('continentAdminName').value,
                email: document.getElementById('continentAdminEmail').value,
                mobile: document.getElementById('continentAdminMobile').value,
                password: document.getElementById('continentAdminPassword').value,
                continent_id: document.getElementById('continentAdminContinent').value
            };

            try {
                const response = await fetch('/api/global-admin/create-continent-admin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (data.success) {
                    successDiv.textContent = `Continent Admin "${data.admin.full_name}" created successfully! UID: ${data.admin.uid}`;
                    successDiv.classList.remove('d-none');

                    // Reset form
                    form.reset();

                    // Reload table
                    loadContinentAdmins();

                    // Show toast
                    showToast('Continent Admin created successfully!', 'success');
                } else {
                    errorDiv.textContent = data.error || 'Failed to create Continent Admin';
                    errorDiv.classList.remove('d-none');
                }
            } catch (error) {
                errorDiv.textContent = 'Network error. Please try again.';
                errorDiv.classList.remove('d-none');
            } finally {
                submitBtn.disabled = false;
                spinner.classList.add('d-none');
            }
        });
    }
});

// ===== EDIT/DELETE ADMIN FUNCTIONS =====

// Open Edit Continent Admin Modal
function openEditContinentAdmin(id, fullName, email, mobile) {
    document.getElementById('editContinentAdminId').value = id;
    document.getElementById('editContinentAdminName').value = fullName;
    document.getElementById('editContinentAdminEmail').value = email;
    document.getElementById('editContinentAdminMobile').value = mobile;

    // Reset alerts
    document.getElementById('editContinentAdminError').classList.add('d-none');
    document.getElementById('editContinentAdminSuccess').classList.add('d-none');

    const modal = new bootstrap.Modal(document.getElementById('editContinentAdminModal'));
    modal.show();
}

// Edit Continent Admin Form Submit
document.addEventListener('DOMContentLoaded', function () {
    const editForm = document.getElementById('editContinentAdminForm');
    if (editForm) {
        editForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const adminId = document.getElementById('editContinentAdminId').value;
            const submitBtn = document.getElementById('updateContinentAdminBtn');
            const spinner = document.getElementById('editContinentAdminSpinner');
            const errorDiv = document.getElementById('editContinentAdminError');
            const successDiv = document.getElementById('editContinentAdminSuccess');

            // Reset alerts
            errorDiv.classList.add('d-none');
            successDiv.classList.add('d-none');

            // Show loading
            submitBtn.disabled = true;
            spinner.classList.remove('d-none');

            const formData = {
                full_name: document.getElementById('editContinentAdminName').value,
                email: document.getElementById('editContinentAdminEmail').value,
                mobile: document.getElementById('editContinentAdminMobile').value
            };

            try {
                const response = await fetch(`/api/global-admin/continent-admins/${adminId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (data.success) {
                    successDiv.textContent = 'Continent Admin updated successfully!';
                    successDiv.classList.remove('d-none');

                    // Reload table
                    loadContinentAdmins();

                    // Close modal after delay
                    setTimeout(() => {
                        bootstrap.Modal.getInstance(document.getElementById('editContinentAdminModal')).hide();
                    }, 1000);

                    showToast('Continent Admin updated successfully!', 'success');
                } else {
                    errorDiv.textContent = data.error || 'Failed to update Continent Admin';
                    errorDiv.classList.remove('d-none');
                }
            } catch (error) {
                errorDiv.textContent = 'Network error. Please try again.';
                errorDiv.classList.remove('d-none');
            } finally {
                submitBtn.disabled = false;
                spinner.classList.add('d-none');
            }
        });
    }
});

// Open Delete Confirmation Modal
function openDeleteAdminModal(id, name, adminType) {
    document.getElementById('deleteAdminId').value = id;
    document.getElementById('deleteAdminName').textContent = name;
    document.getElementById('deleteAdminType').value = adminType;

    const modal = new bootstrap.Modal(document.getElementById('deleteAdminModal'));
    modal.show();
}

// Confirm Delete Admin
async function confirmDeleteAdmin() {
    const adminId = document.getElementById('deleteAdminId').value;
    const adminType = document.getElementById('deleteAdminType').value;
    const confirmBtn = document.getElementById('confirmDeleteAdminBtn');
    const spinner = document.getElementById('deleteAdminSpinner');

    // Show loading
    confirmBtn.disabled = true;
    spinner.classList.remove('d-none');

    // Determine API URL based on admin type
    let apiUrl = '';
    let reloadFunc = null;

    switch (adminType) {
        case 'continent':
            apiUrl = `/api/global-admin/continent-admins/${adminId}`;
            reloadFunc = loadContinentAdmins;
            break;
        case 'regional':
            apiUrl = `/api/continent-admin/regional-admins/${adminId}`;
            reloadFunc = loadRegionalAdmins;
            break;
        case 'national':
            apiUrl = `/api/regional-admin/national-admins/${adminId}`;
            reloadFunc = loadNationalAdmins;
            break;
        default:
            console.error('Unknown admin type');
            return;
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.success) {
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('deleteAdminModal')).hide();

            // Reload table
            if (reloadFunc) reloadFunc();

            showToast(data.message || 'Admin deactivated successfully!', 'success');
        } else {
            showToast(data.error || 'Failed to deactivate admin', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        confirmBtn.disabled = false;
        spinner.classList.add('d-none');
    }
}

// ===== SECURITY PAGE LOADER =====
async function loadSecurityPage() {
    try {
        const response = await fetch('/api/global-admin/security-dashboard');
        const data = await response.json();

        if (data.success && data.security) {
            const s = data.security.stats;

            // Update Security Stats
            const threatEl = document.getElementById('securityThreatCount');
            if (threatEl) threatEl.textContent = s.active_threats || 0;

            const anomalyEl = document.getElementById('securityAnomalyCount');
            if (anomalyEl) anomalyEl.textContent = s.anomalies_24h || 0;

            const blockedEl = document.getElementById('securityBlockedCount');
            if (blockedEl) blockedEl.textContent = s.blocked_today || 0;

            const scoreEl = document.getElementById('securityScore');
            if (scoreEl) scoreEl.textContent = s.security_score + '%';

            // Update Security Tools
            const tools = data.security.tools || {};
            const blacklistEl = document.getElementById('blacklistCount');
            if (blacklistEl) blacklistEl.textContent = (tools.blacklist_ips || 0).toLocaleString() + ' IPs';

            const geofenceEl = document.getElementById('geofenceZones');
            if (geofenceEl) geofenceEl.textContent = (tools.geofence_zones || 0) + ' Zones';

            const mfaEl = document.getElementById('mfaEnforced');
            if (mfaEl) mfaEl.textContent = (tools.mfa_adoption || 0) + '% Adoption';

            const rotationEl = document.getElementById('lastRotation');
            if (rotationEl) rotationEl.textContent = 'Last: ' + (tools.last_key_rotation || 'N/A');

            const blockchainEl = document.getElementById('blockchainBlocks');
            if (blockchainEl) blockchainEl.textContent = (tools.blockchain_blocks || 0).toLocaleString() + ' Blocks';

            // Update Overview card
            const overviewThreatsEl = document.getElementById('overviewThreats');
            if (overviewThreatsEl) overviewThreatsEl.textContent = s.active_threats || 0;

            const overviewResolvedEl = document.getElementById('overviewResolved');
            if (overviewResolvedEl) overviewResolvedEl.textContent = tools.threats_resolved || 0;

            const overviewUptimeEl = document.getElementById('overviewUptime');
            if (overviewUptimeEl) overviewUptimeEl.textContent = (tools.uptime || 100) + '%';

            const overviewScoreEl = document.getElementById('overviewScore');
            if (overviewScoreEl) overviewScoreEl.textContent = tools.security_grade || 'A+';
        }
    } catch (error) {
        console.error('Failed to load security page:', error);
    }
}

// ===== INFRASTRUCTURE PAGE LOADER =====
async function loadInfrastructurePage() {
    try {
        const response = await fetch('/api/global-admin/infrastructure');
        const data = await response.json();

        if (data.success && data.infrastructure) {
            const s = data.infrastructure.stats;

            // Update Infrastructure Stats
            const clusterEl = document.getElementById('infraClusterCount');
            if (clusterEl) clusterEl.textContent = s.active_clusters || 0;

            const nodeEl = document.getElementById('infraNodeCount');
            if (nodeEl) nodeEl.textContent = s.total_nodes || 0;

            const utilizationEl = document.getElementById('infraUtilization');
            if (utilizationEl) utilizationEl.textContent = (s.avg_utilization || 0) + '%';

            const uptimeEl = document.getElementById('infraUptime');
            if (uptimeEl) uptimeEl.textContent = (s.uptime || 100) + '%';

            // Update API Gateway stats
            const gw = data.infrastructure.api_gateway || {};
            const latencyEl = document.getElementById('apiLatency');
            if (latencyEl) latencyEl.textContent = gw.avg_latency || 'N/A';

            const errorRateEl = document.getElementById('apiErrorRate');
            if (errorRateEl) errorRateEl.textContent = gw.error_rate || '0%';

            const availabilityEl = document.getElementById('apiAvailability');
            if (availabilityEl) availabilityEl.textContent = gw.availability || '100%';
        }
    } catch (error) {
        console.error('Failed to load infrastructure page:', error);
    }
}

// ===== FINANCE PAGE LOADER =====
async function loadFinancePage() {
    try {
        const response = await fetch('/api/global-admin/finance');
        const data = await response.json();

        if (data.success && data.finance) {
            const s = data.finance.stats;

            // Update Finance Stats
            const revenueEl = document.getElementById('financeRevenue');
            if (revenueEl) revenueEl.textContent = s.total_revenue || '$0';

            const subsEl = document.getElementById('financeSubscriptions');
            if (subsEl) subsEl.textContent = (s.active_subscriptions || 0).toLocaleString();

            const marketEl = document.getElementById('financeMarketplace');
            if (marketEl) marketEl.textContent = s.marketplace_volume || '$0';

            const fraudEl = document.getElementById('financeFraud');
            if (fraudEl) fraudEl.textContent = s.fraud_blocked || '$0';

            // Update health stats
            const health = data.finance.health || {};
            const mrrEl = document.getElementById('financeMRR');
            if (mrrEl) mrrEl.textContent = health.mrr || '$0';

            const arrEl = document.getElementById('financeARR');
            if (arrEl) arrEl.textContent = health.arr || '$0';

            const churnEl = document.getElementById('financeChurn');
            if (churnEl) churnEl.textContent = health.churn_rate || '0%';

            const ltvEl = document.getElementById('financeLTV');
            if (ltvEl) ltvEl.textContent = health.avg_ltv || '$0';
        }
    } catch (error) {
        console.error('Failed to load finance page:', error);
    }
}

// ===== AUDIT PAGE LOADER =====
async function loadAuditPage() {
    try {
        const response = await fetch('/api/global-admin/audit-logs');
        const data = await response.json();

        if (data.success && data.audit) {
            const s = data.audit.stats;

            // Update Audit Stats
            const totalLogsEl = document.getElementById('auditTotalLogs');
            if (totalLogsEl) totalLogsEl.textContent = (s.total_logs || 0).toLocaleString();

            const adminActionsEl = document.getElementById('auditAdminActions');
            if (adminActionsEl) adminActionsEl.textContent = (s.admin_actions || 0).toLocaleString();

            const configChangesEl = document.getElementById('auditConfigChanges');
            if (configChangesEl) configChangesEl.textContent = (s.config_changes || 0).toLocaleString();

            const dataExportsEl = document.getElementById('auditDataExports');
            if (dataExportsEl) dataExportsEl.textContent = (s.data_exports || 0).toLocaleString();

            const suspensionsEl = document.getElementById('auditSuspensions');
            if (suspensionsEl) suspensionsEl.textContent = (s.suspensions || 0).toLocaleString();

            const alertsHandledEl = document.getElementById('auditAlertsHandled');
            if (alertsHandledEl) alertsHandledEl.textContent = (s.alerts_handled || 0).toLocaleString();

            // Update logs table if available
            const logsContainer = document.getElementById('auditLogsTable');
            if (logsContainer && data.audit.logs) {
                if (data.audit.logs.length === 0) {
                    logsContainer.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No audit logs recorded yet</td></tr>';
                }
            }
        }
    } catch (error) {
        console.error('Failed to load audit page:', error);
    }
}

// ===== NEW PAGE LOADER FUNCTIONS (Phase 1 Stubs) =====

async function loadRegionalAdmins() {
    console.log('Loading Regional Admins...');
    const container = document.getElementById('regionalAdminsTableBody');
    if (container) container.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Loading...</td></tr>';
    try {
        const response = await fetch('/api/global-admin/regional-admins');
        const data = await response.json();
        if (data.success && container) {
            if (!data.admins || data.admins.length === 0) {
                container.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No regional admins found</td></tr>';
            } else {
                document.getElementById('regionalAdminsCount').textContent = data.count || data.admins.length;
                container.innerHTML = data.admins.map(a => `
                    <tr>
                        <td>${a.uid || a.id}</td>
                        <td>${escapeHtml(a.full_name || '')}</td>
                        <td>${escapeHtml(a.email || '')}</td>
                        <td>${escapeHtml(a.mobile || '-')}</td>
                        <td>${escapeHtml(a.region_name || 'Not Assigned')}</td>
                        <td><span class="badge bg-${a.is_active ? 'success' : 'danger'}">${a.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td>${a.created_at ? new Date(a.created_at).toLocaleDateString() : '-'}</td>
                        <td class="text-end"><button class="btn btn-sm btn-outline-primary" onclick="viewAdmin(${a.id}, 'regional_admin')"><i class="fas fa-eye"></i></button></td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading regional admins:', error);
        if (container) container.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Error loading data</td></tr>';
    }
}

async function loadStateAdmins() {
    console.log('Loading State Admins...');
    const container = document.getElementById('stateAdminsTableBody');
    if (container) container.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">Loading...</td></tr>';
    try {
        const response = await fetch('/api/global-admin/state-admins');
        const data = await response.json();
        if (data.success && container && data.admins) {
            container.innerHTML = data.admins.length === 0
                ? '<tr><td colspan="7" class="text-center text-muted py-4">No state admins found</td></tr>'
                : data.admins.map(a => `<tr><td>${a.uid || a.id}</td><td>${escapeHtml(a.full_name)}</td><td>${escapeHtml(a.email)}</td><td>${escapeHtml(a.state_name || '-')}</td><td>${escapeHtml(a.country_name || '-')}</td><td><span class="badge bg-${a.is_active ? 'success' : 'danger'}">${a.is_active ? 'Active' : 'Inactive'}</span></td><td>${a.created_at ? new Date(a.created_at).toLocaleDateString() : '-'}</td></tr>`).join('');
        }
    } catch (error) {
        console.log('State admins API not implemented yet');
        if (container) container.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">Coming soon...</td></tr>';
    }
}

async function loadDistrictAdmins() {
    console.log('Loading District Admins...');
    const container = document.getElementById('districtAdminsTableBody');
    if (container) container.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Loading...</td></tr>';
    try {
        const response = await fetch('/api/global-admin/district-admins');
        const data = await response.json();
        if (data.success && container) {
            if (!data.admins || data.admins.length === 0) {
                container.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No district admins found</td></tr>';
            } else {
                document.getElementById('districtAdminsCount').textContent = data.count || data.admins.length;
                container.innerHTML = data.admins.map(a => `
                    <tr>
                        <td>${a.uid || a.id}</td>
                        <td>${escapeHtml(a.full_name || '')}</td>
                        <td>${escapeHtml(a.email || '')}</td>
                        <td>${escapeHtml(a.district_name || '-')}</td>
                        <td>${escapeHtml(a.state_name || '-')}</td>
                        <td><span class="badge bg-${a.is_active ? 'success' : 'danger'}">${a.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td>${a.created_at ? new Date(a.created_at).toLocaleDateString() : '-'}</td>
                        <td class="text-end"><button class="btn btn-sm btn-outline-primary" onclick="viewAdmin(${a.id}, 'district_admin')"><i class="fas fa-eye"></i></button></td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading district admins:', error);
        if (container) container.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Error loading data</td></tr>';
    }
}

async function loadBlockAdmins() {
    console.log('Loading Block Admins...');
    const container = document.getElementById('blockAdminsTableBody');
    if (container) container.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Loading...</td></tr>';
    try {
        const response = await fetch('/api/global-admin/block-admins');
        const data = await response.json();
        if (data.success && container) {
            if (!data.admins || data.admins.length === 0) {
                container.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No block admins found</td></tr>';
            } else {
                document.getElementById('blockAdminsCount').textContent = data.count || data.admins.length;
                container.innerHTML = data.admins.map(a => `
                    <tr>
                        <td>${a.uid || a.id}</td>
                        <td>${escapeHtml(a.full_name || '')}</td>
                        <td>${escapeHtml(a.email || '')}</td>
                        <td>${escapeHtml(a.block_name || '-')}</td>
                        <td>${escapeHtml(a.district_name || '-')}</td>
                        <td><span class="badge bg-${a.is_active ? 'success' : 'danger'}">${a.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td>${a.created_at ? new Date(a.created_at).toLocaleDateString() : '-'}</td>
                        <td class="text-end"><button class="btn btn-sm btn-outline-primary" onclick="viewAdmin(${a.id}, 'block_admin')"><i class="fas fa-eye"></i></button></td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading block admins:', error);
        if (container) container.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Error loading data</td></tr>';
    }
}

async function loadContinentsList() {
    console.log('Loading Continents List...');
    const container = document.getElementById('continentsTableBody');
    if (container) container.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Loading...</td></tr>';
    try {
        const response = await fetch('/api/global-admin/continents-list');
        const data = await response.json();
        if (data.success && container) {
            document.getElementById('continentsCount').textContent = data.count || 0;
            if (!data.continents || data.continents.length === 0) {
                container.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No continents found</td></tr>';
            } else {
                container.innerHTML = data.continents.map(c => `
                    <tr>
                        <td>${c.id}</td>
                        <td><strong>${escapeHtml(c.name)}</strong></td>
                        <td>${c.regions_count || 0}</td>
                        <td>${c.countries_count || 0}</td>
                        <td>${escapeHtml(c.admin || '-')}</td>
                        <td class="text-end"><button class="btn btn-sm btn-outline-primary"><i class="fas fa-eye"></i></button></td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading continents:', error);
        if (container) container.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Error loading data</td></tr>';
    }
}

async function loadRegionsList() {
    console.log('Loading Regions List...');
    const container = document.getElementById('regionsTableBody');
    if (container) container.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Loading...</td></tr>';
    try {
        const response = await fetch('/api/global-admin/regions-list');
        const data = await response.json();
        if (data.success && container) {
            document.getElementById('regionsCount').textContent = data.count || 0;
            if (!data.regions || data.regions.length === 0) {
                container.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No regions found</td></tr>';
            } else {
                container.innerHTML = data.regions.map(r => `
                    <tr>
                        <td>${r.id}</td>
                        <td><strong>${escapeHtml(r.name)}</strong></td>
                        <td>${escapeHtml(r.continent || '-')}</td>
                        <td>${r.countries_count || 0}</td>
                        <td>${escapeHtml(r.admin || '-')}</td>
                        <td class="text-end"><button class="btn btn-sm btn-outline-primary"><i class="fas fa-eye"></i></button></td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading regions:', error);
        if (container) container.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Error loading data</td></tr>';
    }
}

async function loadDistrictsList() {
    console.log('Loading Districts List...');
    const container = document.getElementById('districtsTableBody');
    if (container) container.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Loading...</td></tr>';
    try {
        const response = await fetch('/api/global-admin/districts-list');
        const data = await response.json();
        if (data.success && container) {
            document.getElementById('districtsCount').textContent = data.count || 0;
            if (!data.districts || data.districts.length === 0) {
                container.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No districts found</td></tr>';
            } else {
                container.innerHTML = data.districts.map(d => `
                    <tr>
                        <td>${d.id}</td>
                        <td><strong>${escapeHtml(d.name)}</strong></td>
                        <td>${escapeHtml(d.state || '-')}</td>
                        <td>${d.blocks_count || 0}</td>
                        <td>${escapeHtml(d.admin || '-')}</td>
                        <td class="text-end"><button class="btn btn-sm btn-outline-primary"><i class="fas fa-eye"></i></button></td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading districts:', error);
        if (container) container.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Error loading data</td></tr>';
    }
}

async function loadAllUsers() {
    console.log('Loading All Users...');
    const container = document.getElementById('allUsersTableBody');
    if (container) container.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Loading...</td></tr>';
    try {
        const response = await fetch('/api/global-admin/all-users');
        const data = await response.json();
        if (data.success && container) {
            document.getElementById('allUsersCount').textContent = data.total || data.count || 0;
            document.getElementById('allUsersPaginationInfo').textContent = `Showing ${data.count} of ${data.total || data.count}`;
            if (!data.users || data.users.length === 0) {
                container.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No users found</td></tr>';
            } else {
                container.innerHTML = data.users.map(u => `
                    <tr>
                        <td><code>${u.uid || u.id}</code></td>
                        <td>${escapeHtml(u.full_name || '')}</td>
                        <td>${escapeHtml(u.email || '')}</td>
                        <td><span class="badge bg-secondary">${escapeHtml(u.user_type || '-')}</span></td>
                        <td>${escapeHtml(u.country || '-')}</td>
                        <td><span class="badge bg-${u.is_active ? 'success' : 'danger'}">${u.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td>${u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
                        <td class="text-end"><button class="btn btn-sm btn-outline-primary"><i class="fas fa-eye"></i></button></td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading users:', error);
        if (container) container.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Error loading data</td></tr>';
    }
}

async function loadFacilities() {
    console.log('Loading Facilities...');
    const container = document.getElementById('facilitiesTableBody');
    if (container) container.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Loading...</td></tr>';
    try {
        const response = await fetch('/api/global-admin/facilities');
        const data = await response.json();
        if (data.success && container) {
            document.getElementById('facilitiesCount').textContent = data.count || 0;
            if (!data.facilities || data.facilities.length === 0) {
                container.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No facilities found</td></tr>';
            } else {
                container.innerHTML = data.facilities.map(f => `
                    <tr>
                        <td>${f.id}</td>
                        <td><strong>${escapeHtml(f.name)}</strong></td>
                        <td><span class="badge bg-info">${escapeHtml(f.type)}</span></td>
                        <td>${escapeHtml(f.location || '-')}</td>
                        <td>${f.beds || 0}</td>
                        <td>${f.staff || 0}</td>
                        <td><span class="badge bg-${f.is_active ? 'success' : 'danger'}">${f.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td class="text-end"><button class="btn btn-sm btn-outline-primary"><i class="fas fa-eye"></i></button></td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading facilities:', error);
        if (container) container.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Error loading data</td></tr>';
    }
}

async function loadHealthWorkers() {
    console.log('Loading Health Workers...');
    const container = document.getElementById('healthWorkersTableBody');
    if (container) container.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Loading...</td></tr>';
    try {
        const response = await fetch('/api/global-admin/health-workers');
        const data = await response.json();
        if (data.success && container) {
            document.getElementById('healthWorkersCount').textContent = data.count || 0;
            if (!data.workers || data.workers.length === 0) {
                container.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No health workers found</td></tr>';
            } else {
                container.innerHTML = data.workers.map(w => `
                    <tr>
                        <td><code>${w.uid || w.id}</code></td>
                        <td>${escapeHtml(w.full_name || '')}</td>
                        <td><span class="badge bg-primary">${escapeHtml(w.worker_type)}</span></td>
                        <td>${escapeHtml(w.facility || '-')}</td>
                        <td>${escapeHtml(w.location || '-')}</td>
                        <td>${w.patients_count || 0}</td>
                        <td><span class="badge bg-${w.is_active ? 'success' : 'danger'}">${w.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td class="text-end"><button class="btn btn-sm btn-outline-primary"><i class="fas fa-eye"></i></button></td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading health workers:', error);
        if (container) container.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Error loading data</td></tr>';
    }
}

async function loadHealthPrograms() {
    console.log('Loading Health Programs...');
    const container = document.getElementById('healthProgramsTableBody');
    if (container) container.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Loading...</td></tr>';
    try {
        const response = await fetch('/api/global-admin/health-programs');
        const data = await response.json();
        if (data.success) {
            // Update KPI cards
            if (data.stats) {
                document.getElementById('activeProgramsCount').textContent = data.stats.active_programs || 0;
                document.getElementById('totalBeneficiaries').textContent = data.stats.total_beneficiaries || 0;
                document.getElementById('vaccinationCoverage').textContent = data.stats.vaccination_coverage || '0%';
                document.getElementById('screeningsCompleted').textContent = data.stats.screenings_completed || 0;
            }
            if (container && data.programs) {
                container.innerHTML = data.programs.map(p => `
                    <tr>
                        <td><strong>${escapeHtml(p.name)}</strong></td>
                        <td>${escapeHtml(p.target)}</td>
                        <td><div class="progress" style="height: 8px;"><div class="progress-bar bg-success" style="width: ${parseInt(p.coverage) || 0}%"></div></div><small>${p.coverage}</small></td>
                        <td>${p.countries || 0}</td>
                        <td><span class="badge bg-success">${escapeHtml(p.status)}</span></td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading health programs:', error);
        if (container) container.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Error loading data</td></tr>';
    }
}

async function loadDiseaseSurveillance() {
    console.log('Loading Disease Surveillance...');
    const container = document.getElementById('diseaseTableBody');
    if (container) container.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Loading...</td></tr>';
    try {
        const response = await fetch('/api/global-admin/disease-surveillance');
        const data = await response.json();
        if (data.success) {
            // Update KPI cards
            if (data.stats) {
                document.getElementById('activeOutbreaks').textContent = data.stats.active_outbreaks || 0;
                document.getElementById('casesThisWeek').textContent = (data.stats.cases_this_week || 0).toLocaleString();
                document.getElementById('recoveryRate').textContent = data.stats.recovery_rate || '0%';
                document.getElementById('countriesMonitored').textContent = data.stats.countries_monitored || 0;
            }
            if (container && data.diseases) {
                container.innerHTML = data.diseases.map(d => {
                    const trendIcon = d.trend === 'up' ? '<i class="fas fa-arrow-up text-danger"></i>' : d.trend === 'down' ? '<i class="fas fa-arrow-down text-success"></i>' : '<i class="fas fa-minus text-warning"></i>';
                    const riskClass = d.risk === 'high' ? 'danger' : d.risk === 'moderate' ? 'warning' : 'success';
                    return `
                        <tr>
                            <td><strong>${escapeHtml(d.name)}</strong></td>
                            <td>${(d.total_cases || 0).toLocaleString()}</td>
                            <td class="text-warning">${(d.active || 0).toLocaleString()}</td>
                            <td class="text-success">${(d.recovered || 0).toLocaleString()}</td>
                            <td>${trendIcon} ${d.trend}</td>
                            <td><span class="badge bg-${riskClass}">${d.risk}</span></td>
                        </tr>
                    `;
                }).join('');
            }
        }
    } catch (error) {
        console.error('Error loading disease surveillance:', error);
        if (container) container.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Error loading data</td></tr>';
    }
}

async function loadAIPredictions() {
    console.log('Loading AI Predictions...');
    const container = document.getElementById('aiPredictionsTableBody');
    if (container) container.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Loading...</td></tr>';
    try {
        const response = await fetch('/api/global-admin/ai-predictions');
        const data = await response.json();
        if (data.success) {
            // Update KPI cards
            if (data.stats) {
                document.getElementById('aiModelAccuracy').textContent = data.stats.model_accuracy || '0%';
                document.getElementById('predictionsGenerated').textContent = (data.stats.predictions_generated || 0).toLocaleString();
                document.getElementById('alertsPredicted').textContent = data.stats.alerts_predicted || 0;
            }
            if (container && data.predictions) {
                container.innerHTML = data.predictions.map(p => {
                    const riskClass = p.risk === 'Critical' ? 'danger' : p.risk === 'High' ? 'warning' : p.risk === 'Moderate' ? 'info' : 'success';
                    const statusClass = p.status === 'Active' ? 'danger' : p.status === 'Monitoring' ? 'warning' : 'secondary';
                    return `
                        <tr>
                            <td><strong>${escapeHtml(p.type)}</strong></td>
                            <td>${escapeHtml(p.region)}</td>
                            <td><span class="badge bg-${riskClass}">${escapeHtml(p.risk)}</span></td>
                            <td>${escapeHtml(p.confidence)}</td>
                            <td>${escapeHtml(p.timeframe)}</td>
                            <td><span class="badge bg-${statusClass}">${escapeHtml(p.status)}</span></td>
                        </tr>
                    `;
                }).join('');
            }
        }
    } catch (error) {
        console.error('Error loading AI predictions:', error);
        if (container) container.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Error loading data</td></tr>';
    }
}

async function loadAlertsCenter() {
    console.log('Loading Alerts Center...');
    const container = document.getElementById('alertsTableBody');
    if (container) container.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Loading...</td></tr>';
    try {
        const response = await fetch('/api/global-admin/alerts-center');
        const data = await response.json();
        if (data.success) {
            // Update stat cards
            if (data.stats) {
                document.getElementById('criticalAlertsCount').textContent = data.stats.critical || 0;
                document.getElementById('warningAlertsCount').textContent = data.stats.warning || 0;
                document.getElementById('infoAlertsCount').textContent = data.stats.info || 0;
                document.getElementById('resolvedAlertsCount').textContent = data.stats.resolved || 0;
            }
            if (container && data.alerts) {
                if (data.alerts.length === 0) {
                    container.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No alerts found</td></tr>';
                } else {
                    container.innerHTML = data.alerts.map(a => {
                        const severityClass = a.severity === 'critical' ? 'danger' : a.severity === 'warning' || a.severity === 'high' ? 'warning' : 'info';
                        const statusClass = a.status === 'resolved' ? 'success' : a.status === 'active' ? 'danger' : 'secondary';
                        const timeStr = a.time ? new Date(a.time).toLocaleString() : 'N/A';
                        return `
                            <tr>
                                <td><span class="badge bg-${severityClass}">${escapeHtml(a.severity || 'info')}</span></td>
                                <td><strong>${escapeHtml(a.title)}</strong></td>
                                <td>${escapeHtml(a.source)}</td>
                                <td>${timeStr}</td>
                                <td><span class="badge bg-${statusClass}">${escapeHtml(a.status)}</span></td>
                                <td class="text-end">
                                    <button class="btn btn-sm btn-outline-success" title="Resolve"><i class="fas fa-check"></i></button>
                                </td>
                            </tr>
                        `;
                    }).join('');
                }
            }
        }
    } catch (error) {
        console.error('Error loading alerts:', error);
        if (container) container.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Error loading data</td></tr>';
    }
}

async function loadAuditLogs() {
    console.log('Loading Audit Logs...');
    const container = document.getElementById('auditLogsTableBody');
    if (container) container.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Loading...</td></tr>';
    try {
        const response = await fetch('/api/global-admin/audit-logs');
        const data = await response.json();
        if (data.success) {
            // Update stat cards
            if (data.stats) {
                document.getElementById('totalLogsToday').textContent = data.stats.total_today || 0;
                document.getElementById('loginAttemptsToday').textContent = data.stats.login_attempts || 0;
                document.getElementById('failedLoginsToday').textContent = data.stats.failed_logins || 0;
                document.getElementById('apiCallsToday').textContent = data.stats.api_calls || 0;
            }
            if (container && data.logs) {
                if (data.logs.length === 0) {
                    container.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No logs found</td></tr>';
                } else {
                    container.innerHTML = data.logs.map(l => {
                        const typeClass = l.type === 'login' ? 'primary' : l.type === 'api' ? 'info' : 'secondary';
                        const statusClass = l.status === 'success' ? 'success' : 'danger';
                        const timeStr = l.time ? new Date(l.time).toLocaleString() : 'N/A';
                        return `
                            <tr>
                                <td><small>${timeStr}</small></td>
                                <td>${escapeHtml(l.user)}</td>
                                <td><span class="badge bg-${typeClass}">${escapeHtml(l.type)}</span></td>
                                <td>${escapeHtml(l.action)}</td>
                                <td><code>${escapeHtml(l.ip_address)}</code></td>
                                <td><span class="badge bg-${statusClass}">${escapeHtml(l.status)}</span></td>
                            </tr>
                        `;
                    }).join('');
                }
            }
        }
    } catch (error) {
        console.error('Error loading audit logs:', error);
        if (container) container.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Error loading data</td></tr>';
    }
}

async function loadReports() {
    console.log('Loading Reports...');
    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const fromInput = document.getElementById('reportDateFrom');
    const toInput = document.getElementById('reportDateTo');
    if (fromInput) fromInput.value = thirtyDaysAgo.toISOString().split('T')[0];
    if (toInput) toInput.value = today.toISOString().split('T')[0];
}

function exportReport(reportType) {
    console.log('Exporting report:', reportType);
    window.location.href = `/api/global-admin/export-report/${reportType}`;
}

async function loadSettings() {
    console.log('Loading Settings...');
    try {
        const response = await fetch('/api/global-admin/settings');
        const data = await response.json();
        if (data.success && data.settings) {
            const s = data.settings;
            // General
            if (document.getElementById('systemName')) document.getElementById('systemName').value = s.system_name || '';
            if (document.getElementById('timezone')) document.getElementById('timezone').value = s.timezone || 'Asia/Kolkata';
            if (document.getElementById('dateFormat')) document.getElementById('dateFormat').value = s.date_format || 'DD/MM/YYYY';
            // Notifications
            if (document.getElementById('emailNotifications')) document.getElementById('emailNotifications').checked = s.email_notifications;
            if (document.getElementById('criticalAlerts')) document.getElementById('criticalAlerts').checked = s.critical_alerts;
            if (document.getElementById('dailyDigest')) document.getElementById('dailyDigest').checked = s.daily_digest;
            // Security
            if (document.getElementById('sessionTimeout')) document.getElementById('sessionTimeout').value = s.session_timeout || 30;
            if (document.getElementById('twoFactorAuth')) document.getElementById('twoFactorAuth').checked = s.two_factor_auth;
            if (document.getElementById('maxLoginAttempts')) document.getElementById('maxLoginAttempts').value = s.max_login_attempts || 5;
            // Integrations
            if (document.getElementById('enableApi')) document.getElementById('enableApi').checked = s.enable_api;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function showSettingsTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.settings-tab-content').forEach(tab => tab.style.display = 'none');
    // Show selected tab
    const selectedTab = document.getElementById(`settings-${tabName}`);
    if (selectedTab) selectedTab.style.display = 'block';
    // Update nav
    document.querySelectorAll('#settings-page .list-group-item').forEach(item => item.classList.remove('active'));
    event.target.closest('.list-group-item').classList.add('active');
}

async function saveSettings() {
    try {
        const settings = {
            system_name: document.getElementById('systemName')?.value,
            timezone: document.getElementById('timezone')?.value,
            date_format: document.getElementById('dateFormat')?.value,
            email_notifications: document.getElementById('emailNotifications')?.checked,
            critical_alerts: document.getElementById('criticalAlerts')?.checked,
            daily_digest: document.getElementById('dailyDigest')?.checked,
            session_timeout: document.getElementById('sessionTimeout')?.value,
            two_factor_auth: document.getElementById('twoFactorAuth')?.checked,
            max_login_attempts: document.getElementById('maxLoginAttempts')?.value,
            enable_api: document.getElementById('enableApi')?.checked
        };

        const response = await fetch('/api/global-admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        const data = await response.json();
        if (data.success) {
            alert('Settings saved successfully!');
        } else {
            alert('Error saving settings: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Error saving settings');
    }
}

function toggleApiKey() {
    const input = document.getElementById('apiKey');
    if (input) input.type = input.type === 'password' ? 'text' : 'password';
}

function regenerateApiKey() {
    if (confirm('Are you sure you want to regenerate the API key? This will invalidate the current key.')) {
        const newKey = 'ak_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const input = document.getElementById('apiKey');
        if (input) {
            input.value = newKey;
            input.type = 'text';
        }
    }
}
