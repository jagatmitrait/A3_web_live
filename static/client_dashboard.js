// ============================================
// A3 Health Card - Client Dashboard JavaScript
// ============================================

// Global variables
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let appointmentsCalendarDate = new Date();
let bookingCalendarCursor = new Date();
const appointmentState = {
    currentTab: 'upcoming',
    stats: {
        upcoming: 0,
        completed: 0,
        rescheduled: 0,
        cancelled: 0
    },
    grouped: {
        upcoming: [],
        today: [],
        past: [],
        cancelled: []
    },
    highlights: [],
    calendarMap: {},
    meta: {
        appointmentTypes: [],
        consultationModes: [],
        specialties: []
    },
    filterDate: null
};
const bookingState = {
    intent: 'new',
    currentStep: 1,
    data: {
        appointmentType: null,
        specialty: null,
        doctor: null,
        appointmentDate: null,
        appointmentTime: null,
        slotLabel: null,
        consultationMode: null,
        medical: {
            chiefComplaint: '',
            symptoms: '',
            severity: '',
            notes: '',
            attachments: []
        }
    },
    targetAppointmentId: null,
    availableSlots: {},
    doctorResults: []
};
let bookingModal = null;
let doctorSearchTimeout = null;
const MAX_BOOKING_UPLOADS = 3;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    initializeDashboard();
    setupEventListeners();
    updateDateTime();
    generateCalendar(currentMonth, currentYear);
    try { initializeMedicalRecords(); } catch (e) { console.error('Medical Records Init Failed', e); }
    try { initializeAppointmentsModule(); } catch (e) { console.error('Appointments Init Failed', e); }
    // Allergy, Vaccination, Surgery, and Implants are initialized by their standalone JS files
    // try { initializeAllergyModule(); } catch (e) { console.error('Allergy Init Failed', e); }
    try { initializeSurgeryModule(); } catch (e) { console.error('Surgery Init Failed', e); }
    // try { initializeVaccinationModule(); } catch (e) { console.error('Vaccination Init Failed', e); }
    // try { initializeImplantModule(); } catch (e) { console.error('Implant Init Failed', e); }
    fetchDashboardStats();
    fetchIoTData();

    // Update time every minute
    setInterval(updateDateTime, 60000);

    // Check for URL hash to navigate to a specific page
    if (window.location.hash) {
        const pageName = window.location.hash.substring(1); // remove the '#'
        const navLink = document.querySelector(`.nav-item[data-page="${pageName}"]`);
        if (navLink) {
            navLink.click(); // Simulate a click to navigate to the page
        }
    }
    // Initialize DOB -> Age link for General Details form
    try { initDobAgeLink(); } catch (err) { /* safe fallback */ }
});

// ============================================
// INITIALIZE DASHBOARD
// ============================================

function initializeDashboard() {
    // Set current month in selector (if calendar exists)
    const monthSelect = document.getElementById('monthSelect');
    const currentYearEl = document.getElementById('currentYear');

    if (monthSelect) monthSelect.value = currentMonth;
    if (currentYearEl) currentYearEl.textContent = currentYear;

    // Set schedule date (if elements exist)
    updateScheduleDate();
}


// ============================================
// EVENT LISTENERS SETUP
// ============================================

function setupEventListeners() {
    // Sidebar Navigation
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item:not(.logout-item):not([data-skip-nav="true"])');
    navItems.forEach(item => {
        item.addEventListener('click', handleNavigation);
    });

    // Calendar Navigation (optional - calendar may not exist)
    document.getElementById('prevMonth')?.addEventListener('click', () => navigateMonth(-1));
    document.getElementById('nextMonth')?.addEventListener('click', () => navigateMonth(1));
    document.getElementById('monthSelect')?.addEventListener('change', handleMonthChange);


    // Header Icons
    document.getElementById('refreshBtn')?.addEventListener('click', handleRefresh);
    document.getElementById('helpBtn')?.addEventListener('click', handleHelp);
    document.getElementById('notificationBtn')?.addEventListener('click', handleNotifications);
    document.getElementById('userProfileBtn')?.addEventListener('click', handleProfileMenu);

    // Edit Details Button
    document.getElementById('editDetailsBtn')?.addEventListener('click', handleEditDetails);

    // Add Buttons
    document.getElementById('addRecordBtn')?.addEventListener('click', () => handleAddItem('medical-record'));
    document.getElementById('addVaccineBtn')?.addEventListener('click', () => handleAddItem('vaccine'));
    // Allergy add buttons are handled via .js-add-allergy delegation in initializeAllergyModule

    // Medical Records Modal Events
    document.getElementById('uploadDocumentBtn')?.addEventListener('click', openUploadModal);
    document.getElementById('submitUploadBtn')?.addEventListener('click', handleDocumentUpload);
    document.getElementById('documentType')?.addEventListener('change', handleDocumentTypeChange);
    document.getElementById('fileUploadArea')?.addEventListener('click', () => document.getElementById('documentFile').click());
    document.getElementById('documentFile')?.addEventListener('change', handleFileSelect);
    document.getElementById('removeFileBtn')?.addEventListener('click', removeSelectedFile);

    // Imaging dual upload events
    document.getElementById('filmUploadArea')?.addEventListener('click', () => document.getElementById('imagingFilmFile').click());
    document.getElementById('imagingFilmFile')?.addEventListener('change', handleFilmFileSelect);
    document.getElementById('removeFilmBtn')?.addEventListener('click', removeFilmFile);

    document.getElementById('reportUploadArea')?.addEventListener('click', () => document.getElementById('imagingReportFile').click());
    document.getElementById('imagingReportFile')?.addEventListener('change', handleReportFileSelect);
    document.getElementById('removeReportBtn')?.addEventListener('click', removeReportFile);

    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', handleFilterChange);
    });

    // Export and Share buttons
    document.getElementById('exportRecordsBtn')?.addEventListener('click', handleExportRecords);
    document.getElementById('shareRecordsBtn')?.addEventListener('click', handleShareRecords);

    // Right sidebar quick action buttons
    document.querySelectorAll('.quick-action-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const pageName = this.getAttribute('data-page');
            if (pageName) {
                // Find and trigger the nav item click
                const navLink = document.querySelector(`.nav-item[data-page="${pageName}"]`);
                if (navLink) {
                    navLink.click();
                }
            }
        });
    });

    // Dashboard play cards navigation (Vitals, Appointments, etc.)
    document.querySelectorAll('.play-card[data-page]').forEach(card => {
        card.addEventListener('click', function (e) {
            e.preventDefault();
            const pageName = this.getAttribute('data-page');
            if (pageName) {
                // Find and trigger the nav item click
                const navLink = document.querySelector(`.nav-item[data-page="${pageName}"]`);
                if (navLink) {
                    navLink.click();
                }
            }
        });
    });
}


// ============================================
// NAVIGATION HANDLING
// ============================================

function handleNavigation(e) {
    e.preventDefault();

    // Remove active class from all items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Add active class to clicked item
    e.currentTarget.classList.add('active');

    // Get page to show
    const pageName = e.currentTarget.getAttribute('data-page');

    // Hide all pages (class + inline style as a safety net)
    document.querySelectorAll('.content-page').forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none';
    });

    // Show selected page
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
        targetPage.style.display = 'block';
    } else {
        console.warn(`Page container not found: ${pageName}-page`);
        const fallback = document.getElementById('overview-page');
        if (fallback) {
            fallback.classList.add('active');
            fallback.style.display = 'block';
        }
        return;
    }

    // Reflect navigation in the URL (enables deep-linking and refresh persistence)
    try { window.location.hash = pageName; } catch (_) { }

    // Reload data when navigating to specific pages
    if (pageName === 'medical-records') {
        loadMedicalRecords();
    }
    if (pageName === 'appointments') {
        loadAppointmentsOverview();
    }
    if (pageName === 'allergy') {
        if (typeof window.loadAllergyData === 'function') window.loadAllergyData();
    }
    if (pageName === 'surgery') {
        if (typeof loadSurgeryData === 'function') {
            loadSurgeryData();
        } else if (typeof window.loadSurgeryData === 'function') {
            window.loadSurgeryData();
        }
    }
    if (pageName === 'vaccination') {
        if (typeof loadVaccinationData === 'function') {
            loadVaccinationData();
        } else if (typeof window.loadVaccinationData === 'function') {
            window.loadVaccinationData();
        }
    }
    if (pageName === 'implantation') {
        if (typeof loadImplantData === 'function') {
            loadImplantData();
        } else if (typeof window.loadImplantData === 'function') {
            window.loadImplantData();
        }
    }
    if (pageName === 'pharmacy') {
        if (typeof loadPharmacies === 'function') loadPharmacies();
        if (typeof loadRequests === 'function') loadRequests();
    }
    if (pageName === 'blood-requests') {
        if (typeof loadBloodDonationData === 'function') {
            loadBloodDonationData();
        } else if (typeof window.loadBloodDonationData === 'function') {
            window.loadBloodDonationData();
        }
    }
    if (pageName === 'Organ-requests') {
        if (typeof loadOrganDonationData === 'function') {
            loadOrganDonationData();
        } else if (typeof window.loadOrganDonationData === 'function') {
            window.loadOrganDonationData();
        }
    }
    if (pageName === 'pill-reminder') {
        if (typeof loadPillReminderData === 'function') {
            loadPillReminderData();
        } else if (typeof window.loadPillReminderData === 'function') {
            window.loadPillReminderData();
        }
    }
    if (pageName === 'mental-health') {
        if (typeof initializeMentalHealthModule === 'function') {
            initializeMentalHealthModule();
        } else if (typeof window.initializeMentalHealthModule === 'function') {
            window.initializeMentalHealthModule();
        }
        // Scroll to top of page
        const mainContent = document.getElementById('mainContent');
        if (mainContent) mainContent.scrollTop = 0;
    }
}

// Simple generic modal form loader (no extra config) for modules like Vaccination
async function openSimpleFormIntoModal(url, title, onSuccess) {
    // Ensure modal instance exists
    if (!dynamicModal) {
        const modalEl = document.getElementById('dynamicActionModal');
        if (modalEl) dynamicModal = new bootstrap.Modal(modalEl);
    }

    const modalTitle = document.getElementById('dynamicActionModalLabel');
    const modalBody = document.getElementById('dynamicActionModalBody');
    if (!modalTitle || !modalBody || !dynamicModal) return;

    modalTitle.textContent = title;
    modalBody.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-danger" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    dynamicModal.show();

    try {
        const res = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        if (!res.ok) throw new Error('Could not load form');
        const html = await res.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const formCard = doc.querySelector('.form-card');
        if (!formCard) throw new Error('Form content not found');

        modalBody.innerHTML = '';
        const form = formCard.querySelector('form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    const formData = new FormData(form);
                    const submitRes = await fetch(form.action, {
                        method: 'POST',
                        body: formData,
                        headers: { 'X-Requested-With': 'XMLHttpRequest' }
                    });
                    const result = await submitRes.json();
                    if (result.success) {
                        showNotification(result.message || 'Saved successfully', 'success');
                        dynamicModal.hide();
                        if (typeof onSuccess === 'function') onSuccess();
                    } else {
                        showNotification(result.message || 'Error while saving', 'error');
                    }
                } catch (err) {
                    console.error('Modal form submit error:', err);
                    showNotification('An unexpected error occurred during submission.', 'error');
                }
            });
        }
        formCard.addEventListener('click', (ev) => ev.stopPropagation());
        modalBody.appendChild(formCard);
    } catch (err) {
        console.error('openSimpleFormIntoModal error:', err);
        modalBody.innerHTML = `<p class="text-center text-danger">Error: ${err.message}</p>`;
    }
}

// ============================================
// DATE AND TIME UPDATES
// ============================================

function updateDateTime() {
    const now = new Date();

    // Update current date
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('en-US', dateOptions);
    const currentDateEl = document.getElementById('currentDate');
    if (currentDateEl) {
        currentDateEl.textContent = dateString.split(',').slice(1).join(',').trim();
    }

    // Update current time
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
    const timeString = now.toLocaleTimeString('en-US', timeOptions);
    const currentTimeEl = document.getElementById('currentTime');
    if (currentTimeEl) {
        currentTimeEl.textContent = timeString;
    }

    // Update sidebar date and time
    const sidebarDateEl = document.getElementById('sidebarDate');
    if (sidebarDateEl) {
        sidebarDateEl.textContent = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    const sidebarTimeEl = document.getElementById('sidebarTime');
    if (sidebarTimeEl) {
        sidebarTimeEl.textContent = timeString;
    }
}


function updateScheduleDate() {
    const now = new Date();
    const dayOptions = { weekday: 'long' };
    const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };

    const scheduleDayEl = document.getElementById('scheduleDay');
    const scheduleDateTextEl = document.getElementById('scheduleDateText');

    if (scheduleDayEl) {
        scheduleDayEl.textContent = now.toLocaleDateString('en-US', dayOptions);
    }

    if (scheduleDateTextEl) {
        scheduleDateTextEl.textContent = now.toLocaleDateString('en-US', dateOptions);
    }
}

// ============================================
// CALENDAR FUNCTIONS
// ============================================

function generateCalendar(month, year) {
    const calendarDays = document.getElementById('calendarDays');
    if (!calendarDays) return;

    calendarDays.innerHTML = '';

    // Get first day of month
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Adjust first day (Monday = 0)
    const firstDayAdjusted = firstDay === 0 ? 6 : firstDay - 1;

    // Get today's date
    const today = new Date();
    const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();
    const todayDate = today.getDate();

    // Appointment dates (populate from real data when available)
    const appointmentDates = [];

    // Previous month days
    for (let i = firstDayAdjusted - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const dayDiv = createCalendarDay(day, 'other-month');
        calendarDays.appendChild(dayDiv);
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const classes = [];

        if (isCurrentMonth && day === todayDate) {
            classes.push('today');
        }

        if (appointmentDates.includes(day)) {
            classes.push('has-appointment');
        }

        const dayDiv = createCalendarDay(day, classes.join(' '));
        calendarDays.appendChild(dayDiv);
    }

    // Next month days
    const totalCells = calendarDays.children.length;
    const remainingCells = 42 - totalCells; // 6 rows × 7 days

    for (let day = 1; day <= remainingCells; day++) {
        const dayDiv = createCalendarDay(day, 'other-month');
        calendarDays.appendChild(dayDiv);
    }
}

function createCalendarDay(day, className = '') {
    const dayDiv = document.createElement('div');
    dayDiv.className = `calendar-day ${className}`;
    dayDiv.textContent = day;

    dayDiv.addEventListener('click', function () {
        // Handle day click
        document.querySelectorAll('.calendar-day').forEach(d => {
            if (!d.classList.contains('other-month') && !d.classList.contains('today')) {
                // Remove previous selections if needed
            }
        });
    });

    return dayDiv;
}

function navigateMonth(direction) {
    currentMonth += direction;

    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }

    document.getElementById('monthSelect').value = currentMonth;
    document.getElementById('currentYear').textContent = currentYear;
    generateCalendar(currentMonth, currentYear);
}

function handleMonthChange(e) {
    currentMonth = parseInt(e.target.value);
    generateCalendar(currentMonth, currentYear);
}

// ============================================
// HEADER ACTIONS
// ============================================

function handleRefresh() {
    // Add rotation animation
    const refreshBtn = document.getElementById('refreshBtn');
    const icon = refreshBtn.querySelector('i');
    icon.style.transform = 'rotate(360deg)';
    icon.style.transition = 'transform 0.5s ease';

    setTimeout(() => {
        icon.style.transform = 'rotate(0deg)';
    }, 500);

    // Refresh data (implement API calls here)
    console.log('Refreshing dashboard data...');

    // Show success message
    showNotification('Dashboard refreshed successfully', 'success');
}

function handleHelp() {
    showNotification('Help documentation coming soon!', 'info');
}

function handleNotifications() {
    showNotification('No new notifications right now', 'info');
    // TODO: Implement notification panel
}

