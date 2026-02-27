// ============================================
// Pill Reminder Module - JavaScript
// ============================================

let medicationModal = null;
let commonMedications = [];
let currentHistoryDays = 7;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    // Initialize modal
    const modalEl = document.getElementById('medicationModal');
    if (modalEl) {
        medicationModal = new bootstrap.Modal(modalEl);
    }

    // Load common medications for autocomplete
    loadCommonMedications();

    // Set up event listeners
    setupPillReminderListeners();

    // Set today's date as default for start date
    const startDateInput = document.getElementById('medStartDate');
    if (startDateInput) {
        startDateInput.value = new Date().toISOString().split('T')[0];
    }

    // Set today's date badge
    const todayBadge = document.getElementById('todayDateBadge');
    if (todayBadge) {
        todayBadge.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
        });
    }

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});

// Setup event listeners
function setupPillReminderListeners() {
    // Show inactive medications toggle
    const showInactiveToggle = document.getElementById('showInactiveMeds');
    if (showInactiveToggle) {
        showInactiveToggle.addEventListener('change', loadMyMedications);
    }

    // History filter buttons
    const historyBtns = document.querySelectorAll('#historyFilterBtns button');
    historyBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            historyBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentHistoryDays = parseInt(this.dataset.days);
            loadPillHistory();
        });
    });
}

// Load common medications for autocomplete
async function loadCommonMedications() {
    try {
        const res = await fetch('/api/pill-reminders/medications');
        const data = await res.json();
        if (data.success) {
            commonMedications = data.medications;
            const datalist = document.getElementById('medicationSuggestions');
            if (datalist) {
                datalist.innerHTML = commonMedications.map(med =>
                    `<option value="${med}">`
                ).join('');
            }
        }
    } catch (err) {
        console.error('Error loading medications:', err);
    }
}

// Load all pill reminder data when navigating to page
function loadPillReminderData() {
    loadTodaySchedule();
    loadMyMedications();
    loadPillStats();
    loadPillHistory();
}