function handleProfileMenu() {
    showNotification('Profile menu coming soon!', 'info');
    // TODO: Implement profile dropdown menu
}

// ============================================
// FORM ACTIONS
// ============================================

function handleEditDetails() {
    const form = document.getElementById('generalDetailsForm');
    const inputs = form.querySelectorAll('input, select, textarea');
    const editBtn = document.getElementById('editDetailsBtn');

    const isDisabled = inputs[0].disabled;

    if (isDisabled) {
        // Enable editing
        inputs.forEach(input => {
            input.disabled = false;
        });
        editBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        editBtn.classList.add('btn-success');
        showNotification('Edit mode enabled', 'info');
    } else {
        // Save changes
        const data = {
            prefix: document.getElementById('prefix')?.value,
            firstName: document.getElementById('first_name')?.value,
            middleName: document.getElementById('middle_name')?.value,
            lastName: document.getElementById('last_name')?.value,
            dob: document.getElementById('dob_input')?.value,
            gender: document.getElementById('gender')?.value,
            email: document.getElementById('email')?.value,
            mobile: document.getElementById('phone')?.value,
            emergencyContact: document.getElementById('emergency')?.value,
            // Emergency Contact 1
            emergency_contact_name: document.getElementById('emergency_contact_name')?.value,
            emergency_contact_phone: document.getElementById('emergency_contact_phone')?.value,
            emergency_contact_relation: document.getElementById('emergency_contact_relation')?.value,
            // Emergency Contact 2
            emergency_contact_name2: document.getElementById('emergency_contact_name2')?.value,
            emergency_contact_phone2: document.getElementById('emergency_contact_phone2')?.value,
            emergency_contact_relation2: document.getElementById('emergency_contact_relation2')?.value,
            // Emergency Contact 3
            emergency_contact_name3: document.getElementById('emergency_contact_name3')?.value,
            emergency_contact_phone3: document.getElementById('emergency_contact_phone3')?.value,
            emergency_contact_relation3: document.getElementById('emergency_contact_relation3')?.value,
            // Address
            buildingDetails: document.getElementById('building')?.value,
            streetName: document.getElementById('street')?.value,
            locality: document.getElementById('locality')?.value,
            city: document.getElementById('city')?.value,
            state: document.getElementById('state')?.value,
            country: document.getElementById('country')?.value,
            postalCode: document.getElementById('pincode')?.value,
            bloodGroup: document.getElementById('blood_group')?.value,
            bloodRh: document.getElementById('rh_factor')?.value
        };

        // Disable inputs while saving
        inputs.forEach(input => {
            input.disabled = true;
        });
        editBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        fetch('/api/profile/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit Details';
                    editBtn.classList.remove('btn-success');
                    showNotification('Changes saved successfully', 'success');
                } else {
                    // Re-enable if failed
                    inputs.forEach(input => {
                        input.disabled = false;
                    });
                    editBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
                    showNotification(result.message || 'Error saving changes', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                // Re-enable if error
                inputs.forEach(input => {
                    input.disabled = false;
                });
                editBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
                showNotification('An error occurred while saving', 'error');
            });
    }
}

// Calculate age from a date string (YYYY-MM-DD) and return years
function calculateAgeFromDateString(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length !== 3) return '';
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dob = new Date(year, month, day);
    if (isNaN(dob.getTime())) return '';
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
        age--;
    }
    return age >= 0 ? age : '';
}

// Hook DOB -> Age input. Safe to call multiple times.
function initDobAgeLink() {
    const dobEl = document.getElementById('dob_input');
    const ageEl = document.getElementById('age_input');
    if (!dobEl || !ageEl) return;

    const updateAge = () => {
        const val = dobEl.value || '';
        const age = calculateAgeFromDateString(val);
        ageEl.value = age === '' ? '' : `${age} yrs`;
    };

    dobEl.addEventListener('change', updateAge);
    // Also update when the field receives input (for browsers that allow typing)
    dobEl.addEventListener('input', updateAge);

    // Run once on init
    updateAge();
}

function handleAddItem(type) {
    if (type === 'surgery') {
        const modalEl = document.getElementById('surgeryModal');
        if (modalEl) {
            const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        } else {
            console.error('Surgery modal not found');
            showNotification('Error: Surgery modal not found', 'error');
        }
        return;
    }

    const messages = {
        'medical-record': 'Add new medical record functionality coming soon!',
        'vaccine': 'Add new vaccine record functionality coming soon!',
        'allergy': 'Add new allergy information functionality coming soon!'
    };

    showNotification(messages[type] || 'Feature coming soon!', 'info');
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 90px;
        right: 30px;
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 350px;
    `;

    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add animation styles
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
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ============================================
// SURGERY MODULE (Dashboard tab)
// ============================================

const surgeryState = {
    q: '',
    type: '',
    category: '',
    year: ''
};

function initializeSurgeryModule() {
    // initSurgeryForm is called by loadIntoModal callback

    const page = document.getElementById('surgery-page');
    if (!page) return;

    const searchInput = document.getElementById('surgerySearchInput');
    const typeFilter = document.getElementById('surgeryTypeFilter');
    const categoryFilter = document.getElementById('surgeryCategoryFilter');
    const yearFilter = document.getElementById('surgeryYearFilter');
    const resetBtn = document.getElementById('surgeryResetFilters');
    const addBtn = document.getElementById('addSurgeryBtn');
    const emptyAddBtn = document.getElementById('surgeryEmptyAddBtn');

    const debouncedFetch = debounce(loadSurgeryData, 300);

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            surgeryState.q = e.target.value || '';
            debouncedFetch();
        });
    }
    if (typeFilter) {
        typeFilter.addEventListener('change', (e) => {
            surgeryState.type = e.target.value || '';
            loadSurgeryData();
        });
    }
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            surgeryState.category = e.target.value || '';
            loadSurgeryData();
        });
    }
    if (yearFilter) {
        yearFilter.addEventListener('change', (e) => {
            surgeryState.year = e.target.value || '';
            loadSurgeryData();
        });
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            surgeryState.q = '';
            surgeryState.type = '';
            surgeryState.category = '';
            surgeryState.year = '';
            if (searchInput) searchInput.value = '';
            if (typeFilter) typeFilter.value = '';
            if (categoryFilter) categoryFilter.value = '';
            if (yearFilter) yearFilter.value = '';
            loadSurgeryData();
        });
    }

    // Event delegation for Surgery actions
    document.body.addEventListener('click', function (e) {
        const viewLink = e.target.closest('.js-view-surgery');
        if (viewLink) {
            e.preventDefault();
            const url = viewLink.dataset.url || viewLink.getAttribute('href');
            if (url) {
                loadIntoModal(url, 'View Surgery', {
                    handleSubmission: false, // View mode usually doesn't have submission, but if it did (e.g. delete), let's handle it carefully
                    initCallback: null // No special init for view yet
                });
            }
            return;
        }

        const editLink = e.target.closest('.js-edit-surgery');
        if (editLink) {
            e.preventDefault();
            const url = editLink.dataset.url || editLink.getAttribute('href');
            if (url) {
                loadIntoModal(url, 'Edit Surgery', {
                    handleSubmission: false, // initSurgeryForm handles submission
                    initCallback: initSurgeryForm
                });
            }
            return;
        }
    });
}

const SURGERY_MAX_FILES = 3;
const SURGERY_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const SURGERY_ALLOWED_EXTS = ['pdf', 'jpg', 'jpeg', 'png', 'dcm', 'dicom'];

function validateSurgeryFile(file, errorEl) {
    if (!file) return false;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!SURGERY_ALLOWED_EXTS.includes(ext)) {
        const msg = 'Invalid file type. Allowed: PDF, JPG, PNG, DICOM.';
        if (errorEl) {
            errorEl.textContent = msg;
            errorEl.style.display = 'block';
        }
        return false;
    }
    if (file.size > SURGERY_MAX_SIZE) {
        const msg = `"${file.name}" exceeds 10 MB limit.`;
        if (errorEl) {
            errorEl.textContent = msg;
            errorEl.style.display = 'block';
        }
        return false;
    }
    if (errorEl) errorEl.style.display = 'none';
    return true;
}

function updateSurgeryFilePreview(fileInput, preview, errorEl) {
    if (!fileInput || !preview) return;
    const files = Array.from(fileInput.files || []);
    preview.innerHTML = '';
    if (!files.length) return;

    files.forEach((file, index) => {
        const sizeKb = (file.size / 1024).toFixed(1);
        const ext = file.name.split('.').pop().toUpperCase();
        const wrapper = document.createElement('div');
        wrapper.className = 'file-chip';
        wrapper.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:#f9fafb;font-size:13px;margin-bottom:4px;border:1px solid #e5e7eb;';
        wrapper.innerHTML = `
        <span class="file-name" style="font-weight:500;">${file.name}</span>
        <span class="file-meta" style="color:#6b7280;">${ext} · ${sizeKb} KB</span>
        <button type="button" class="btn btn-sm text-danger p-0 ms-2" data-index="${index}" style="font-size:12px;">Remove</button>
      `;
        const btn = wrapper.querySelector('button');
        btn.addEventListener('click', () => {
            const dt = new DataTransfer();
            Array.from(fileInput.files).forEach((f, i) => {
                if (i !== index) dt.items.add(f);
            });
            fileInput.files = dt.files;
            updateSurgeryFilePreview(fileInput, preview, errorEl);
        });
        preview.appendChild(wrapper);
    });
}

function mergeSurgeryFiles(fileInput, newFiles, errorEl) {
    const dt = new DataTransfer();
    const existing = Array.from(fileInput.files || []);
    const combined = existing.concat(newFiles);

    const kept = [];
    for (const file of combined) {
        if (kept.length >= SURGERY_MAX_FILES) break;
        if (!validateSurgeryFile(file, errorEl)) continue;
        kept.push(file);
    }

    kept.forEach((f) => dt.items.add(f));
    fileInput.files = dt.files;
}

function initSurgeryForm() {
    const form = document.getElementById('surgeryForm');
    if (!form) return;
    if (form.dataset.bound === 'true') return;

    const dropzone = document.getElementById('surgeryUploadArea');
    const fileInput = document.getElementById('surgeryDocuments');
    const preview = document.getElementById('surgeryFilePreview');
    const errorEl = document.getElementById('surgeryFileError');

    if (dropzone && fileInput) {
        dropzone.addEventListener('click', () => fileInput.click());

        ['dragenter', 'dragover'].forEach((evt) => {
            dropzone.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add('bg-light'); // Bootstrap class for visual feedback
            });
        });

        ['dragleave', 'dragend', 'drop'].forEach((evt) => {
            dropzone.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('bg-light');
            });
        });

        dropzone.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer?.files || []);
            if (!files.length) return;
            mergeSurgeryFiles(fileInput, files, errorEl);
            updateSurgeryFilePreview(fileInput, preview, errorEl);
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', () => {
            mergeSurgeryFiles(fileInput, [], errorEl); // enforce limits
            updateSurgeryFilePreview(fileInput, preview, errorEl);
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (form.dataset.submitting === 'true') return;

        let ok = true;
        const files = Array.from(fileInput?.files || []);
        if (files.length > SURGERY_MAX_FILES) {
            ok = false;
            if (errorEl) {
                errorEl.textContent = `You can upload a maximum of ${SURGERY_MAX_FILES} files.`;
                errorEl.style.display = 'block';
            }
        }

        if (!ok) return;
        form.dataset.submitting = 'true';

        // AJAX Submission
        const submitBtn = e.submitter || document.querySelector(`button[type="submit"][form="${form.id}"]`) || form.querySelector('button[type="submit"], [type="submit"]');
        const originalBtnContent = submitBtn ? submitBtn.innerHTML : null;
        if (submitBtn) submitBtn.disabled = true;
        if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            const formData = new FormData(form);
            // Append files explicitly if needed, but FormData handles input[type=file] automatically if name is correct
            // However, our file input has 'multiple', so FormData should catch all selected files.
            // Note: The file input 'surgeryDocuments' is already in the form.

            const response = await fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const result = await response.json();

            if (result.success) {
                showNotification(result.message || 'Surgery added successfully', 'success');

                // Close modal
                const modalEl = document.getElementById('surgeryModal');
                const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
                modal.hide();

                // Reset form
                form.reset();
                if (fileInput) fileInput.value = ''; // Clear file input
                if (preview) preview.innerHTML = ''; // Clear preview

                // Reload data
                if (typeof loadSurgeryData === 'function') {
                    loadSurgeryData();
                }
            } else {
                showNotification(result.message || 'Error adding surgery', 'error');
            }
        } catch (error) {
            console.error('Error submitting surgery form:', error);
            showNotification('An error occurred. Please try again.', 'error');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
            if (submitBtn && originalBtnContent != null) submitBtn.innerHTML = originalBtnContent;
            form.dataset.submitting = 'false';
        }
    });

    // Mark as bound to avoid duplicate event listeners
    form.dataset.bound = 'true';
}

async function loadSurgeryData() {
    try {
        const params = new URLSearchParams();
        if (surgeryState.q) params.set('q', surgeryState.q);
        if (surgeryState.type) params.set('type', surgeryState.type);
        if (surgeryState.category) params.set('category', surgeryState.category);
        if (surgeryState.year) params.set('year', surgeryState.year);

        const res = await fetch('/api/surgery?' + params.toString());
        const data = await res.json();
        if (!data.success) return;

        updateSurgeryStats(data.stats, data.counts);
        renderSurgeryCards(data.surgeries, data.counts);
    } catch (err) {
        console.error('Error loading surgeries:', err);
        showNotification('Error loading surgery history', 'error');
    }
}
// Expose for global access (navigation and other modules)
window.loadSurgeryData = loadSurgeryData;

function updateSurgeryStats(stats, counts) {
    if (!stats) return;
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el != null && value != null) el.textContent = value;
    };

    setText('surgeryStatTotal', stats.total || 0);
    setText('surgeryStatMinor', stats.minor || 0);
    setText('surgeryStatMajor', stats.major || 0);
    setText('surgeryStatEmergency', stats.emergency || 0);

    const updated = stats.last_updated ? String(stats.last_updated).split('T')[0] : 'N/A';
    setText('surgeryStatUpdated', updated);

    if (counts) {
        const summary = document.getElementById('surgerySummary');
        if (summary) {
            summary.textContent = `Showing ${counts.filtered || 0} of ${counts.total || 0} surgeries`;
        }

        const typeList = document.getElementById('surgeryTypeDistribution');
        if (typeList && counts.byType) {
            typeList.innerHTML = '';
            ['Minor', 'Major', 'Emergency', 'Elective'].forEach((label) => {
                const c = counts.byType[label] || 0;
                if (!c) return;
                const li = document.createElement('li');
                li.innerHTML = `<span>${label}</span><strong>${c}</strong>`;
                li.classList.add('mini-list-row');
                typeList.appendChild(li);
            });
        }

        const yearList = document.getElementById('surgeryYearDistribution');
        const yearFilter = document.getElementById('surgeryYearFilter');
        if (yearList && counts.byYear) {
            yearList.innerHTML = '';
            const years = Object.keys(counts.byYear).sort();
            years.forEach((y) => {
                const c = counts.byYear[y];
                const li = document.createElement('li');
                li.innerHTML = `<span>${y}</span><strong>${c}</strong>`;
                li.classList.add('mini-list-row');
                yearList.appendChild(li);
            });

            if (yearFilter && !yearFilter.dataset.populated) {
                years.forEach((y) => {
                    const opt = document.createElement('option');
                    opt.value = y;
                    opt.textContent = y;
                    yearFilter.appendChild(opt);
                });
                yearFilter.dataset.populated = 'true';
            }
        }
    }
}

function renderSurgeryCards(surgeries, counts) {
    const container = document.getElementById('surgeryCardsContainer');
    const empty = document.getElementById('surgeryEmptyState');
    if (!container) return;

    container.querySelectorAll('.surgery-card').forEach((el) => el.remove());
    if (!surgeries || !surgeries.length) {
        if (empty) empty.style.display = '';
        return;
    }

    if (empty) empty.style.display = 'none';

    surgeries.forEach((s) => {
        const date = s.date || 'N/A';
        const hospital = s.hospital || 'Unknown hospital';
        const surgeon = s.surgeon || 'N/A';
        const type = s.surgery_type || s.type || 'Type N/A';
        const badgeClass = String(type).toLowerCase();
        const category = s.category || 'Uncategorized surgery';
        const outcome = s.outcome || 'Not recorded';
        const reason = s.reason || 'Not recorded';

        const html = `
          <article class="card surgery-card">
            <div class="surgery-card-head">
              <div>
                <div class="kicker">${category}</div>
                <h3>${s.surgery_name}</h3>
                <p class="muted small-text">
                  ${date} · ${hospital}
                </p>
                <p class="muted small-text">
                  Surgeon: ${surgeon}
                </p>
              </div>
              <span class="status-pill surgery-type-pill ${badgeClass}">${type}</span>
            </div>
            <p class="small-text"><strong>Outcome:</strong> ${outcome}</p>
            <p class="small-text"><strong>Reason:</strong> ${reason}</p>
            <div class="surgery-card-actions">
              <a href="/surgery/view/${s.id}" class="btn btn-outline js-view-surgery" data-url="/surgery/view/${s.id}">View</a>
              <a href="/surgery/edit/${s.id}" class="btn btn-outline js-edit-surgery" data-url="/surgery/edit/${s.id}">Edit</a>
              <a href="/surgery/pdf/${s.id}" class="btn btn-outline">Download PDF</a>
              <form method="post" action="/surgery/delete/${s.id}" style="display:inline-block" onsubmit="return confirm('Delete this surgery record permanently?');">
                <button type="submit" class="btn btn-danger">Delete</button>
              </form>
            </div>
          </article>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
}