// Load today's schedule
async function loadTodaySchedule() {
    const container = document.getElementById('todayScheduleContainer');
    if (!container) return;

    container.innerHTML = '<div class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i> Loading schedule...</div>';

    try {
        const res = await fetch('/api/pill-reminders/today');
        const data = await res.json();

        if (!data.success) throw new Error(data.error);

        if (data.schedule.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-calendar-check fa-3x mb-3"></i>
                    <p>No medications scheduled for today</p>
                </div>
            `;
            return;
        }

        // Group by time
        const grouped = {};
        data.schedule.forEach(item => {
            if (!grouped[item.scheduled_time]) {
                grouped[item.scheduled_time] = [];
            }
            grouped[item.scheduled_time].push(item);
        });

        let html = '';
        const sortedTimes = Object.keys(grouped).sort();

        sortedTimes.forEach(time => {
            const items = grouped[time];
            items.forEach(item => {
                const statusClass = item.status.toLowerCase();
                const isPending = item.status === 'Pending';
                const timeDisplay = formatTime(time);

                html += `
                    <div class="schedule-item" data-log-id="${item.id}">
                        <div class="schedule-item-left">
                            <span class="schedule-time">${timeDisplay}</span>
                            <div class="schedule-med-info">
                                <span class="schedule-med-name">${item.medication_name}</span>
                                <span class="schedule-med-dosage">${item.dosage || ''}</span>
                            </div>
                        </div>
                        <div class="schedule-item-right">
                            ${isPending ? `
                                <button class="pill-take-btn take" onclick="markPill(${item.id}, 'Taken')">
                                    <i class="fas fa-check me-1"></i> Take
                                </button>
                                <button class="pill-take-btn skip" onclick="markPill(${item.id}, 'Skipped')">
                                    <i class="fas fa-forward me-1"></i> Skip
                                </button>
                            ` : `
                                <span class="pill-status-badge ${statusClass}">
                                    ${item.status === 'Taken' ? '<i class="fas fa-check-circle me-1"></i>' : ''}
                                    ${item.status === 'Skipped' ? '<i class="fas fa-forward me-1"></i>' : ''}
                                    ${item.status === 'Missed' ? '<i class="fas fa-times-circle me-1"></i>' : ''}
                                    ${item.status}
                                </span>
                            `}
                        </div>
                    </div>
                `;
            });
        });

        container.innerHTML = html;

        // Update today's pills KPI
        const taken = data.schedule.filter(s => s.status === 'Taken').length;
        const total = data.schedule.length;
        const pillStatToday = document.getElementById('pillStatToday');
        if (pillStatToday) {
            pillStatToday.textContent = `${taken} of ${total}`;
        }

    } catch (err) {
        console.error('Error loading today schedule:', err);
        container.innerHTML = '<div class="text-center py-4 text-danger">Error loading schedule</div>';
    }
}

// Load my medications
async function loadMyMedications() {
    const grid = document.getElementById('medicationsGrid');
    const emptyState = document.getElementById('medicationsEmptyState');
    if (!grid) return;

    const showInactive = document.getElementById('showInactiveMeds')?.checked || false;

    grid.innerHTML = '<div class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i> Loading medications...</div>';

    try {
        const res = await fetch(`/api/pill-reminders?active=${!showInactive}`);
        const data = await res.json();

        if (!data.success) throw new Error(data.error);

        if (data.reminders.length === 0) {
            grid.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        grid.innerHTML = data.reminders.map(med => {
            const times = med.times.map(t => formatTime(t)).join(', ');
            const stockBadge = getStockBadge(med);

            return `
                <div class="medication-card ${med.is_active ? '' : 'inactive'}">
                    <div class="med-card-header">
                        <div>
                            <h5 class="med-card-title">${med.medication_name}</h5>
                            <span class="med-card-dosage">${med.dosage || ''} ${med.medication_type || ''}</span>
                        </div>
                        <div class="med-card-actions">
                            <button class="med-action-btn" onclick="editMedication(${med.id})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="med-action-btn delete" onclick="deleteMedication(${med.id})" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="med-card-meta">
                        <span><i class="fas fa-clock"></i> ${med.frequency} at ${times}</span>
                        ${med.instructions ? `<span><i class="fas fa-info-circle"></i> ${med.instructions}</span>` : ''}
                        ${med.prescribed_by ? `<span><i class="fas fa-user-md"></i> Dr. ${med.prescribed_by}</span>` : ''}
                    </div>
                    ${stockBadge}
                </div>
            `;
        }).join('');

        // Update active medications KPI
        const activeMeds = data.reminders.filter(m => m.is_active).length;
        const pillStatActive = document.getElementById('pillStatActive');
        if (pillStatActive) {
            pillStatActive.textContent = activeMeds;
        }

    } catch (err) {
        console.error('Error loading medications:', err);
        grid.innerHTML = '<div class="text-center py-4 text-danger">Error loading medications</div>';
    }
}

// Get stock badge HTML
function getStockBadge(med) {
    if (!med.pills_remaining) return '';

    const threshold = med.refill_reminder_at || 7;
    let badgeClass = 'ok';
    let icon = 'check-circle';

    if (med.pills_remaining <= threshold) {
        badgeClass = 'critical';
        icon = 'exclamation-circle';
    } else if (med.pills_remaining <= threshold * 2) {
        badgeClass = 'low';
        icon = 'exclamation-triangle';
    }

    return `
        <span class="med-stock-badge ${badgeClass}">
            <i class="fas fa-${icon}"></i> ${med.pills_remaining} pills remaining
        </span>
    `;
}

// Load pill stats
async function loadPillStats() {
    try {
        const res = await fetch('/api/pill-reminders/stats?days=7');
        const data = await res.json();

        if (!data.success) return;

        const stats = data.stats;

        // Update adherence rate
        const adherenceEl = document.getElementById('pillStatAdherence');
        if (adherenceEl) {
            adherenceEl.textContent = `${stats.adherence_rate}%`;
        }

        // Update next dose
        const nextDoseEl = document.getElementById('pillStatNext');
        if (nextDoseEl) {
            if (stats.next_dose.medication) {
                nextDoseEl.textContent = `${formatTime(stats.next_dose.time)}`;
            } else {
                nextDoseEl.textContent = 'None today';
            }
        }

        // Update adherence bars
        const total = stats.taken + stats.skipped + stats.missed;
        if (total > 0) {
            const takenPct = Math.round((stats.taken / total) * 100);
            const skippedPct = Math.round((stats.skipped / total) * 100);
            const missedPct = Math.round((stats.missed / total) * 100);

            document.getElementById('adherenceTakenPct').textContent = `${takenPct}%`;
            document.getElementById('adherenceTakenBar').style.width = `${takenPct}%`;

            document.getElementById('adherenceSkippedPct').textContent = `${skippedPct}%`;
            document.getElementById('adherenceSkippedBar').style.width = `${skippedPct}%`;

            document.getElementById('adherenceMissedPct').textContent = `${missedPct}%`;
            document.getElementById('adherenceMissedBar').style.width = `${missedPct}%`;
        }

        // Show low stock alert
        if (stats.low_stock && stats.low_stock.length > 0) {
            const alertSection = document.getElementById('refillAlertSection');
            const lowStockList = document.getElementById('lowStockList');
            if (alertSection && lowStockList) {
                alertSection.style.display = 'block';
                lowStockList.innerHTML = stats.low_stock.map(med =>
                    `<li><strong>${med.medication_name}</strong> - ${med.pills_remaining} pills left</li>`
                ).join('');
            }
        }

    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

// Load pill history
async function loadPillHistory() {
    const tbody = document.getElementById('pillHistoryBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Loading history...</td></tr>';

    try {
        const res = await fetch(`/api/pill-reminders/history?days=${currentHistoryDays}`);
        const data = await res.json();

        if (!data.success) throw new Error(data.error);

        if (data.history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No history found</td></tr>';
            return;
        }

        tbody.innerHTML = data.history.map(log => {
            const date = new Date(log.scheduled_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
            const statusClass = log.status.toLowerCase();

            return `
                <tr>
                    <td>${date}</td>
                    <td>${formatTime(log.scheduled_time)}</td>
                    <td>${log.medication_name}</td>
                    <td>${log.dosage || '-'}</td>
                    <td><span class="pill-status-badge ${statusClass}">${log.status}</span></td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error('Error loading history:', err);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-danger">Error loading history</td></tr>';
    }
}

// Open medication modal
function openMedicationModal(medicationId = null) {
    const form = document.getElementById('medicationForm');
    const modalTitle = document.getElementById('medicationModalLabel');

    if (form) form.reset();
    document.getElementById('medicationId').value = '';

    // Reset time inputs
    document.getElementById('timeInputsContainer').innerHTML = `
        <div class="col-auto">
            <input type="time" class="form-control" name="times[]" value="08:00" required>
        </div>
    `;

    // Hide days section
    document.getElementById('daysSection').style.display = 'none';

    // Set today's date
    document.getElementById('medStartDate').value = new Date().toISOString().split('T')[0];

    if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-pills me-2"></i>Add Medication';
    }

    if (medicationModal) {
        medicationModal.show();
    }
}