// ============================================
// DATA FETCHING (Backend Integration)
// ============================================

// Fetch dashboard statistics
async function fetchDashboardStats() {
    try {
        const response = await fetch('/api/dashboard/stats');
        const data = await response.json();

        if (data.success) {
            updateStatsDisplay(data.stats);
        }
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
    }
}

// Update stats display
function updateStatsDisplay(stats) {
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el != null && value != null) el.textContent = value;
    };
    setText('totalRecords', stats.totalRecords);
    setText('upcomingAppts', stats.upcomingAppointments);
    setText('activePrescriptions', stats.activePrescriptions);
    setText('pendingClaims', stats.pendingClaims);
    setText('pastSurgeries', stats.pastSurgeries);
    setText('implantationNotes', stats.implantationNotes);
}

// Fetch medical records
async function fetchMedicalRecords() {
    try {
        const response = await fetch('/api/medical-records');
        const data = await response.json();

        if (data.success && data.records) {
            displayMedicalRecords(data.records);
        }
    } catch (error) {
        console.error('Error fetching medical records:', error);
    }
}

// Display medical records in table
function displayMedicalRecords(records) {
    const tbody = document.getElementById('medicalRecordsTable');
    if (!tbody) return;

    tbody.innerHTML = records.map(record => `
        <tr>
            <td>${formatDate(record.date)}</td>
            <td>${record.hospital}</td>
            <td>${record.doctor}</td>
            <td>${record.type}</td>
            <td><span class="status-badge ${record.status.toLowerCase()}">${record.status}</span></td>
            <td>
                <button class="btn-icon" title="View" onclick="viewRecord('${record.id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon" title="Download" onclick="downloadRecord('${record.id}')">
                    <i class="fas fa-download"></i>
                </button>
            </td>
        </tr>
    `).join('');
}


// Fetch IoT health data
async function fetchIoTData() {
    try {
        const response = await fetch('/api/iot-data');
        const data = await response.json();

        if (data.success && data.healthData) {
            updateIoTDisplay(data.healthData);
        }
    } catch (error) {
        console.error('Error fetching IoT data:', error);
    }
}

// Update IoT monitoring display
function updateIoTDisplay(healthData) {
    // Update blood pressure, heart rate, blood sugar, oxygen level
    // This would be implemented based on your API response structure
    console.log('IoT Data:', healthData);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

const debounce = (fn, delay = 300) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
};

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function viewRecord(recordId) {
    showNotification(`Viewing record ${recordId}`, 'info');
    // TODO: Implement modal to view record details
}

function downloadRecord(recordId) {
    showNotification(`Downloading record ${recordId}`, 'success');
    // TODO: Implement download functionality
}

// ============================================
// EXPORT FUNCTIONS FOR GLOBAL ACCESS
// ============================================

// ============================================
// MEDICAL RECORDS MODULE
// ============================================

let currentFilter = 'all';
let uploadModal = null;
const MAX_FILE_SIZE = 500 * 1024; // 500 KB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/dicom'];

function initializeMedicalRecords() {
    // Load records on page load
    loadMedicalRecords();

    // Load HIV/STD Status
    loadHivStdStatus();

    // Initialize Bootstrap modal
    const modalElement = document.getElementById('uploadDocumentModal');
    if (modalElement) {
        uploadModal = new bootstrap.Modal(modalElement);
    }
}

// ============================================
// HIV/STD STATUS MODULE
// ============================================

async function loadHivStdStatus() {
    try {
        const response = await fetch('/api/hiv-std-status');
        const data = await response.json();

        if (data.success) {
            updateHivStdStatusDisplay(data.status, data.lastTestDate);
        }
    } catch (error) {
        console.error('Error loading HIV/STD status:', error);
    }
}

function updateHivStdStatusDisplay(status, lastTestDate) {
    const statusCard = document.getElementById('hivStdStatusCard');
    if (!statusCard) return;

    const statusBadge = statusCard.querySelector('.hiv-status-badge');
    const lastTestEl = statusCard.querySelector('.hiv-last-test');

    if (statusBadge) {
        statusBadge.className = 'hiv-status-badge badge-' + status;
        statusBadge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    }

    if (lastTestEl) {
        lastTestEl.textContent = lastTestDate ? 'Last tested: ' + lastTestDate : 'No test date recorded';
    }
}

async function saveHivStdStatus() {
    const status = document.getElementById('hivStdSelect')?.value || 'unknown';
    const lastTestDate = document.getElementById('hivStdTestDate')?.value || null;

    try {
        const response = await fetch('/api/hiv-std-status', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, lastTestDate })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('HIV/STD status updated successfully', 'success');
            updateHivStdStatusDisplay(data.status, data.lastTestDate);

            // Close modal if open
            const modal = bootstrap.Modal.getInstance(document.getElementById('hivStdModal'));
            if (modal) modal.hide();
        } else {
            showNotification(data.error || 'Failed to update status', 'error');
        }
    } catch (error) {
        console.error('Error saving HIV/STD status:', error);
        showNotification('Error saving status', 'error');
    }
}

function openHivStdModal() {
    // Get current values
    fetch('/api/hiv-std-status')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                document.getElementById('hivStdSelect').value = data.status || 'unknown';
                document.getElementById('hivStdTestDate').value = data.lastTestDate || '';
            }

            const modal = new bootstrap.Modal(document.getElementById('hivStdModal'));
            modal.show();
        })
        .catch(err => console.error('Error:', err));
}

// Expose functions globally
window.loadHivStdStatus = loadHivStdStatus;
window.saveHivStdStatus = saveHivStdStatus;
window.openHivStdModal = openHivStdModal;

function openUploadModal() {
    // Reset form
    document.getElementById('uploadDocumentForm')?.reset();
    removeSelectedFile();

    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('documentDate').value = today;

    // Show modal
    if (uploadModal) {
        uploadModal.show();
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    const fileError = document.getElementById('fileError');

    fileError.style.display = 'none';

    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
        fileError.textContent = `File size exceeds maximum limit of 500 KB. Your file is ${(file.size / 1024).toFixed(2)} KB.`;
        fileError.style.display = 'block';
        e.target.value = '';
        return;
    }

    // Validate file type
    const fileExt = file.name.split('.').pop().toLowerCase();
    const allowedExts = ['pdf', 'jpg', 'jpeg', 'png', 'dcm', 'dicom'];

    if (!allowedExts.includes(fileExt)) {
        fileError.textContent = 'Invalid file type. Allowed types: PDF, JPG, PNG, DICOM.';
        fileError.style.display = 'block';
        e.target.value = '';
        return;
    }

    // Show selected file info
    document.getElementById('fileUploadContent').style.display = 'none';
    document.getElementById('fileSelectedInfo').style.display = 'flex';
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = `Size: ${(file.size / 1024).toFixed(2)} KB`;
}

function removeSelectedFile() {
    document.getElementById('documentFile').value = '';
    document.getElementById('fileUploadContent').style.display = 'block';
    document.getElementById('fileSelectedInfo').style.display = 'none';
    document.getElementById('fileError').style.display = 'none';
}

function handleDocumentTypeChange(e) {
    const selectedType = e.target.value;
    const imagingTypes = ['X-Ray', 'MRI', 'CT Scan', 'Ultrasound', 'PET Scan', 'Mammography'];

    const singleUploadSection = document.getElementById('singleFileUploadSection');
    const imagingUploadSection = document.getElementById('imagingFilesUploadSection');
    const documentFileInput = document.getElementById('documentFile');

    if (imagingTypes.includes(selectedType)) {
        // Show dual upload for imaging
        singleUploadSection.style.display = 'none';
        imagingUploadSection.style.display = 'block';
        // Make single file optional, dual files required
        documentFileInput.removeAttribute('required');
    } else {
        // Show single upload for non-imaging
        singleUploadSection.style.display = 'block';
        imagingUploadSection.style.display = 'none';
        documentFileInput.setAttribute('required', 'required');
        // Clear imaging files
        removeFilmFile();
        removeReportFile();
    }
}

function handleFilmFileSelect(e) {
    const file = e.target.files[0];
    const fileError = document.getElementById('filmFileError');

    fileError.style.display = 'none';

    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
        fileError.textContent = `File exceeds ${MAX_FILE_SIZE / 1024} KB`;
        fileError.style.display = 'block';
        e.target.value = '';
        return;
    }

    // Validate file type for imaging
    const fileExt = file.name.split('.').pop().toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'dcm', 'dicom'];

    if (!allowedExts.includes(fileExt)) {
        fileError.textContent = 'Invalid file type. Allowed: JPG, PNG, DICOM';
        fileError.style.display = 'block';
        e.target.value = '';
        return;
    }

    // Show selected file info
    document.getElementById('filmUploadContent').style.display = 'none';
    document.getElementById('filmSelectedInfo').style.display = 'flex';
    document.getElementById('filmFileName').textContent = file.name;
    document.getElementById('filmFileSize').textContent = `${(file.size / 1024).toFixed(1)} KB`;
}

function handleReportFileSelect(e) {
    const file = e.target.files[0];
    const fileError = document.getElementById('reportFileError');

    fileError.style.display = 'none';

    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
        fileError.textContent = `File exceeds ${MAX_FILE_SIZE / 1024} KB`;
        fileError.style.display = 'block';
        e.target.value = '';
        return;
    }

    // Validate file type for report
    const fileExt = file.name.split('.').pop().toLowerCase();
    const allowedExts = ['pdf', 'jpg', 'jpeg', 'png'];

    if (!allowedExts.includes(fileExt)) {
        fileError.textContent = 'Invalid file type. Allowed: PDF, JPG, PNG';
        fileError.style.display = 'block';
        e.target.value = '';
        return;
    }

    // Show selected file info
    document.getElementById('reportUploadContent').style.display = 'none';
    document.getElementById('reportSelectedInfo').style.display = 'flex';
    document.getElementById('reportFileName').textContent = file.name;
    document.getElementById('reportFileSize').textContent = `${(file.size / 1024).toFixed(1)} KB`;
}

function removeFilmFile() {
    const filmInput = document.getElementById('imagingFilmFile');
    if (filmInput) filmInput.value = '';
    const filmUploadContent = document.getElementById('filmUploadContent');
    const filmSelectedInfo = document.getElementById('filmSelectedInfo');
    if (filmUploadContent) filmUploadContent.style.display = 'flex';
    if (filmSelectedInfo) filmSelectedInfo.style.display = 'none';
    const filmError = document.getElementById('filmFileError');
    if (filmError) filmError.style.display = 'none';
}

function removeReportFile() {
    const reportInput = document.getElementById('imagingReportFile');
    if (reportInput) reportInput.value = '';
    const reportUploadContent = document.getElementById('reportUploadContent');
    const reportSelectedInfo = document.getElementById('reportSelectedInfo');
    if (reportUploadContent) reportUploadContent.style.display = 'flex';
    if (reportSelectedInfo) reportSelectedInfo.style.display = 'none';
    const reportError = document.getElementById('reportFileError');
    if (reportError) reportError.style.display = 'none';
}

async function handleDocumentUpload() {
    const form = document.getElementById('uploadDocumentForm');
    const submitBtn = document.getElementById('submitUploadBtn');
    const documentType = document.getElementById('documentType').value;
    const imagingTypes = ['X-Ray', 'MRI', 'CT Scan', 'Ultrasound', 'PET Scan', 'Mammography'];

    // Check if it's an imaging type
    const isImaging = imagingTypes.includes(documentType);

    // Validate imaging files if needed
    if (isImaging) {
        const filmFile = document.getElementById('imagingFilmFile').files[0];
        const reportFile = document.getElementById('imagingReportFile').files[0];

        if (!filmFile || !reportFile) {
            showNotification('Please upload both film/image and report for imaging documents', 'error');
            return;
        }
    } else {
        // Validate single file
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

    try {
        const formData = new FormData(form);

        // Add imaging files if present
        if (isImaging) {
            const filmFile = document.getElementById('imagingFilmFile').files[0];
            const reportFile = document.getElementById('imagingReportFile').files[0];
            formData.set('file', filmFile);  // Primary file is the film
            formData.append('reportFile', reportFile);  // Add report as additional file
            formData.append('isImaging', 'true');
        }

        const response = await fetch('/api/medical-records/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Medical record uploaded successfully!', 'success');
            uploadModal.hide();

            // Reload records
            await loadMedicalRecords();
        } else {
            showNotification(data.message || 'Upload failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showNotification('An error occurred while uploading. Please try again.', 'error');
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Upload Document';
    }
}

async function loadMedicalRecords(filterType = 'all') {
    try {
        const url = filterType === 'all' ? '/api/medical-records' : `/api/medical-records?type=${encodeURIComponent(filterType)}`;
        console.log('Loading medical records from:', url);
        const response = await fetch(url);
        const data = await response.json();
        console.log('Medical records data received:', data);

        if (data.success) {
            console.log('Number of records:', data.records ? data.records.length : 0);
            displayRecordsTable(data.records);
            updateSummaryCards(data.stats);

            // Enable/disable export and share buttons
            const hasRecords = data.records && data.records.length > 0;
            document.getElementById('exportRecordsBtn').disabled = !hasRecords;
            document.getElementById('shareRecordsBtn').disabled = !hasRecords;
        } else {
            console.error('API returned success: false', data);
        }
    } catch (error) {
        console.error('Error loading medical records:', error);
        showNotification('Error loading medical records', 'error');
    }
}

function displayRecordsTable(records) {
    const container = document.getElementById('recordsGridContainer');
    const emptyCard = document.getElementById('emptyStateCard');

    console.log('displayRecordsTable called with:', records);
    console.log('container element found:', !!container);
    console.log('emptyCard element found:', !!emptyCard);

    if (!container) {
        console.error('ERROR: recordsGridContainer element not found!');
        return;
    }

    // Remove existing record cards
    const existingCards = container.querySelectorAll('.record-card');
    existingCards.forEach(card => card.remove());

    if (!records || records.length === 0) {
        console.log('No records - showing empty state');
        if (emptyCard) emptyCard.style.display = 'flex';
        return;
    }

    console.log('Displaying', records.length, 'records as cards');
    if (emptyCard) emptyCard.style.display = 'none';

    // Create card for each record
    records.forEach((record, index) => {
        console.log(`Creating card ${index + 1}:`, record);

        // Determine badge color based on type
        let badgeClass = '';
        let badgeColor = '';
        if (record.type === 'Prescription') {
            badgeClass = 'badge-prescription';
            badgeColor = '#FFA726';
        } else if (record.type.includes('X-Ray') || record.type === 'Imaging') {
            badgeClass = 'badge-imaging';
            badgeColor = '#EF5350';
        } else if (record.type === 'Blood Test' || record.type.includes('Lab')) {
            badgeClass = 'badge-lab';
            badgeColor = '#42A5F5';
        } else {
            badgeClass = 'badge-other';
            badgeColor = '#66BB6A';
        }

        const card = document.createElement('div');
        card.className = 'record-card';
        card.innerHTML = `
            <div class="record-badge ${badgeClass}" style="background-color: ${badgeColor};">
                ${record.type}
            </div>
            <h3 class="record-title">${record.title}</h3>
            <div class="record-meta">
                <div class="record-meta-item">
                    <i class="far fa-calendar"></i>
                    <span>${formatDate(record.date)}</span>
                </div>
                ${record.doctor !== 'N/A' ? `
                <div class="record-meta-item">
                    <i class="fas fa-user-md"></i>
                    <span>${record.doctor}</span>
                </div>
                ` : ''}
                ${record.hospital !== 'N/A' ? `
                <div class="record-meta-item">
                    <i class="fas fa-hospital"></i>
                    <span>${record.hospital}</span>
                </div>
                ` : ''}
                <div class="record-meta-item">
                    <i class="fas fa-file"></i>
                    <span>${record.fileType} • ${(record.fileSize ? (record.fileSize / 1024).toFixed(1) : '0')} KB</span>
                </div>
            </div>
            <div class="record-actions">
                <button class="btn-action btn-view" onclick="viewMedicalRecord(${record.id})" title="View">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn-action btn-download" onclick="downloadMedicalRecord(${record.id})" title="Download">
                    <i class="fas fa-download"></i> Download
                </button>
                <button class="btn-action btn-share" onclick="shareMedicalRecord(${record.id})" title="Share">
                    <i class="fas fa-share-alt"></i> Share
                </button>
            </div>
        `;

        container.appendChild(card);
    });
    console.log('Successfully added all cards to grid');
}

function updateSummaryCards(stats) {
    // Update total records
    document.getElementById('totalRecordsCount').textContent = stats.total || 0;

    // Update category counts
    const labTests = (stats.byType['Blood Test'] || 0) + (stats.byType['Urine Test'] || 0);
    const imaging = (stats.byType['X-Ray'] || 0) + (stats.byType['MRI'] || 0) + (stats.byType['CT Scan'] || 0) + (stats.byType['Ultrasound'] || 0);
    const other = stats.total - labTests - imaging;

    document.getElementById('labTestsCount').textContent = labTests;
    document.getElementById('imagingCount').textContent = imaging;
    document.getElementById('otherReportsCount').textContent = Math.max(0, other);

    // Update dashboard total records stat
    const dashboardStat = document.getElementById('totalRecords');
    if (dashboardStat) {
        dashboardStat.textContent = stats.total || 0;
    }
}

function handleFilterChange(e) {
    // Remove active class from all tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Add active class to clicked tab
    e.currentTarget.classList.add('active');

    // Get filter type
    const filterType = e.currentTarget.getAttribute('data-type');
    currentFilter = filterType;

    // Load filtered records
    loadMedicalRecords(filterType);
}

function viewMedicalRecord(recordId) {
    showNotification('View functionality coming soon!', 'info');
    // TODO: Implement view modal with document preview
}

function downloadMedicalRecord(recordId) {
    window.location.href = `/api/medical-records/download/${recordId}`;
    showNotification('Downloading medical record...', 'success');
}

function shareMedicalRecord(recordId) {
    showNotification('Share functionality coming soon!', 'info');
    // TODO: Implement share with doctor/hospital
}

function handleExportRecords() {
    showNotification('Export functionality coming soon!', 'info');
    // TODO: Implement CSV/PDF export
}

function handleShareRecords() {
    showNotification('Share functionality coming soon!', 'info');
    // TODO: Implement share via email or link
}

// Make functions globally accessible
window.viewMedicalRecord = viewMedicalRecord;
window.downloadMedicalRecord = downloadMedicalRecord;
window.shareMedicalRecord = shareMedicalRecord;
window.loadMedicalRecords = loadMedicalRecords;
window.displayRecordsTable = displayRecordsTable;

// Debug helper
window.debugMedicalRecords = function () {
    console.log('=== DEBUG INFO ===');
    console.log('Container exists:', !!document.getElementById('recordsGridContainer'));
    console.log('Empty card exists:', !!document.getElementById('emptyStateCard'));
    console.log('Medical records page active:', document.getElementById('medical-records-page')?.classList.contains('active'));
    loadMedicalRecords();
};

// ============================================
// ALLERGY MODULE
// ============================================

// Vaccination module state
const vaccinationState = {
    q: '',
    status: 'all',
    category: '',
    year: ''
};

function initializeVaccinationModule() {
    const page = document.getElementById('vaccination-page');
    if (!page) return;

    const searchInput = document.getElementById('vaccinationSearchInput');
    const statusFilter = document.getElementById('vaccinationStatusFilter');
    const categoryFilter = document.getElementById('vaccinationCategoryFilter');
    const yearFilter = document.getElementById('vaccinationYearFilter');
    const resetBtn = document.getElementById('vaccinationResetFilters');
    const addBtn = document.getElementById('addVaccinationBtn');
    const emptyAddBtn = document.getElementById('vaccinationEmptyAddBtn');

    const debouncedFetch = debounce(loadVaccinationData, 300);

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            vaccinationState.q = e.target.value || '';
            debouncedFetch();
        });
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            vaccinationState.status = e.target.value || 'all';
            loadVaccinationData();
        });
    }
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            vaccinationState.category = e.target.value || '';
            loadVaccinationData();
        });
    }
    if (yearFilter) {
        yearFilter.addEventListener('change', (e) => {
            vaccinationState.year = e.target.value || '';
            loadVaccinationData();
        });
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            vaccinationState.q = '';
            vaccinationState.status = 'all';
            vaccinationState.category = '';
            vaccinationState.year = '';
            if (searchInput) searchInput.value = '';
            if (statusFilter) statusFilter.value = 'all';
            if (categoryFilter) categoryFilter.value = '';
            if (yearFilter) yearFilter.value = '';
            loadVaccinationData();
        });
    }

    // Event delegation for Vaccination actions
    document.body.addEventListener('click', function (e) {
        const viewLink = e.target.closest('.js-view-vaccination');
        if (viewLink) {
            e.preventDefault();
            const url = viewLink.dataset.url || viewLink.getAttribute('href');
            if (url) {
                loadIntoModal(url, 'View Vaccination', {
                    handleSubmission: false
                });
            }
            return;
        }

        const editLink = e.target.closest('.js-edit-vaccination');
        if (editLink) {
            e.preventDefault();
            const url = editLink.dataset.url || editLink.getAttribute('href');
            if (url) {
                loadIntoModal(url, 'Edit Vaccination', {
                    handleSubmission: true,
                    initCallback: initVaccinationForm,
                    onSuccess: loadVaccinationData
                });
            }
            return;
        }
    });

    const goToAdd = () => {
        loadIntoModal('/vaccination/add', 'Add Vaccination', {
            handleSubmission: true,
            initCallback: initVaccinationForm,
            onSuccess: loadVaccinationData
        });
    };

    if (addBtn) {
        addBtn.addEventListener('click', goToAdd);
    }
    if (emptyAddBtn) {
        emptyAddBtn.addEventListener('click', goToAdd);
    }

    // Load initial data (prefer local function if available)
    if (typeof loadVaccinationData === 'function') {
        loadVaccinationData();
    } else if (typeof window.loadVaccinationData === 'function') {
        window.loadVaccinationData();
    }
}

function initVaccinationForm(formContent) {
    const fileInput = formContent.querySelector('#certificate');
    const preview = formContent.querySelector('#certificatePreview');

    if (fileInput && preview) {
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            preview.innerHTML = '';
            if (!file) return;

            const sizeKb = (file.size / 1024).toFixed(1);
            const ext = file.name.split('.').pop().toUpperCase();
            const wrapper = document.createElement('div');
            wrapper.className = 'file-chip';
            wrapper.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:#f9fafb;font-size:13px;margin-bottom:4px;border:1px solid #e5e7eb;';
            wrapper.innerHTML = `
                <span class="file-name" style="font-weight:500;">${file.name}</span>
                <span class="file-meta" style="color:#6b7280;">${ext} · ${sizeKb} KB</span>
            `;
            preview.appendChild(wrapper);
        });
    }
}

async function loadVaccinationData() {
    const { q, status, category, year } = vaccinationState;
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status && status !== 'all') params.set('status', status);
    if (category) params.set('category', category);
    if (year) params.set('year', year);

    try {
        const response = await fetch(`/api/vaccination?${params.toString()}`);
        const data = await response.json();

        if (!data.success) {
            console.error('Failed to load vaccination data:', data.message);
            return;
        }

        updateVaccinationStats(data.stats);
        renderVaccinationCards(data.vaccinations, data.counts);
        updateVaccinationSidebar(data.counts);
        populateVaccinationYearFilter(data.vaccinations);
    } catch (error) {
        console.error('Error loading vaccination data:', error);
        showNotification('Failed to load vaccination data.', 'error');
    }
}
// Expose for global access (navigation and other modules)
window.loadVaccinationData = loadVaccinationData;

function updateVaccinationStats(stats) {
    const totalEl = document.getElementById('vaccinationStatTotal');
    const upcomingEl = document.getElementById('vaccinationStatUpcoming');
    const overdueEl = document.getElementById('vaccinationStatOverdue');
    const updatedEl = document.getElementById('vaccinationStatUpdated');

    if (totalEl) totalEl.textContent = stats.total || 0;
    if (upcomingEl) upcomingEl.textContent = stats.upcoming || 0;
    if (overdueEl) overdueEl.textContent = stats.overdue || 0;
    if (updatedEl) {
        if (stats.last_updated) {
            const date = new Date(stats.last_updated);
            updatedEl.textContent = date.toLocaleDateString('en-CA');
        } else {
            updatedEl.textContent = 'N/A';
        }
    }
}

function renderVaccinationCards(vaccinations, counts) {
    const container = document.getElementById('vaccinationCardContainer');
    const empty = document.getElementById('vaccinationEmptyState');
    const summary = document.getElementById('vaccinationSummary');

    if (!container) return;

    // Clear existing cards
    container.querySelectorAll('.vaccination-card').forEach(c => c.remove());

    if (summary && counts) {
        summary.textContent = `Showing ${counts.filtered} of ${counts.total} records`;
    }

    if (!vaccinations || vaccinations.length === 0) {
        if (empty) empty.style.display = '';
        return;
    }

    if (empty) empty.style.display = 'none';

    vaccinations.forEach(v => {
        const card = buildVaccinationCard(v);
        container.insertAdjacentHTML('beforeend', card);
    });
}

function buildVaccinationCard(v) {
    const statusKey = (v.status || 'Completed').toLowerCase();
    const statusColor = {
        'completed': '#4CAF50',
        'scheduled': '#2196F3',
        'missed': '#FF9800',
        'upcoming': '#9C27B0',
        'overdue': '#E63946'
    }[statusKey] || '#666';

    const nextDueText = v.nextDueDate ? ` • Next due: ${v.nextDueDate}` : '';
    const manufacturerText = v.manufacturer ? `<strong>Manufacturer:</strong> ${v.manufacturer}` : '';
    const clinicText = v.hospitalClinicName ? `${v.manufacturer ? ' • ' : ''}<strong>Clinic:</strong> ${v.hospitalClinicName}` : '';
    const certButton = v.certificate ? `<a href="/vaccination/certificate/${v.id}/${v.certificate.stored_name}" class="btn btn-outline"><i class="fas fa-download"></i> Certificate</a>` : '';

    return `
        <article class="card vaccination-card">
            <div class="vaccination-card-head">
                <div>
                    <div class="kicker">${v.category}</div>
                    <h3>${v.vaccineName}</h3>
                    <p class="muted">
                        ${v.doseNumber} • ${v.vaccinationDate || 'N/A'}${nextDueText}
                    </p>
                </div>
                <span class="status-pill ${statusKey}" style="background:${statusColor}">${v.status}</span>
            </div>
            ${manufacturerText || clinicText ? `<p class="muted small">${manufacturerText}${clinicText}</p>` : ''}
            <div class="vaccination-card-actions">
                <a href="/vaccination/view/${v.id}" class="btn btn-outline js-view-vaccination" data-url="/vaccination/view/${v.id}">View</a>
                <a href="/vaccination/edit/${v.id}" class="btn btn-outline js-edit-vaccination" data-url="/vaccination/edit/${v.id}">Edit</a>
                <form method="post" action="/vaccination/delete/${v.id}" style="display:inline-block" onsubmit="return confirm('Delete this vaccination record permanently?');">
                    <button type="submit" class="btn btn-danger">Delete</button>
                </form>
                ${certButton}
            </div>
        </article>
    `;
}

function updateVaccinationSidebar(counts) {
    const statusList = document.getElementById('vaccinationStatusDistribution');
    const catList = document.getElementById('vaccinationCategoryMix');

    if (statusList && counts && counts.byStatus) {
        const statusOrder = ['Completed', 'Scheduled', 'Upcoming', 'Missed', 'Overdue'];
        statusList.innerHTML = statusOrder.map(status => {
            const count = counts.byStatus[status] || 0;
            if (!count) return '';
            const color = {
                'Completed': '#4CAF50',
                'Scheduled': '#2196F3',
                'Upcoming': '#9C27B0',
                'Missed': '#FF9800',
                'Overdue': '#E63946'
            }[status] || '#666';
            return `<li><span><span class="dot" style="background:${color}"></span>${status}</span><strong>${count}</strong></li>`;
        }).join('');
    }

    if (catList && counts && counts.byCategory) {
        catList.innerHTML = Object.entries(counts.byCategory).map(([cat, c]) => {
            if (!c) return '';
            const pct = counts.total ? Math.round((c / counts.total) * 100) : 0;
            return `<li><span>${cat}</span><strong>${c} <small>(${pct}%)</small></strong></li>`;
        }).join('');
    }
}

function populateVaccinationYearFilter(vaccinations) {
    const yearFilter = document.getElementById('vaccinationYearFilter');
    if (!yearFilter) return;

    const years = new Set();
    vaccinations.forEach(v => {
        if (v.vaccinationDate) {
            const year = v.vaccinationDate.split('-')[0];
            if (year) years.add(year);
        }
    });

    const currentValue = yearFilter.value;
    const sortedYears = Array.from(years).sort((a, b) => b - a);

    yearFilter.innerHTML = '<option value="">All</option>' +
        sortedYears.map(y => `<option value="${y}">${y}</option>`).join('');

    if (currentValue) {
        yearFilter.value = currentValue;
    }
}

const allergyState = {
    q: '',
    status: 'all'
};
let dynamicModal = null;
let allergyModalOpen = false;