// Update time inputs based on frequency
function updateTimeInputs() {
    const frequency = document.getElementById('medFrequency').value;
    const container = document.getElementById('timeInputsContainer');
    const daysSection = document.getElementById('daysSection');

    let numTimes = 1;
    const defaultTimes = ['08:00'];

    switch (frequency) {
        case 'Once Daily':
            numTimes = 1;
            defaultTimes[0] = '08:00';
            break;
        case 'Twice Daily':
            numTimes = 2;
            defaultTimes.push('20:00');
            break;
        case 'Three Times':
            numTimes = 3;
            defaultTimes.push('14:00', '20:00');
            break;
        case 'Four Times':
            numTimes = 4;
            defaultTimes.push('12:00', '16:00', '20:00');
            break;
        case 'Every 8 Hours':
            numTimes = 3;
            defaultTimes[0] = '06:00';
            defaultTimes.push('14:00', '22:00');
            break;
        case 'Every 12 Hours':
            numTimes = 2;
            defaultTimes[0] = '08:00';
            defaultTimes.push('20:00');
            break;
        case 'Weekly':
            numTimes = 1;
            break;
        case 'As Needed':
            numTimes = 0;
            break;
    }

    // Show/hide days section for weekly
    daysSection.style.display = frequency === 'Weekly' ? 'block' : 'none';

    // Generate time inputs
    if (numTimes === 0) {
        container.innerHTML = '<div class="col-12"><small class="text-muted">No fixed time for "As Needed" medications</small></div>';
    } else {
        container.innerHTML = '';
        for (let i = 0; i < numTimes; i++) {
            container.innerHTML += `
                <div class="col-auto">
                    <input type="time" class="form-control" name="times[]" value="${defaultTimes[i] || '08:00'}" required>
                </div>
            `;
        }
    }
}