async function handleDeleteAllergy(allergyId) {
    if (!confirm('Are you sure you want to delete this allergy record permanently?')) {
        return;
    }

    try {
        const response = await fetch(`/allergy/delete/${allergyId}`, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        const result = await response.json();
        if (result.success) {
            showNotification('Allergy deleted successfully.', 'success');
            loadAllergyData(); // Refresh the list
        } else {
            showNotification(result.message || 'Failed to delete allergy.', 'error');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showNotification('An error occurred while deleting the allergy record.', 'error');
    }
}

function initializeAllergyModule() {
    // This modal instance can be reused by other parts of the dashboard
    const modalEl = document.getElementById('dynamicActionModal');
    if (modalEl) {
        dynamicModal = new bootstrap.Modal(modalEl);
    }

    // Global event delegation for allergy actions on the client dashboard
    document.body.addEventListener('click', function (e) {
        const addBtn = e.target.closest('.js-add-allergy');
        if (addBtn) {
            e.preventDefault();
            loadIntoModal('/allergy/add', 'Add New Allergy', {
                configUrl: '/api/allergies/form-config',
                initCallback: initializeAllergyForm,
                onSuccess: loadAllergyData
            });
            return;
        }

        const viewLink = e.target.closest('.js-view-allergy');
        if (viewLink) {
            e.preventDefault();
            const url = viewLink.dataset.url || viewLink.getAttribute('href');
            if (url) {
                loadIntoModal(url, 'View Allergy', {
                    configUrl: '/api/allergies/form-config',
                    initCallback: initializeAllergyForm,
                    handleSubmission: false
                });
            }
            return;
        }

        const editLink = e.target.closest('.js-edit-allergy');
        if (editLink) {
            e.preventDefault();
            const url = editLink.dataset.url || editLink.getAttribute('href');
            if (url) {
                loadIntoModal(url, 'Edit Allergy', {
                    configUrl: '/api/allergies/form-config',
                    initCallback: initializeAllergyForm,
                    onSuccess: loadAllergyData
                });
            }
            return;
        }

        const deleteLink = e.target.closest('.js-delete-allergy');
        if (deleteLink) {
            e.preventDefault();
            const allergyId = deleteLink.dataset.id;
            if (allergyId) {
                handleDeleteAllergy(allergyId);
            }
        }
    });

    const searchInput = document.getElementById('allergySearchInput');
    const statusFilter = document.getElementById('allergyStatusFilter');
    const resetFilters = document.getElementById('allergyResetFilters');

    const debouncedFetch = debounce(loadAllergyData, 350);

    searchInput?.addEventListener('input', (e) => {
        allergyState.q = e.target.value;
        debouncedFetch();
    });

    statusFilter?.addEventListener('change', (e) => {
        allergyState.status = e.target.value;
        loadAllergyData();
    });

    resetFilters?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = 'all';
        allergyState.q = '';
        allergyState.status = 'all';
        if (typeof window.loadAllergyData === 'function') window.loadAllergyData();
    });

    if (typeof window.loadAllergyData === 'function') window.loadAllergyData();
}

async function loadIntoModal(url, title, config = {}) {
    const modalTitle = document.getElementById('dynamicActionModalLabel');
    const modalBody = document.getElementById('dynamicActionModalBody');

    if (!modalTitle || !modalBody || !dynamicModal) return;

    modalTitle.textContent = title;
    modalBody.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-danger" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    dynamicModal.show();

    try {
        const promises = [
            fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
        ];

        if (config.configUrl) {
            promises.push(fetch(config.configUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } }));
        }

        const results = await Promise.all(promises);
        const formRes = results[0];
        const configRes = config.configUrl ? results[1] : null;

        if (!formRes.ok) throw new Error('Could not load form HTML');
        if (configRes && !configRes.ok) throw new Error('Could not load form config');

        const html = await formRes.text();
        const configData = configRes ? await configRes.json() : null;

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const formContent = doc.querySelector('.form-card');

        if (formContent) {
            modalBody.innerHTML = ''; // Clear spinner

            const form = formContent.querySelector('form');
            console.log('Form found in modal content:', form);
            const handleSubmission = config.handleSubmission !== false; // Default to true

            if (form && handleSubmission) {
                console.log('Attaching submit listener to form');
                form.addEventListener('submit', async (e) => {
                    e.preventDefault(); // Prevent default form submission
                    console.log('Form submission intercepted by generic handler');
                    showNotification('Saving...', 'info');

                    try {
                        const formData = new FormData(form);
                        console.log('Submitting to:', form.action);
                        const response = await fetch(form.action, { // Use the form's action attribute
                            method: 'POST',
                            body: formData,
                            headers: {
                                'X-Requested-With': 'XMLHttpRequest'
                            }
                        });

                        console.log('Response status:', response.status);
                        const result = await response.json();
                        console.log('Response data:', result);

                        if (result.success) {
                            showNotification(result.message, 'success');
                            dynamicModal.hide();
                            if (typeof config.onSuccess === 'function') {
                                config.onSuccess();
                            }
                        } else {
                            showNotification(result.message || 'An error occurred.', 'error');
                        }
                    } catch (error) {
                        console.error('Form submission error:', error);
                        showNotification('An unexpected error occurred during submission.', 'error');
                    }
                });
            }

            // Prevent clicks inside modal content from bubbling to body
            formContent.addEventListener('click', (ev) => ev.stopPropagation());
            modalBody.appendChild(formContent);

            // Initialize the dynamic features of the form
            if (typeof config.initCallback === 'function') {
                config.initCallback(formContent, configData);
            }
        } else {
            modalBody.innerHTML = '<p class="text-center text-danger">Could not load form content.</p>';
        }
    } catch (error) {
        console.error('Failed to load modal content:', error);
        modalBody.innerHTML = `<p class="text-center text-danger">Error loading content: ${error.message}</p>`;
    }
}

function initializeAllergyForm(formElement, config) {
    const categorySelect = formElement.querySelector('[data-category-select]');
    const allergenInput = formElement.querySelector('#allergenInput');
    const suggestionList = formElement.querySelector('[data-suggestion-list]');
    const datalist = formElement.querySelector('#knownAllergens');

    if (!config || !config.allergenLibrary || !config.knownAllergens) {
        console.error("Allergy form config is missing or invalid.");
        return;
    }

    const uniqueSuggestions = (items = []) => {
        const seen = new Set();
        return items.filter((item) => {
            const lower = item.toLowerCase();
            if (seen.has(lower)) return false;
            seen.add(lower);
            return true;
        });
    };

    const renderSuggestions = (category) => {
        const pool = config.allergenLibrary[category] && config.allergenLibrary[category].length
            ? config.allergenLibrary[category]
            : config.knownAllergens;
        const suggestions = uniqueSuggestions(pool);

        if (datalist) {
            datalist.innerHTML = suggestions.map((value) => `<option value="${value}"></option>`).join('');
        }
        if (!suggestionList) return;

        suggestionList.innerHTML = suggestions
            .map((value) => `
                    <button type="button" class="suggestion-chip" data-suggestion="${value}" aria-pressed="false">
                        <span class="chip-label">${value}</span>
                    </button>
                `)
            .join('');

        const chips = suggestionList.querySelectorAll('.suggestion-chip');
        chips.forEach((button) => {
            button.addEventListener('click', (e) => {
                const val = button.dataset.suggestion || '';
                if (allergenInput) {
                    allergenInput.value = val;
                    allergenInput.focus();
                }
                // mark the clicked chip as active and reset others
                chips.forEach((c) => { c.setAttribute('aria-pressed', 'false'); c.classList.remove('active'); });
                button.setAttribute('aria-pressed', 'true');
                button.classList.add('active');
                try {
                    button.animate(
                        [{ transform: 'scale(1)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }],
                        { duration: 160 }
                    );
                } catch (err) { /* animate not supported */ }
            });
        });
    };

    if (categorySelect) {
        categorySelect.addEventListener('change', (event) => {
            renderSuggestions(event.target.value);
        });
        // Initial render for suggestions
        renderSuggestions(categorySelect.value || Object.keys(config.allergenLibrary)[0] || 'Other');
    }
}


/**
 * Fetches allergy data from the API and renders it.
 */
async function loadAllergyData() {
    const { q, status } = allergyState;
    const params = new URLSearchParams({ q, status });

    try {
        const response = await fetch(`/api/allergies?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
            renderAllergyCards(data.allergies);
            renderAllergyStats(data.stats, data.counts, data.palette);
        } else {
            console.error('Failed to load allergies:', data.message);
            renderAllergyCards([]);
        }
    } catch (error) {
        console.error('Error fetching allergy data:', error);
        renderAllergyCards([]);
    }
}

/**
 * Renders the stats panels for the allergy page.
 */
function renderAllergyStats(stats, counts, palette) {
    const severityContainer = document.getElementById('allergySeverityDistribution');
    const categoryContainer = document.getElementById('allergyCategoryMix');
    const summaryEl = document.getElementById('allergySummary');

    if (summaryEl && counts) {
        summaryEl.textContent = `Showing ${counts.filtered} of ${counts.total} records`;
    }

    if (severityContainer && stats && palette) {
        const severityOrder = ['life-threatening', 'severe', 'moderate', 'mild'];
        severityContainer.innerHTML = severityOrder.map(key => {
            const statKey = key === 'life-threatening' ? 'life_threatening' : key;
            const count = stats[statKey] || 0;
            if (count === 0) return '';
            const label = key.replace('-', ' ').replace(/\b\w/g, char => char.toUpperCase());
            return `
                <li>
                  <span>
                    <span class="dot" style="background-color:${palette[key]}"></span>
                    ${label}
                  </span>
                  <strong>${count}</strong>
                </li>
            `;
        }).join('');
    }

    if (categoryContainer && counts && counts.categories) {
        categoryContainer.innerHTML = Object.entries(counts.categories).map(([category, count]) => {
            if (count === 0) return '';
            const percentage = counts.total > 0 ? ((count / counts.total) * 100).toFixed(0) : 0;
            return `
                <li>
                  <span>${category}</span>
                  <strong>${count} <small>(${percentage}%)</small></strong>
                </li>
            `;
        }).join('');
    }
}


/**
 * Renders allergy data as cards in the UI.
 * @param {Array} allergies - An array of allergy objects.
 */
function renderAllergyCards(allergies) {
    const container = document.getElementById('allergyCardContainer');
    const emptyStateTemplate = document.getElementById('allergyEmptyState');

    if (!container) {
        console.error('Allergy container not found!');
        return;
    }

    // Always clear previous cards
    const existingCards = container.querySelectorAll('.allergy-card');
    existingCards.forEach(card => card.remove());
    if (container.querySelector('.empty-state')) {
        container.querySelector('.empty-state').remove();
    }


    if (!allergies || allergies.length === 0) {
        if (emptyStateTemplate) {
            const clone = emptyStateTemplate.cloneNode(true);
            clone.style.display = '';
            clone.id = '';
            container.innerHTML = '';
            container.appendChild(clone);
        } else {
            container.innerHTML = `
              <div class="card empty-state">
                <h3>No allergy information yet</h3>
                <p>Add your first allergy to keep critical alerts handy for doctors and emergency responders.</p>
                <a class="btn btn-primary js-add-allergy" href="#">Add New Allergy</a>
              </div>
            `;
        }
        return;
    }

    allergies.forEach(allergy => {
        const cardHTML = buildAllergyCard(allergy);
        container.insertAdjacentHTML('beforeend', cardHTML);
    });
}

/**
 * Builds the HTML for a single allergy card.
 * @param {Object} allergy - An allergy object.
 * @returns {string} - The HTML string for the card.
 */
function buildAllergyCard(allergy) {
    const toTitle = (value = '') => value.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

    const reactions = (allergy.reactions || []).map((reaction) => `<span class="reaction-chip">${reaction}</span>`).join('') || '<span class="muted">No reactions captured.</span>';
    const severityClass = allergy.severity || 'mild';
    const severityLabel = toTitle(allergy.severity || '');
    const statusClass = allergy.active ? 'active' : 'archived';
    const statusLabel = allergy.active ? 'Active' : 'Archived';

    return `
      <article class="card allergy-card" data-allergy-id="${allergy.id}">
        <div class="allergy-card-head">
          <div>
            <div class="kicker">${allergy.category}</div>
            <h3>${allergy.allergen}</h3>
            <p class="muted">
              First reaction: ${allergy.firstReactionDate ? formatDate(allergy.firstReactionDate) : 'N/A'}
              • <span class="status-pill ${statusClass}">${statusLabel}</span>
            </p>
          </div>
          <span class="severity-pill ${severityClass}" style="background:${allergy.severityColor || '#9B0000'}">
            ${severityLabel}
          </span>
        </div>
        <div class="timeline">
          <p><strong>Reaction summary:</strong> ${allergy.reactionSummary || '—'}</p>
          <p><strong>Notes:</strong> ${allergy.notes || 'No notes added.'}</p>
        </div>
        <div class="reactions-grid">
          ${reactions}
        </div>
        <div class="allergy-card-actions">
          <a class="btn btn-outline js-view-allergy" href="#" data-url="/allergy/view/${allergy.id}">View</a>
          <a class="btn btn-outline js-edit-allergy" href="#" data-url="/allergy/edit/${allergy.id}">Edit</a>
          <a class="btn btn-danger js-delete-allergy" href="#" data-id="${allergy.id}">Delete</a>
        </div>
      </article>
    `;
}

// ============================================
// APPOINTMENTS MODULE
// ============================================

function initializeAppointmentsModule() {
    bookingModal = document.getElementById('appointmentBookingModal');

    document.getElementById('bookAppointmentBtn')?.addEventListener('click', () => openBookingWizard());
    document.getElementById('quickBookBtn')?.addEventListener('click', () => openBookingWizard());
    document.getElementById('emptyStateBookBtn')?.addEventListener('click', () => openBookingWizard());
    document.getElementById('findDoctorCTA')?.addEventListener('click', () => openBookingWizard({ startStep: 3 }));
    document.getElementById('quickFindDoctorBtn')?.addEventListener('click', () => openBookingWizard({ startStep: 3 }));
    document.getElementById('quickVideoBtn')?.addEventListener('click', () => openBookingWizard({ defaultType: 'Teleconsultation', forceMode: 'Video' }));
    document.getElementById('quickEmergencyBtn')?.addEventListener('click', triggerEmergencyFlow);

    document.querySelectorAll('.appointments-tab-btn').forEach(tabBtn => {
        tabBtn.addEventListener('click', (event) => {
            const tab = event.currentTarget.getAttribute('data-tab');
            switchAppointmentTab(tab);
        });
    });

    document.getElementById('appointmentsListContainer')?.addEventListener('click', handleAppointmentListClick);
    document.getElementById('appointmentsCalendarPrev')?.addEventListener('click', () => changeAppointmentsCalendarMonth(-1));
    document.getElementById('appointmentsCalendarNext')?.addEventListener('click', () => changeAppointmentsCalendarMonth(1));
    document.getElementById('clearAppointmentsFilter')?.addEventListener('click', clearAppointmentFilter);

    document.getElementById('closeBookingModal')?.addEventListener('click', closeBookingWizard);
    document.getElementById('bookingBackBtn')?.addEventListener('click', handleBookingBack);
    document.getElementById('bookingNextBtn')?.addEventListener('click', handleBookingNext);
    document.getElementById('bookingFinishBtn')?.addEventListener('click', () => {
        closeBookingWizard();
        appointmentState.filterDate = null;
        switchAppointmentTab('upcoming');
    });

    document.getElementById('bookingCalendarPrev')?.addEventListener('click', () => handleBookingCalendarNav(-1));
    document.getElementById('bookingCalendarNext')?.addEventListener('click', () => handleBookingCalendarNav(1));
    document.getElementById('doctorSearchInput')?.addEventListener('input', handleDoctorSearch);
    document.getElementById('doctorModeFilter')?.addEventListener('change', () => loadDoctorResults());
    document.getElementById('medicalUploadsInput')?.addEventListener('change', handleMedicalUploadsChange);
    document.getElementById('medicalUploadsDropzone')?.addEventListener('click', () => document.getElementById('medicalUploadsInput')?.click());

    loadAppointmentsOverview();
}

async function loadAppointmentsOverview() {
    try {
        const response = await fetch('/appointments');
        const data = await response.json();

        if (!data.success) {
            showNotification('Unable to load appointments right now', 'error');
            return;
        }

        appointmentState.stats = data.stats || appointmentState.stats;
        appointmentState.grouped = data.appointments || appointmentState.grouped;
        appointmentState.highlights = data.calendarHighlights || [];
        appointmentState.meta.appointmentTypes = data.appointmentTypes || [];
        appointmentState.meta.consultationModes = data.consultationModes || [];
        appointmentState.meta.specialties = data.specialties || [];
        appointmentState.calendarMap = buildCalendarMap(appointmentState.grouped);

        renderAppointmentStats();
        renderAppointmentsList(appointmentState.currentTab);
        renderAppointmentsCalendar();
        renderAppointmentTypeOptions(appointmentState.meta.appointmentTypes);
        renderSpecialtyOptions(appointmentState.meta.specialties);
        renderConsultationModes(appointmentState.meta.consultationModes);
    } catch (error) {
        console.error('Error loading appointments:', error);
        showNotification('Error loading appointments', 'error');
    }
}

function buildCalendarMap(grouped) {
    const map = {};
    Object.keys(grouped).forEach(key => {
        grouped[key].forEach(appt => {
            if (!map[appt.appointmentDate]) {
                map[appt.appointmentDate] = [];
            }
            map[appt.appointmentDate].push(appt.status);
        });
    });
    return map;
}

function renderAppointmentStats() {
    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value ?? 0;
        }
    };

    setValue('statUpcomingCount', appointmentState.stats.upcoming);
    setValue('statCompletedCount', appointmentState.stats.completed);
    setValue('statRescheduledCount', appointmentState.stats.rescheduled);
    setValue('statCancelledCount', appointmentState.stats.cancelled);
}

function renderAppointmentsList(tabName = 'upcoming') {
    appointmentState.currentTab = tabName;
    const container = document.getElementById('appointmentsListContainer');
    const emptyState = document.getElementById('appointmentsEmptyState');
    const filterBanner = document.getElementById('appointmentsFilterBanner');
    const filterLabel = document.getElementById('appointmentsFilterLabel');

    if (!container) return;

    container.innerHTML = '';
    const records = appointmentState.grouped[tabName] || [];
    const filteredRecords = appointmentState.filterDate
        ? records.filter(appt => appt.appointmentDate === appointmentState.filterDate)
        : records;

    if (appointmentState.filterDate && filterBanner && filterLabel) {
        filterBanner.style.display = 'flex';
        filterLabel.textContent = `Showing appointments on ${formatDateDisplay(appointmentState.filterDate)}`;
    } else if (filterBanner) {
        filterBanner.style.display = 'none';
    }

    if (!filteredRecords.length) {
        if (emptyState) {
            container.appendChild(emptyState);
            emptyState.style.display = 'block';
        }
        return;
    }

    filteredRecords.forEach(appointment => {
        const card = createAppointmentCard(appointment);
        container.appendChild(card);
    });
}

function createAppointmentCard(appointment) {
    const card = document.createElement('div');
    card.className = 'appointment-card';
    const statusClass = appointment.status === 'cancelled'
        ? 'status-cancelled'
        : appointment.status === 'completed'
            ? 'status-completed'
            : appointment.status === 'rescheduled'
                ? 'status-upcoming'
                : appointmentState.currentTab === 'today'
                    ? 'status-today'
                    : 'status-upcoming';

    const actionButtons = [];

    if (appointment.status !== 'cancelled') {
        actionButtons.push(`<button class="primary" data-appointment-action="checkin" data-appointment-id="${appointment.id}">
            <i class="fas fa-check"></i> Check-in
        </button>`);
        actionButtons.push(`<button data-appointment-action="reschedule" data-appointment-id="${appointment.id}">
            <i class="fas fa-calendar-alt"></i> Reschedule
        </button>`);
        actionButtons.push(`<button data-appointment-action="cancel" data-appointment-id="${appointment.id}">
            <i class="fas fa-ban"></i> Cancel
        </button>`);
    }

    if (appointment.consultationMode?.toLowerCase() === 'video') {
        actionButtons.push(`<button data-appointment-action="video" data-appointment-id="${appointment.id}">
            <i class="fas fa-video"></i> Join Video
        </button>`);
    }

    actionButtons.push(`<button data-appointment-action="view" data-appointment-id="${appointment.id}">
        <i class="fas fa-eye"></i> Details
    </button>`);

    card.innerHTML = `
        <div class="appointment-card-top">
            <div class="doctor-info">
                <img src="${appointment.doctorPhoto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(appointment.doctorName)}" alt="${appointment.doctorName}">
                <div>
                    <h4>${appointment.doctorName}</h4>
                    <p class="doctor-specialty">${appointment.doctorSpecialty} • ${appointment.consultationMode}</p>
                    <small class="doctor-specialty">Ref: ${appointment.referenceCode}</small>
                </div>
            </div>
            <span class="status-pill ${statusClass}">${appointment.status.replace('-', ' ')}</span>
        </div>
        <div class="appointment-card-body">
            <div class="appointment-meta">
                <i class="fas fa-calendar"></i>
                <span>${formatDateDisplay(appointment.appointmentDate)}</span>
            </div>
            <div class="appointment-meta">
                <i class="fas fa-clock"></i>
                <span>${formatTimeDisplay(appointment.appointmentTime)}</span>
            </div>
            <div class="appointment-meta">
                <i class="fas fa-map-marker-alt"></i>
                <span>${appointment.clinicLocation || 'Shared after confirmation'}</span>
            </div>
        </div>
        <div class="appointment-card-actions">
            ${actionButtons.join('')}
        </div>
    `;

    return card;
}

function renderAppointmentsCalendar() {
    const calendarEl = document.getElementById('appointmentsMiniCalendar');
    const monthLabel = document.getElementById('appointmentsCalendarMonth');
    if (!calendarEl || !monthLabel) return;

    const year = appointmentsCalendarDate.getFullYear();
    const month = appointmentsCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const previousMonthDays = new Date(year, month, 0).getDate();

    monthLabel.textContent = appointmentsCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    calendarEl.innerHTML = '';

    // Previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = previousMonthDays - i;
        const dayEl = document.createElement('div');
        dayEl.className = 'mini-calendar-day';
        dayEl.style.opacity = '0.4';
        dayEl.textContent = day;
        calendarEl.appendChild(dayEl);
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEl = document.createElement('div');
        dayEl.className = 'mini-calendar-day';
        dayEl.textContent = day;

        if (appointmentState.calendarMap[dateKey]) {
            dayEl.classList.add('has-appointment');
            if (appointmentState.calendarMap[dateKey].includes('cancelled')) {
                dayEl.classList.add('cancelled');
            }
        }

        const today = new Date();
        if (
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
        ) {
            dayEl.classList.add('today');
        }

        dayEl.addEventListener('click', () => handleCalendarDayClick(dateKey));
        calendarEl.appendChild(dayEl);
    }

    // Fill remaining cells to complete grid
    while (calendarEl.children.length < 42) {
        const day = calendarEl.children.length - (firstDay + daysInMonth) + 1;
        const dayEl = document.createElement('div');
        dayEl.className = 'mini-calendar-day';
        dayEl.style.opacity = '0.4';
        dayEl.textContent = day;
        calendarEl.appendChild(dayEl);
    }
}

function handleCalendarDayClick(dateKey) {
    appointmentState.filterDate = appointmentState.filterDate === dateKey ? null : dateKey;
    renderAppointmentsList(appointmentState.currentTab);
}

function clearAppointmentFilter() {
    appointmentState.filterDate = null;
    renderAppointmentsList(appointmentState.currentTab);
}

function changeAppointmentsCalendarMonth(direction) {
    appointmentsCalendarDate.setMonth(appointmentsCalendarDate.getMonth() + direction);
    renderAppointmentsCalendar();
}

function switchAppointmentTab(tabName) {
    document.querySelectorAll('.appointments-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        }
    });
    renderAppointmentsList(tabName);
}

function handleAppointmentListClick(event) {
    const actionBtn = event.target.closest('[data-appointment-action]');
    if (!actionBtn) return;
    const action = actionBtn.getAttribute('data-appointment-action');
    const appointmentId = actionBtn.getAttribute('data-appointment-id');
    handleAppointmentAction(action, appointmentId);
}

async function handleAppointmentAction(action, appointmentId) {
    if (!appointmentId) return;

    if (action === 'cancel') {
        if (!window.confirm('Cancel this appointment?')) return;
        await postAppointmentAction(`/appointments/cancel/${appointmentId}`);
        return;
    }

    if (action === 'checkin') {
        await postAppointmentAction(`/appointments/checkin/${appointmentId}`);
        return;
    }

    if (action === 'video') {
        showNotification('Video link will be shared closer to appointment time.', 'info');
        return;
    }

    if (action === 'view') {
        try {
            const response = await fetch(`/appointments/view/${appointmentId}`);
            const data = await response.json();
            if (data.success) {
                const appt = data.appointment;
                showNotification(`Appointment with ${appt.doctorName} on ${formatDateDisplay(appt.appointmentDate)} at ${formatTimeDisplay(appt.appointmentTime)}`, 'info');
            }
        } catch (error) {
            console.error(error);
        }
        return;
    }

    if (action === 'reschedule') {
        try {
            const response = await fetch(`/appointments/view/${appointmentId}`);
            const data = await response.json();
            if (data.success) {
                prefillBookingForAppointment(data.appointment);
            }
        } catch (error) {
            console.error(error);
            showNotification('Unable to load appointment for rescheduling', 'error');
        }
    }
}

async function postAppointmentAction(url, payload) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload ? JSON.stringify(payload) : null
        });
        const data = await response.json();
        if (data.success) {
            showNotification('Appointment updated successfully', 'success');
            loadAppointmentsOverview();
        } else {
            showNotification(data.message || 'Action failed', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Action failed', 'error');
    }
}

function triggerEmergencyFlow() {
    showNotification('Emergency team has been notified. A coordinator will contact you shortly.', 'info');
    openBookingWizard({ defaultType: 'Emergency Care', forceMode: 'Emergency' });
}

function openBookingWizard(options = {}) {
    if (!bookingModal) return;

    resetBookingState(options.intent || 'new');

    if (options.defaultType) {
        bookingState.data.appointmentType = options.defaultType;
    }
    if (options.forceMode) {
        bookingState.data.consultationMode = options.forceMode;
    }

    bookingModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const startStep = options.startStep || (bookingState.data.appointmentType ? 2 : 1);
    setBookingStep(startStep);
}

function closeBookingWizard() {
    if (!bookingModal) return;
    bookingModal.style.display = 'none';
    document.body.style.overflow = '';
    resetBookingState();
}

function resetBookingState(intent = 'new') {
    const previousData = bookingState.data || {};
    bookingState.intent = intent;
    bookingState.currentStep = 1;
    bookingState.data = {
        appointmentType: previousData.appointmentType && intent === 'new' ? previousData.appointmentType : null,
        specialty: null,
        doctor: null,
        appointmentDate: null,
        appointmentTime: null,
        slotLabel: null,
        consultationMode: previousData.consultationMode && intent === 'new' ? previousData.consultationMode : null,
        medical: {
            chiefComplaint: '',
            symptoms: '',
            severity: '',
            notes: '',
            attachments: []
        }
    };
    bookingState.targetAppointmentId = null;
    bookingState.availableSlots = {};
    bookingCalendarCursor = new Date();
    updateMedicalFormInputs();
}

function setBookingStep(step) {
    bookingState.currentStep = Math.min(Math.max(step, 1), 9);

    document.querySelectorAll('.booking-step').forEach(stepEl => {
        const stepNumber = parseInt(stepEl.getAttribute('data-step'), 10);
        stepEl.classList.toggle('active', stepNumber === bookingState.currentStep);
    });

    updateBookingProgress();
    updateBookingNavigation();

    switch (bookingState.currentStep) {
        case 1:
            renderAppointmentTypeOptions(appointmentState.meta.appointmentTypes);
            break;
        case 2:
            renderSpecialtyOptions(appointmentState.meta.specialties);
            break;
        case 3:
            loadDoctorResults();
            break;
        case 4:
            renderBookingCalendar();
            if (bookingState.data.appointmentDate && bookingState.data.doctor) {
                loadTimeSlots();
            }
            break;
        case 5:
            renderSlotGroups();
            break;
        case 6:
            renderConsultationModes(appointmentState.meta.consultationModes);
            break;
        case 8:
            updateReviewSummary();
            break;
        default:
            break;
    }
}

function updateBookingProgress() {
    document.querySelectorAll('.booking-progress-step').forEach(stepEl => {
        const stepNumber = parseInt(stepEl.getAttribute('data-step'), 10);
        stepEl.classList.toggle('active', stepNumber <= bookingState.currentStep);
    });
}

function updateBookingNavigation() {
    const backBtn = document.getElementById('bookingBackBtn');
    const nextBtn = document.getElementById('bookingNextBtn');

    if (!backBtn || !nextBtn) return;

    backBtn.disabled = bookingState.currentStep === 1;
    backBtn.style.display = bookingState.currentStep >= 9 ? 'none' : 'flex';

    if (bookingState.currentStep === 9) {
        nextBtn.style.display = 'none';
    } else {
        nextBtn.style.display = 'flex';
        nextBtn.innerHTML = bookingState.currentStep === 8
            ? (bookingState.intent === 'reschedule' ? 'Confirm Reschedule <i class="fas fa-check"></i>' : 'Confirm Appointment <i class="fas fa-check"></i>')
            : 'Continue <i class="fas fa-arrow-right"></i>';
    }
}

function validateBookingStep(step) {
    switch (step) {
        case 1:
            if (!bookingState.data.appointmentType) {
                showNotification('Select an appointment type to continue', 'warning');
                return false;
            }
            return true;
        case 2:
            if (!bookingState.data.specialty) {
                showNotification('Please choose a specialty', 'warning');
                return false;
            }
            return true;
        case 3:
            if (!bookingState.data.doctor) {
                showNotification('Select a doctor to continue', 'warning');
                return false;
            }
            return true;
        case 4:
            if (!bookingState.data.appointmentDate) {
                showNotification('Please choose a date', 'warning');
                return false;
            }
            return true;
        case 5:
            if (!bookingState.data.appointmentTime) {
                showNotification('Select a time slot', 'warning');
                return false;
            }
            return true;
        case 6:
            if (!bookingState.data.consultationMode) {
                showNotification('Select consultation mode', 'warning');
                return false;
            }
            return true;
        default:
            return true;
    }
}

function handleBookingNext() {
    if (!validateBookingStep(bookingState.currentStep)) {
        return;
    }

    if (bookingState.currentStep === 7) {
        collectMedicalInfo();
    }

    if (bookingState.currentStep === 8) {
        submitAppointmentBooking();
        return;
    }

    setBookingStep(bookingState.currentStep + 1);
}

function handleBookingBack() {
    setBookingStep(bookingState.currentStep - 1);
}

function renderAppointmentTypeOptions(types = []) {
    const container = document.getElementById('appointmentTypeOptions');
    if (!container) return;
    container.innerHTML = '';

    if (!types.length) {
        container.innerHTML = '<p>No appointment types configured.</p>';
        return;
    }

    types.forEach(type => {
        const card = document.createElement('div');
        card.className = 'selection-card';
        if (bookingState.data.appointmentType === type) {
            card.classList.add('active');
        }
        card.textContent = type;
        card.addEventListener('click', () => {
            bookingState.data.appointmentType = type;
            renderAppointmentTypeOptions(types);
        });
        container.appendChild(card);
    });
}

function renderSpecialtyOptions(list = []) {
    const container = document.getElementById('specialtyOptions');
    if (!container) return;
    container.innerHTML = '';

    list.forEach(spec => {
        const chip = document.createElement('button');
        chip.className = 'specialty-chip';
        if (bookingState.data.specialty === spec) {
            chip.classList.add('active');
        }
        chip.textContent = spec;
        chip.addEventListener('click', () => {
            bookingState.data.specialty = spec;
            renderSpecialtyOptions(list);
        });
        container.appendChild(chip);
    });
}

async function loadDoctorResults(extraFilters = {}) {
    try {
        const query = new URLSearchParams({
            specialty: bookingState.data.specialty || '',
            mode: extraFilters.mode || document.getElementById('doctorModeFilter')?.value || '',
            query: extraFilters.query || document.getElementById('doctorSearchInput')?.value || ''
        });

        const response = await fetch(`/appointments/doctors?${query.toString()}`);
        const data = await response.json();
        if (data.success) {
            bookingState.doctorResults = data.doctors || [];
            renderDoctorCards(bookingState.doctorResults);
        }
    } catch (error) {
        console.error(error);
        showNotification('Unable to load doctors', 'error');
    }
}

function renderDoctorCards(doctors = []) {
    const container = document.getElementById('doctorResultsContainer');
    if (!container) return;
    container.innerHTML = '';

    if (!doctors.length) {
        container.innerHTML = `
            <div class="empty-result">
                <i class="fas fa-user-md"></i>
                <p>No doctors found for this specialty.</p>
            </div>
        `;
        return;
    }

    doctors.forEach(doc => {
        const card = document.createElement('div');
        card.className = 'doctor-card';
        if (bookingState.data.doctor?.id === doc.id) {
            card.classList.add('active');
        }
        card.innerHTML = `
            <img src="${doc.photo}" alt="${doc.name}">
            <div>
                <h4>${doc.name}</h4>
                <p class="doctor-meta">${doc.specialty} • ${doc.hospital}</p>
            </div>
        `;
        card.addEventListener('click', () => {
            bookingState.data.doctor = doc;
            renderDoctorCards(doctors);
        });
        container.appendChild(card);
    });
}

function handleDoctorSearch(event) {
    const query = event.target.value;
    clearTimeout(doctorSearchTimeout);
    doctorSearchTimeout = setTimeout(() => {
        loadDoctorResults({ query });
    }, 300);
}

function renderBookingCalendar() {
    const calendar = document.getElementById('bookingCalendarDays');
    const label = document.getElementById('bookingCalendarMonth');
    if (!calendar || !label) return;

    const year = bookingCalendarCursor.getFullYear();
    const month = bookingCalendarCursor.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    label.textContent = bookingCalendarCursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    calendar.innerHTML = '';

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEl = document.createElement('div');
        dayEl.className = 'booking-calendar-day';
        dayEl.textContent = day;

        if (bookingState.data.appointmentDate === dateStr) {
            dayEl.classList.add('active');
        }

        dayEl.addEventListener('click', () => {
            bookingState.data.appointmentDate = dateStr;
            bookingState.data.appointmentTime = null;
            bookingState.data.slotLabel = null;
            renderBookingCalendar();
            loadTimeSlots();
        });

        calendar.appendChild(dayEl);
    }
}

function handleBookingCalendarNav(direction) {
    bookingCalendarCursor.setMonth(bookingCalendarCursor.getMonth() + direction);
    renderBookingCalendar();
}

async function loadTimeSlots() {
    if (!bookingState.data.doctor || !bookingState.data.appointmentDate) {
        renderSlotGroups();
        return;
    }

    try {
        const params = new URLSearchParams({
            doctorId: bookingState.data.doctor.id,
            date: bookingState.data.appointmentDate
        });
        const response = await fetch(`/appointments/select-slot?${params.toString()}`);
        const data = await response.json();
        if (data.success) {
            bookingState.availableSlots = data.slots || {};
            renderSlotGroups();
        }
    } catch (error) {
        console.error(error);
        showNotification('Unable to load slots', 'error');
    }
}

function renderSlotGroups() {
    const container = document.getElementById('slotSelectionContainer');
    if (!container) return;
    container.innerHTML = '';

    if (!bookingState.data.appointmentDate) {
        container.innerHTML = `
            <div class="slot-placeholder">
                <i class="fas fa-clock"></i>
                <p>Select a date to load available slots.</p>
            </div>
        `;
        return;
    }

    const slots = bookingState.availableSlots;
    if (!slots || Object.keys(slots).length === 0) {
        container.innerHTML = `
            <div class="slot-placeholder">
                <i class="fas fa-info-circle"></i>
                <p>No slots available for the selected date. Please choose another date.</p>
            </div>
        `;
        return;
    }

    Object.keys(slots).forEach(period => {
        const wrapper = document.createElement('div');
        wrapper.className = 'slot-group';
        wrapper.innerHTML = `<p class="slot-group-title">${period.toUpperCase()}</p>`;

        const buttonRow = document.createElement('div');
        buttonRow.className = 'slot-buttons';

        slots[period].forEach(slot => {
            const btn = document.createElement('button');
            btn.className = 'slot-button';
            btn.textContent = slot.time;
            if (!slot.available) {
                btn.classList.add('disabled');
                btn.disabled = true;
            }
            if (bookingState.data.appointmentTime === slot.time) {
                btn.classList.add('active');
            }
            btn.addEventListener('click', () => {
                if (slot.available) {
                    bookingState.data.appointmentTime = slot.time;
                    bookingState.data.slotLabel = period;
                    renderSlotGroups();
                }
            });
            buttonRow.appendChild(btn);
        });

        wrapper.appendChild(buttonRow);
        container.appendChild(wrapper);
    });
}

function renderConsultationModes(modes = []) {
    const container = document.getElementById('consultationModeOptions');
    if (!container) return;
    container.innerHTML = '';

    modes.forEach(mode => {
        const card = document.createElement('div');
        card.className = 'selection-card';
        if (bookingState.data.consultationMode === mode) {
            card.classList.add('active');
        }
        card.textContent = mode;
        card.addEventListener('click', () => {
            bookingState.data.consultationMode = mode;
            renderConsultationModes(modes);
        });
        container.appendChild(card);
    });
}

function collectMedicalInfo() {
    bookingState.data.medical = {
        chiefComplaint: document.getElementById('chiefComplaintInput')?.value || '',
        symptoms: document.getElementById('symptomsInput')?.value || '',
        severity: document.getElementById('severitySelect')?.value || '',
        notes: document.getElementById('additionalNotesInput')?.value || '',
        attachments: bookingState.data.medical.attachments || []
    };
}

function updateMedicalFormInputs() {
    const fields = {
        chiefComplaintInput: bookingState.data.medical.chiefComplaint,
        symptomsInput: bookingState.data.medical.symptoms,
        severitySelect: bookingState.data.medical.severity,
        additionalNotesInput: bookingState.data.medical.notes
    };

    Object.entries(fields).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    });

    renderUploadChips();
}

function handleMedicalUploadsChange(event) {
    const files = Array.from(event.target.files);
    const currentUploads = bookingState.data.medical.attachments || [];
    const availableSlots = MAX_BOOKING_UPLOADS - currentUploads.length;
    const toAdd = files.slice(0, availableSlots).map(file => ({
        id: `${file.name}-${file.size}-${Date.now()}`,
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        type: file.type
    }));
    bookingState.data.medical.attachments = currentUploads.concat(toAdd);
    renderUploadChips();
}

function renderUploadChips() {
    const list = document.getElementById('selectedUploadsList');
    if (!list) return;
    list.innerHTML = '';
    (bookingState.data.medical.attachments || []).forEach(att => {
        if (!att.id) {
            att.id = `${att.name}-${att.size}-${Date.now()}`;
        }
        const chip = document.createElement('div');
        chip.className = 'upload-chip';
        chip.innerHTML = `${att.name} (${att.size}) <span style="cursor:pointer;" data-upload-id="${att.id}">&times;</span>`;
        chip.querySelector('span').addEventListener('click', () => removeMedicalUpload(att.id));
        list.appendChild(chip);
    });
}

function removeMedicalUpload(id) {
    bookingState.data.medical.attachments = (bookingState.data.medical.attachments || []).filter(att => att.id !== id);
    renderUploadChips();
}

function updateReviewSummary() {
    const container = document.getElementById('reviewSummaryList');
    if (!container) return;
    const doctor = bookingState.data.doctor;
    container.innerHTML = `
        <div class="review-item">
            <label>Doctor</label>
            <strong>${doctor ? doctor.name : 'Not selected'}</strong>
        </div>
        <div class="review-item">
            <label>Date & Time</label>
            <strong>${bookingState.data.appointmentDate ? formatDateDisplay(bookingState.data.appointmentDate) : '—'} ${bookingState.data.appointmentTime ? '• ' + formatTimeDisplay(bookingState.data.appointmentTime) : ''}</strong>
        </div>
        <div class="review-item">
            <label>Consultation Mode</label>
            <strong>${bookingState.data.consultationMode || '—'}</strong>
        </div>
        <div class="review-item">
            <label>Chief Complaint</label>
            <strong>${bookingState.data.medical.chiefComplaint || '—'}</strong>
        </div>
    `;
}

async function submitAppointmentBooking() {
    const nextBtn = document.getElementById('bookingNextBtn');
    if (!nextBtn) return;

    nextBtn.disabled = true;
    nextBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        if (bookingState.intent === 'reschedule' && bookingState.targetAppointmentId) {
            await submitRescheduleAppointment();
            return;
        }

        const payload = {
            appointmentType: bookingState.data.appointmentType,
            specialty: bookingState.data.specialty,
            doctorId: bookingState.data.doctor?.id,
            doctorName: bookingState.data.doctor?.name,
            doctorSpecialty: bookingState.data.doctor?.specialty,
            doctorPhoto: bookingState.data.doctor?.photo,
            hospitalName: bookingState.data.doctor?.hospital,
            experienceYears: bookingState.data.doctor?.experience,
            rating: bookingState.data.doctor?.rating,
            appointmentDate: bookingState.data.appointmentDate,
            appointmentTime: bookingState.data.appointmentTime,
            slotLabel: bookingState.data.slotLabel,
            consultationMode: bookingState.data.consultationMode,
            chiefComplaint: bookingState.data.medical.chiefComplaint,
            symptoms: bookingState.data.medical.symptoms,
            severity: bookingState.data.medical.severity,
            notes: bookingState.data.medical.notes,
            attachments: bookingState.data.medical.attachments
        };

        const response = await fetch('/appointments/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!data.success) {
            showNotification(data.message || 'Unable to book appointment', 'error');
            return;
        }

        const confirm = await fetch('/appointments/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                appointmentId: data.appointment.id,
                qrCodeData: `A3HC-${data.appointment.referenceCode}`
            })
        });
        const confirmedData = await confirm.json();
        if (!confirmedData.success) {
            showNotification('Appointment created but confirmation failed', 'warning');
            return;
        }

        showBookingSuccess(confirmedData.appointment);
        loadAppointmentsOverview();
    } catch (error) {
        console.error(error);
        showNotification('Unable to complete booking', 'error');
    } finally {
        nextBtn.disabled = false;
        nextBtn.innerHTML = bookingState.intent === 'reschedule'
            ? 'Confirm Reschedule <i class="fas fa-check"></i>'
            : 'Confirm Appointment <i class="fas fa-check"></i>';
    }
}

async function submitRescheduleAppointment() {
    try {
        const response = await fetch(`/appointments/reschedule/${bookingState.targetAppointmentId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                appointmentDate: bookingState.data.appointmentDate,
                appointmentTime: bookingState.data.appointmentTime
            })
        });
        const data = await response.json();
        if (data.success) {
            showBookingSuccess(data.appointment, 'rescheduled');
            loadAppointmentsOverview();
        } else {
            showNotification(data.message || 'Unable to reschedule', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Unable to reschedule', 'error');
    }
}

function showBookingSuccess(appointment, mode = 'booked') {
    bookingState.currentStep = 9;
    setBookingStep(9);

    const details = document.getElementById('bookingSuccessDetails');
    const qr = document.getElementById('bookingSuccessQr');
    const chip = document.getElementById('bookingSuccessCalChip');
    const title = document.querySelector('#bookingSuccessState h3');

    if (title) {
        title.textContent = mode === 'rescheduled' ? 'Appointment Updated!' : 'Appointment Confirmed!';
    }

    if (details) {
        details.textContent = `${appointment.doctorName} • ${formatDateDisplay(appointment.appointmentDate)} @ ${formatTimeDisplay(appointment.appointmentTime)}`;
    }
    if (chip) {
        chip.textContent = `${appointment.consultationMode || 'Mode TBD'} • Ref ${appointment.referenceCode}`;
    }
    if (qr) {
        qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(appointment.qrCodeData || appointment.referenceCode)}`;
    }
}

function formatDateDisplay(dateString) {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTimeDisplay(timeString) {
    if (!timeString) return '—';
    const [hour, minute] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hour, 10), parseInt(minute, 10));
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function prefillBookingForAppointment(appointment) {
    openBookingWizard({ intent: 'reschedule', startStep: 4 });
    bookingState.intent = 'reschedule';
    bookingState.targetAppointmentId = appointment.id;
    bookingState.data = {
        appointmentType: appointment.appointmentType,
        specialty: appointment.specialty,
        doctor: {
            id: appointment.doctorId,
            name: appointment.doctorName,
            specialty: appointment.doctorSpecialty,
            hospital: appointment.hospitalName,
            experience: appointment.experienceYears,
            rating: appointment.rating,
            photo: appointment.doctorPhoto
        },
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        slotLabel: appointment.slotLabel,
        consultationMode: appointment.consultationMode,
        medical: {
            chiefComplaint: appointment.reason || '',
            symptoms: appointment.symptoms || '',
            severity: appointment.severity || '',
            notes: appointment.notes || '',
            attachments: appointment.attachments || []
        }
    };
    bookingCalendarCursor = new Date(appointment.appointmentDate);
    updateMedicalFormInputs();
    setBookingStep(4);
}

// ============================================
// AUTO-REFRESH DATA (Optional)
// ============================================

// Uncomment to enable auto-refresh every 5 minutes
// setInterval(() => {
//     fetchDashboardStats();
//     fetchAppointments();
//     fetchIoTData();
// }, 300000);

console.log('A3 Health Card Client Dashboard initialized successfully!');

// ============================================
// HELPER FUNCTIONS
// ============================================

function initDobAgeLink() {
    const dobInput = document.getElementById('dob_input');
    const ageInput = document.getElementById('age_input');

    if (dobInput && ageInput) {
        // Calculate on load if value exists
        if (dobInput.value) {
            ageInput.value = calculateAge(dobInput.value);
        }

        // Calculate on change
        dobInput.addEventListener('change', function () {
            ageInput.value = calculateAge(this.value);
        });
    }
}

function calculateAge(dobString) {
    if (!dobString) return '';
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age;
}

// ============================================
// IMPLANTS MODULE
// ============================================

const implantState = {
    q: '',
    status: 'all',
    type: '',
    year: ''
};

function initializeImplantModule() {
    const page = document.getElementById('implantation-page');
    if (!page) return;

    const searchInput = document.getElementById('implantSearchInput');
    const statusFilter = document.getElementById('implantStatusFilter');
    const typeFilter = document.getElementById('implantCategoryFilter');
    const yearFilter = document.getElementById('implantYearFilter');
    const resetBtn = document.getElementById('implantResetFilters');
    const addBtn = document.getElementById('addImplantBtn');
    const emptyAddBtn = document.getElementById('implantEmptyAddBtn');

    const debouncedFetch = debounce(loadImplantData, 300);

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            implantState.q = e.target.value || '';
            debouncedFetch();
        });
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            implantState.status = e.target.value || 'all';
            loadImplantData();
        });
    }
    if (typeFilter) {
        typeFilter.addEventListener('change', (e) => {
            implantState.type = e.target.value || '';
            loadImplantData();
        });
    }
    if (yearFilter) {
        yearFilter.addEventListener('change', (e) => {
            implantState.year = e.target.value || '';
            loadImplantData();
        });
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            implantState.q = '';
            implantState.status = 'all';
            implantState.type = '';
            implantState.year = '';
            if (searchInput) searchInput.value = '';
            if (statusFilter) statusFilter.value = 'all';
            if (typeFilter) typeFilter.value = '';
            if (yearFilter) yearFilter.value = '';
            loadImplantData();
        });
    }

    // Event delegation for Implant actions
    document.body.addEventListener('click', function (e) {
        const viewLink = e.target.closest('.js-view-implant');
        if (viewLink) {
            e.preventDefault();
            const url = viewLink.dataset.url || viewLink.getAttribute('href');
            if (url) {
                loadIntoModal(url, 'View Implant Details', {
                    handleSubmission: false
                });
            }
            return;
        }

        const editLink = e.target.closest('.js-edit-implant');
        if (editLink) {
            e.preventDefault();
            const url = editLink.dataset.url || editLink.getAttribute('href');
            if (url) {
                loadIntoModal(url, 'Edit Implant', {
                    handleSubmission: true,
                    initCallback: initImplantForm,
                    onSuccess: loadImplantData
                });
            }
            return;
        }
    });

    const goToAdd = () => {
        loadIntoModal('/implant/add', 'Add New Implant', {
            handleSubmission: true,
            initCallback: initImplantForm,
            onSuccess: loadImplantData
        });
    };

    if (addBtn) {
        addBtn.addEventListener('click', goToAdd);
    }
    if (emptyAddBtn) {
        emptyAddBtn.addEventListener('click', goToAdd);
    }

    // Load initial data
    loadImplantData();
}

function initImplantForm(formContent) {
    const fileInput = formContent.querySelector('#implantDocuments');
    const preview = formContent.querySelector('#implantFilePreview');
    const errorEl = formContent.querySelector('#implantFileError');
    const dropzone = formContent.querySelector('#implantUploadArea');

    if (!fileInput || !preview) return;

    const IMPLANT_MAX_FILES = 5;

    const updatePreview = (input, previewContainer, errorElement) => {
        previewContainer.innerHTML = '';
        errorElement.style.display = 'none';
        const files = Array.from(input.files);

        if (files.length > IMPLANT_MAX_FILES) {
            errorElement.textContent = `Maximum ${IMPLANT_MAX_FILES} files allowed.`;
            errorElement.style.display = 'block';
            input.value = ''; // Clear selection
            return;
        }

        files.forEach((file, index) => {
            const sizeKb = (file.size / 1024).toFixed(1);
            const ext = file.name.split('.').pop().toUpperCase();
            const wrapper = document.createElement('div');
            wrapper.className = 'file-chip';
            wrapper.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:#f9fafb;font-size:13px;margin-bottom:4px;border:1px solid #e5e7eb;';
            wrapper.innerHTML = `
                <span class="file-name" style="font-weight:500;">${file.name}</span>
                <span class="file-meta" style="color:#6b7280;">${ext} · ${sizeKb} KB</span>
                <button type="button" class="btn btn-sm text-danger p-0 ms-2" data-index="${index}" style="font-size:12px;">Remove</button>
            `;

            const btn = wrapper.querySelector('button');
            btn.addEventListener('click', () => {
                const dt = new DataTransfer();
                Array.from(input.files).forEach((f, i) => {
                    if (i !== index) dt.items.add(f);
                });
                input.files = dt.files;
                updatePreview(input, previewContainer, errorElement);
            });
            previewContainer.appendChild(wrapper);
        });
    };

    // Drag and drop support
    if (dropzone) {
        dropzone.addEventListener('click', () => fileInput.click());

        ['dragenter', 'dragover'].forEach((evt) => {
            dropzone.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add('bg-light');
            });
        });

        ['dragleave', 'dragend', 'drop'].forEach((evt) => {
            dropzone.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('bg-light');
            });
        });

        dropzone.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer?.files || []);
            if (!files.length) return;

            const dt = new DataTransfer();
            const existing = Array.from(fileInput.files || []);
            const combined = existing.concat(files);

            // Limit to max files
            combined.slice(0, IMPLANT_MAX_FILES).forEach(f => dt.items.add(f));
            fileInput.files = dt.files;

            updatePreview(fileInput, preview, errorEl);
        });
    }

    fileInput.addEventListener('change', () => {
        updatePreview(fileInput, preview, errorEl);
    });
}

async function loadImplantData() {
    const { q, status, type, year } = implantState;
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status && status !== 'all') params.set('status', status);
    if (type) params.set('type', type);
    if (year) params.set('year', year);

    try {
        const response = await fetch(`/api/implants?${params.toString()}`);
        const data = await response.json();

        if (!data.success) {
            console.error('Failed to load implant data:', data.message);
            return;
        }

        updateImplantStats(data.stats);
        renderImplantCards(data.implants, data.counts);
        updateImplantSidebar(data.counts);
        populateImplantYearFilter(data.implants);
    } catch (error) {
        console.error('Error loading implant data:', error);
        showNotification('Failed to load implant data.', 'error');
    }
}

function updateImplantStats(stats) {
    const totalEl = document.getElementById('implantStatTotal');
    const activeEl = document.getElementById('implantStatActive');
    const inactiveEl = document.getElementById('implantStatInactive');
    const updatedEl = document.getElementById('implantStatUpdated');

    if (totalEl) totalEl.textContent = stats.total || 0;
    if (activeEl) activeEl.textContent = stats.active || 0;
    if (inactiveEl) inactiveEl.textContent = stats.inactive || 0;
    if (updatedEl) {
        if (stats.last_updated) {
            const date = new Date(stats.last_updated);
            updatedEl.textContent = date.toLocaleDateString('en-CA');
        } else {
            updatedEl.textContent = 'N/A';
        }
    }
}

function renderImplantCards(implants, counts) {
    const container = document.getElementById('implantCardsContainer');
    const empty = document.getElementById('implantEmptyState');
    const summary = document.getElementById('implantSummary');

    if (!container) return;

    // Clear existing cards
    container.querySelectorAll('.implant-card').forEach(c => c.remove());

    if (summary && counts) {
        summary.textContent = `Showing ${counts.filtered} of ${counts.total} records`;
    }

    if (!implants || implants.length === 0) {
        if (empty) empty.style.display = '';
        return;
    }

    if (empty) empty.style.display = 'none';

    implants.forEach(imp => {
        const card = buildImplantCard(imp);
        container.insertAdjacentHTML('beforeend', card);
    });
}

function buildImplantCard(imp) {
    const statusKey = (imp.status || 'Active').toLowerCase();
    const statusColor = {
        'active': '#4CAF50',
        'inactive': '#9E9E9E',
        'removed': '#FF5722',
        'malfunction': '#F44336'
    }[statusKey] || '#666';

    const dateLabel = imp.implantationDate ? `Implanted: ${imp.implantationDate}` : 'Date N/A';
    const hospitalText = imp.hospitalName ? ` • ${imp.hospitalName}` : '';
    const surgeonText = imp.surgeonName ? `<br><small class="muted">Surgeon: ${imp.surgeonName}</small>` : '';
    const manufacturerText = imp.manufacturer ? `<strong>Manufacturer:</strong> ${imp.manufacturer}` : '';
    const modelText = imp.modelNumber ? ` • <strong>Model:</strong> ${imp.modelNumber}` : '';

    return `
        <article class="card implant-card">
            <div class="implant-card-head">
                <div>
                    <div class="kicker">${imp.category}</div>
                    <h3>${imp.deviceName}</h3>
                    <p class="muted">
                        ${dateLabel}${hospitalText}
                        ${surgeonText}
                    </p>
                </div>
                <span class="status-pill ${statusKey}" style="background:${statusColor}">${imp.status}</span>
            </div>
            <p class="small-text">${manufacturerText}${modelText}</p>
            ${imp.notes ? `<p class="small-text mt-2"><em>${imp.notes}</em></p>` : ''}
            <div class="implant-card-actions">
                <a href="/implant/view/${imp.id}" class="btn btn-outline js-view-implant" data-url="/implant/view/${imp.id}">View</a>
                <a href="/implant/edit/${imp.id}" class="btn btn-outline js-edit-implant" data-url="/implant/edit/${imp.id}">Edit</a>
                <a href="/implant/pdf/${imp.id}" class="btn btn-outline">Download PDF</a>
                <form method="post" action="/implant/delete/${imp.id}" style="display:inline-block" onsubmit="return confirm('Delete this implant record permanently?');">
                    <button type="submit" class="btn btn-danger">Delete</button>
                </form>
            </div>
        </article>
    `;
}

function updateImplantSidebar(counts) {
    const statusList = document.getElementById('implantStatusDistribution');
    const typeList = document.getElementById('implantCategoryMix');

    if (statusList && counts && counts.byStatus) {
        statusList.innerHTML = Object.entries(counts.byStatus).map(([status, count]) => {
            if (!count) return '';
            const color = {
                'Active': '#4CAF50',
                'Inactive': '#9E9E9E',
                'Removed': '#FF5722',
                'Malfunction': '#F44336'
            }[status] || '#666';
            return `<li><span><span class="dot" style="background:${color}"></span>${status}</span><strong>${count}</strong></li>`;
        }).join('');
    }

    if (typeList && counts && counts.byCategory) {
        typeList.innerHTML = Object.entries(counts.byCategory).map(([type, count]) => {
            if (!count) return '';
            return `<li><span>${type}</span><strong>${count}</strong></li>`;
        }).join('');
    }
}

function populateImplantYearFilter(implants) {
    const yearFilter = document.getElementById('implantYearFilter');
    if (!yearFilter) return;

    const years = new Set();
    implants.forEach(imp => {
        if (imp.implantationDate) {
            const year = imp.implantationDate.split('-')[0];
            if (year) years.add(year);
        }
    });

    const currentValue = yearFilter.value;
    const sortedYears = Array.from(years).sort((a, b) => b - a);

    yearFilter.innerHTML = '<option value="">All</option>' +
        sortedYears.map(y => `<option value="${y}">${y}</option>`).join('');

    if (currentValue) {
        yearFilter.value = currentValue;
    }
}

// Expose loadImplantData to window so it can be called from global handleNavigation
window.loadImplantData = loadImplantData;

// ============================================
// PHARMACY REQUESTS
// ============================================

function loadPharmacyRequests() {
    const requestsList = document.getElementById('requestsList');
    if (!requestsList) return;

    fetch('/api/client/pharmacy/requests')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (data.requests.length === 0) {
                    requestsList.innerHTML = `
                        <div class="text-center py-4 text-muted">
                            <i class="fas fa-inbox fa-2x mb-2"></i>
                            <p class="mb-0">No requests yet</p>
                        </div>
                    `;
                    return;
                }

                requestsList.innerHTML = data.requests.map(req => {
                    let statusClass = 'secondary';
                    if (req.status === 'pending') statusClass = 'warning';
                    else if (req.status === 'accepted') statusClass = 'info';
                    else if (req.status === 'ready') statusClass = 'success';
                    else if (req.status === 'completed') statusClass = 'primary';
                    else if (req.status === 'rejected') statusClass = 'danger';

                    return `
                        <div class="card border-0 shadow-sm">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <small class="text-muted">${req.date || 'N/A'}</small>
                                    <span class="badge bg-${statusClass}">${req.status || 'Unknown'}</span>
                                </div>
                                <div class="fw-bold mb-1">${req.pharmacy_name || 'Pharmacy'}</div>
                                ${req.doctor_name ? `<small class="text-muted d-block">Dr. ${req.doctor_name}</small>` : ''}
                                ${req.remarks ? `<small class="text-muted d-block mt-1"><em>${req.remarks}</em></small>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                requestsList.innerHTML = `
                    <div class="alert alert-danger">
                        Error loading requests
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error loading pharmacy requests:', error);
            requestsList.innerHTML = `
                <div class="alert alert-danger">
                    Failed to load requests
                </div>
            `;
        });
}

// Load pharmacy requests when pharmacy page is shown
document.addEventListener('DOMContentLoaded', function () {
    // Check if pharmacy page loaded
    const pharmacyPage = document.getElementById('pharmacy-page');
    if (pharmacyPage && pharmacyPage.classList.contains('active')) {
        loadPharmacyRequests();
    }
});

// ============================================
// PHARMACY FORM HANDLING
// ============================================

function loadPharmacyList() {
    const select = document.querySelector('.pharmacy-select');
    if (!select) return;

    fetch('/api/client/pharmacy/list')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (data.pharmacies.length === 0) {
                    select.innerHTML = '<option value="" disabled selected>No pharmacies available</option>';
                    return;
                }
                select.innerHTML = '<option value="" disabled selected>Select Pharmacy</option>' +
                    data.pharmacies.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
            }
        })
        .catch(error => console.error('Error loading pharmacies:', error));
}