// Save medication
async function saveMedication() {
    const form = document.getElementById('medicationForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const medicationId = document.getElementById('medicationId').value;
    const isEdit = !!medicationId;

    // Collect times
    const timeInputs = document.querySelectorAll('input[name="times[]"]');
    const times = Array.from(timeInputs).map(input => input.value).filter(t => t);

    // Collect days if weekly
    const daysInputs = document.querySelectorAll('input[name="days[]"]:checked');
    const days = Array.from(daysInputs).map(input => input.value);

    const payload = {
        medication_name: document.getElementById('medName').value,
        dosage: document.getElementById('medDosage').value,
        medication_type: document.getElementById('medType').value,
        frequency: document.getElementById('medFrequency').value,
        times: times,
        days_of_week: days.length > 0 ? days : null,
        start_date: document.getElementById('medStartDate').value,
        end_date: document.getElementById('medEndDate').value || null,
        instructions: document.getElementById('medInstructions').value,
        prescribed_by: document.getElementById('medPrescribedBy').value,
        reason: document.getElementById('medReason').value,
        pills_per_refill: document.getElementById('medPillsPerRefill').value ? parseInt(document.getElementById('medPillsPerRefill').value) : null,
        pills_remaining: document.getElementById('medPillsRemaining').value ? parseInt(document.getElementById('medPillsRemaining').value) : null,
        refill_reminder_at: document.getElementById('medRefillAt').value ? parseInt(document.getElementById('medRefillAt').value) : 7,
        notify_browser: document.getElementById('medNotifyBrowser').checked,
        notify_email: document.getElementById('medNotifyEmail').checked
    };

    try {
        const url = isEdit ? `/api/pill-reminders/${medicationId}` : '/api/pill-reminders';
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (data.success) {
            if (medicationModal) medicationModal.hide();
            showNotification(isEdit ? 'Medication updated successfully' : 'Medication added successfully', 'success');
            loadPillReminderData();
        } else {
            showNotification(data.error || 'Error saving medication', 'error');
        }
    } catch (err) {
        console.error('Error saving medication:', err);
        showNotification('Error saving medication', 'error');
    }
}

// Edit medication
async function editMedication(id) {
    try {
        const res = await fetch(`/api/pill-reminders?active=false`);
        const data = await res.json();

        if (!data.success) throw new Error(data.error);

        const med = data.reminders.find(m => m.id === id);
        if (!med) throw new Error('Medication not found');

        // Populate form
        document.getElementById('medicationId').value = med.id;
        document.getElementById('medName').value = med.medication_name;
        document.getElementById('medDosage').value = med.dosage || '';
        document.getElementById('medType').value = med.medication_type || 'Tablet';
        document.getElementById('medFrequency').value = med.frequency;
        document.getElementById('medReason').value = med.reason || '';
        document.getElementById('medStartDate').value = med.start_date;
        document.getElementById('medEndDate').value = med.end_date || '';
        document.getElementById('medInstructions').value = med.instructions || '';
        document.getElementById('medPrescribedBy').value = med.prescribed_by || '';
        document.getElementById('medPillsPerRefill').value = med.pills_per_refill || '';
        document.getElementById('medPillsRemaining').value = med.pills_remaining || '';
        document.getElementById('medRefillAt').value = med.refill_reminder_at || 7;
        document.getElementById('medNotifyBrowser').checked = med.notify_browser;
        document.getElementById('medNotifyEmail').checked = med.notify_email;

        // Update time inputs
        updateTimeInputs();
        const container = document.getElementById('timeInputsContainer');
        if (med.times && med.times.length > 0) {
            container.innerHTML = med.times.map(t => `
                <div class="col-auto">
                    <input type="time" class="form-control" name="times[]" value="${t}" required>
                </div>
            `).join('');
        }

        // Update days checkboxes
        if (med.days_of_week) {
            document.getElementById('daysSection').style.display = 'block';
            document.querySelectorAll('input[name="days[]"]').forEach(cb => {
                cb.checked = med.days_of_week.includes(cb.value);
            });
        }

        // Update modal title
        document.getElementById('medicationModalLabel').innerHTML = '<i class="fas fa-edit me-2"></i>Edit Medication';

        if (medicationModal) medicationModal.show();

    } catch (err) {
        console.error('Error loading medication:', err);
        showNotification('Error loading medication', 'error');
    }
}

// Delete medication
async function deleteMedication(id) {
    if (!confirm('Are you sure you want to delete this medication? This action cannot be undone.')) {
        return;
    }

    try {
        const res = await fetch(`/api/pill-reminders/${id}`, { method: 'DELETE' });
        const data = await res.json();

        if (data.success) {
            showNotification('Medication deleted successfully', 'success');
            loadPillReminderData();
        } else {
            showNotification(data.error || 'Error deleting medication', 'error');
        }
    } catch (err) {
        console.error('Error deleting medication:', err);
        showNotification('Error deleting medication', 'error');
    }
}

// Mark pill as taken/skipped
async function markPill(logId, status) {
    try {
        const res = await fetch(`/api/pill-log/${logId}/mark`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: status })
        });

        const data = await res.json();

        if (data.success) {
            showNotification(`Pill marked as ${status}`, 'success');
            loadTodaySchedule();
            loadPillStats();
        } else {
            showNotification(data.error || 'Error updating pill status', 'error');
        }
    } catch (err) {
        console.error('Error marking pill:', err);
        showNotification('Error updating pill status', 'error');
    }
}

// Format time (24h to 12h)
function formatTime(time24) {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
}

// Notification helper (uses existing showNotification from client_dashboard.js)
function showPillNotification(message, type) {
    if (typeof showNotification === 'function') {
        showNotification(message, type);
    } else {
        alert(message);
    }
}

// Browser notification for pill reminder
function showBrowserNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: '/static/images/pill-icon.png',
            badge: '/static/images/pill-icon.png'
        });
    }
}

// Hook into navigation - load data when pill-reminder page is shown
document.addEventListener('DOMContentLoaded', function () {
    // Add click listeners for navigation to load pill reminder data
    document.querySelectorAll('.nav-item[data-page="pill-reminder"]').forEach(nav => {
        nav.addEventListener('click', function () {
            setTimeout(loadPillReminderData, 100);
        });
    });

    // Also handle play card clicks
    document.querySelectorAll('.play-card[data-page="pill-reminder"]').forEach(card => {
        card.addEventListener('click', function () {
            setTimeout(loadPillReminderData, 100);
        });
    });
});