function setupMedicineRows() {
    const container = document.getElementById('medicineListContainer');
    const addBtn = document.getElementById('addMedicineRowBtn');

    if (!container || !addBtn) return;

    // Remove existing listeners to avoid duplicates if called multiple times
    const newAddBtn = addBtn.cloneNode(true);
    addBtn.parentNode.replaceChild(newAddBtn, addBtn);

    newAddBtn.addEventListener('click', function () {
        const row = document.createElement('div');
        row.className = 'row g-2 mb-2 medicine-row';
        row.innerHTML = `
            <div class="col-7">
                <input type="text" class="form-control" name="medicineName[]" placeholder="Medicine Name">
            </div>
            <div class="col-3">
                <input type="text" class="form-control" name="medicineQty[]" placeholder="Qty">
            </div>
            <div class="col-2">
                <button type="button" class="btn btn-outline-danger w-100 remove-medicine-row">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        container.appendChild(row);
        updateRemoveButtons();
    });

    // Use delegation for remove buttons
    // We can't easily remove anonymous listeners, but since we're cloning the form in initializePharmacyForm, 
    // the container is also new, so it's clean.
    container.addEventListener('click', function (e) {
        if (e.target.closest('.remove-medicine-row')) {
            const row = e.target.closest('.medicine-row');
            if (container.querySelectorAll('.medicine-row').length > 1) {
                row.remove();
                updateRemoveButtons();
            }
        }
    });

    function updateRemoveButtons() {
        const rows = container.querySelectorAll('.medicine-row');
        const buttons = container.querySelectorAll('.remove-medicine-row');
        buttons.forEach(btn => btn.disabled = rows.length === 1);
    }

    // Initial update
    updateRemoveButtons();
}

function initializePharmacyForm() {
    const form = document.getElementById('unifiedPharmacyRequestForm');
    if (!form) return;

    // Remove existing listener by cloning
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    // Re-setup medicine rows on the new form
    setupMedicineRows();

    newForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const submitBtn = newForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Sending...';

        const formData = new FormData(newForm);

        fetch('/api/client/pharmacy/request', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Request submitted successfully!');
                    newForm.reset();
                    // Reset medicine rows to just one
                    const container = document.getElementById('medicineListContainer');
                    if (container) {
                        container.innerHTML = `
                        <div class="row g-2 mb-2 medicine-row">
                            <div class="col-7">
                                <input type="text" class="form-control" name="medicineName[]" placeholder="Medicine Name">
                            </div>
                            <div class="col-3">
                                <input type="text" class="form-control" name="medicineQty[]" placeholder="Qty">
                            </div>
                            <div class="col-2">
                                <button type="button" class="btn btn-outline-danger w-100 remove-medicine-row" disabled>
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    `;
                        // Re-init buttons
                        setupMedicineRows();
                    }
                    loadPharmacyRequests();
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Failed to submit request');
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            });
    });
}

// Initialize everything when pharmacy page loads
document.addEventListener('DOMContentLoaded', function () {
    loadPharmacyList();
    setupMedicineRows();
    initializePharmacyForm();
});

// Also load when navigating to pharmacy page
const originalHandleNavigation = window.handleNavigation;
if (typeof originalHandleNavigation === 'function') {
    window.handleNavigation = function (pageName) {
        originalHandleNavigation(pageName);
        if (pageName === 'pharmacy-page') {
            setTimeout(() => {
                loadPharmacyRequests();
                loadPharmacyList();
            }, 100);
        }
    };
}
