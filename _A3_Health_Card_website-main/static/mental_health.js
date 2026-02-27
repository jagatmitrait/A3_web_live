// ============================================
// Mental Health Module JavaScript
// A3 Health Card Client Dashboard
// ============================================

// Global state for Mental Health module
const mentalHealthState = {
    currentTab: 'overview',
    stats: null,
    moods: [],
    selectedMood: null
};

// Emotion categories and triggers
const EMOTIONS = {
    joy: ['happy', 'excited', 'grateful', 'content', 'proud', 'optimistic', 'peaceful', 'amused'],
    sadness: ['sad', 'lonely', 'disappointed', 'hopeless', 'melancholic', 'grief', 'empty'],
    anger: ['angry', 'frustrated', 'irritated', 'resentful', 'jealous', 'annoyed'],
    fear: ['anxious', 'worried', 'scared', 'nervous', 'panicked', 'insecure', 'overwhelmed'],
    surprise: ['amazed', 'confused', 'startled', 'shocked'],
    neutral: ['calm', 'indifferent', 'bored', 'tired']
};

const TRIGGERS = [
    { id: 'work', label: 'Work/Career', icon: 'fa-briefcase' },
    { id: 'family', label: 'Family', icon: 'fa-home' },
    { id: 'relationships', label: 'Relationships', icon: 'fa-heart' },
    { id: 'health', label: 'Health', icon: 'fa-medkit' },
    { id: 'finances', label: 'Finances', icon: 'fa-money-bill' },
    { id: 'sleep', label: 'Sleep Quality', icon: 'fa-bed' },
    { id: 'exercise', label: 'Exercise', icon: 'fa-running' },
    { id: 'diet', label: 'Diet', icon: 'fa-utensils' },
    { id: 'weather', label: 'Weather', icon: 'fa-cloud-sun' },
    { id: 'social', label: 'Social Media', icon: 'fa-mobile' }
];

const QUICK_MOODS = [
    { id: 'great', emoji: '😊', label: 'Great', score: 9 },
    { id: 'good', emoji: '🙂', label: 'Good', score: 7 },
    { id: 'okay', emoji: '😐', label: 'Okay', score: 5 },
    { id: 'bad', emoji: '😕', label: 'Bad', score: 3 },
    { id: 'awful', emoji: '😢', label: 'Awful', score: 1 }
];

// ============================================
// INITIALIZATION
// ============================================

function initializeMentalHealthModule() {
    console.log('Initializing Mental Health Module...');

    // Load initial data
    loadMentalHealthStats();

    // Setup event listeners
    setupMentalHealthEventListeners();

    console.log('Mental Health Module initialized');
}

function setupMentalHealthEventListeners() {
    // Tab navigation
    document.querySelectorAll('.mh-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            const tabName = this.dataset.tab;
            switchMentalHealthTab(tabName);
        });
    });

    // Quick mood emoji buttons
    document.querySelectorAll('.mh-mood-emoji').forEach(btn => {
        btn.addEventListener('click', function () {
            handleQuickMoodSelect(this.dataset.mood);
        });
    });
}

// ============================================
// TAB NAVIGATION
// ============================================

function switchMentalHealthTab(tabName) {
    mentalHealthState.currentTab = tabName;

    // Update tab buttons
    document.querySelectorAll('.mh-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });

    // Update tab content
    document.querySelectorAll('.mh-tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const activeContent = document.getElementById(`mh-${tabName}-content`);
    if (activeContent) {
        activeContent.classList.add('active');
    }

    // Load tab-specific data
    switch (tabName) {
        case 'overview':
            loadMentalHealthStats();
            break;
        case 'mood':
            loadMoodHistory();
            break;
        case 'assessments':
            loadAssessmentsContent();
            break;
        case 'sleep':
            loadSleepContent();
            break;
        case 'journal':
            loadJournalContent();
            break;
        case 'mindfulness':
            loadMindfulnessContent();
            break;
        case 'insights':
            loadInsightsContent();
            break;
    }
}

// ============================================
// STATS & KPIs
// ============================================

async function loadMentalHealthStats() {
    try {
        const response = await fetch('/api/client/mental-health/stats');
        const data = await response.json();

        if (data.success) {
            mentalHealthState.stats = data.stats;
            updateMentalHealthStatCards(data.stats);
        }
    } catch (error) {
        console.error('Error loading mental health stats:', error);
    }
}

function updateMentalHealthStatCards(stats) {
    // Update mood score
    const moodScoreEl = document.getElementById('mh-stat-mood-score');
    if (moodScoreEl) {
        moodScoreEl.textContent = stats.current_mood > 0 ? stats.current_mood.toFixed(1) : '--';
    }

    // Update streak
    const streakEl = document.getElementById('mh-stat-streak');
    if (streakEl) {
        streakEl.textContent = stats.tracking_streak + ' days';
    }

    // Update assessments
    const assessmentsEl = document.getElementById('mh-stat-assessments');
    if (assessmentsEl) {
        assessmentsEl.textContent = stats.assessments_this_month;
    }

    // Update mindfulness
    const mindfulnessEl = document.getElementById('mh-stat-mindfulness');
    if (mindfulnessEl) {
        mindfulnessEl.textContent = stats.mindfulness_minutes + ' min';
    }
}

// ============================================
// QUICK MOOD LOGGING
// ============================================

function handleQuickMoodSelect(moodId) {
    const mood = QUICK_MOODS.find(m => m.id === moodId);
    if (!mood) return;

    // Update UI to show selection
    document.querySelectorAll('.mh-mood-emoji').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.mood === moodId) {
            btn.classList.add('selected');
        }
    });

    // Store selected mood
    mentalHealthState.selectedMood = mood;

    // Quick save with minimal data
    saveQuickMood(mood);
}

async function saveQuickMood(mood) {
    try {
        const now = new Date();
        const response = await fetch('/api/client/mental-health/mood', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date: now.toISOString().split('T')[0],
                time: now.toTimeString().slice(0, 5),
                mood_score: mood.score,
                quick_mood: mood.id
            })
        });

        const data = await response.json();

        if (data.success) {
            showMentalHealthNotification('Mood logged successfully!', 'success');
            loadMentalHealthStats(); // Refresh stats

            // Clear selection after a moment
            setTimeout(() => {
                document.querySelectorAll('.mh-mood-emoji').forEach(btn => {
                    btn.classList.remove('selected');
                });
                mentalHealthState.selectedMood = null;
            }, 1500);
        } else {
            showMentalHealthNotification('Error saving mood', 'error');
        }
    } catch (error) {
        console.error('Error saving quick mood:', error);
        showMentalHealthNotification('Error saving mood', 'error');
    }
}

// ============================================
// MOOD HISTORY
// ============================================

async function loadMoodHistory(days = 30) {
    try {
        const response = await fetch(`/api/client/mental-health/mood?days=${days}`);
        const data = await response.json();

        if (data.success) {
            mentalHealthState.moods = data.moods;
            renderMoodHistory(data.moods);
        }
    } catch (error) {
        console.error('Error loading mood history:', error);
    }
}

function renderMoodHistory(moods) {
    const container = document.getElementById('mh-mood-history');
    if (!container) return;

    if (moods.length === 0) {
        container.innerHTML = `
            <div class="mh-empty-state">
                <i class="fas fa-smile"></i>
                <h4>No mood entries yet</h4>
                <p>Start tracking your mood to see patterns and insights</p>
            </div>
        `;
        return;
    }

    let html = '<div class="row">';
    moods.forEach(mood => {
        const moodEmoji = QUICK_MOODS.find(m => m.id === mood.quick_mood)?.emoji || '😐';
        html += `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="mh-section-card">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <span style="font-size: 32px;">${moodEmoji}</span>
                            <span class="ms-2 fw-bold">${mood.mood_score ? mood.mood_score.toFixed(1) : '--'}/10</span>
                        </div>
                        <small class="text-muted">${formatMoodDate(mood.date)} ${mood.time || ''}</small>
                    </div>
                    ${mood.emotions && mood.emotions.length > 0 ? `
                        <div class="mt-2">
                            ${mood.emotions.map(e => `<span class="badge bg-light text-dark me-1">${e}</span>`).join('')}
                        </div>
                    ` : ''}
                    ${mood.notes ? `<p class="mt-2 mb-0 text-muted small">${mood.notes}</p>` : ''}
                </div>
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatMoodDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

function showMentalHealthNotification(message, type = 'info') {
    // Use existing notification system if available
    if (typeof showNotification === 'function') {
        showNotification(message, type);
        return;
    }

    // Fallback toast notification
    const toast = document.createElement('div');
    toast.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} position-fixed`;
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 250px;';
    toast.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-${type === 'error' ? 'times-circle' : type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
            ${message}
        </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function getMoodEmoji(score) {
    if (score >= 8) return '😊';
    if (score >= 6) return '🙂';
    if (score >= 4) return '😐';
    if (score >= 2) return '😕';
    return '😢';
}

// ============================================
// PHASE 2: DETAILED MOOD LOGGING
// ============================================

// Mood modal state
const moodModalState = {
    isEditing: false,
    editingId: null,
    moodScore: 5,
    selectedEmotions: [],
    energyLevel: 5,
    selectedTriggers: [],
    selectedActivities: [],
    notes: ''
};

const ACTIVITIES = [
    { id: 'exercise', label: 'Exercise', icon: 'fa-running' },
    { id: 'meditation', label: 'Meditation', icon: 'fa-spa' },
    { id: 'social', label: 'Socializing', icon: 'fa-users' },
    { id: 'reading', label: 'Reading', icon: 'fa-book' },
    { id: 'music', label: 'Music', icon: 'fa-music' },
    { id: 'nature', label: 'Nature Walk', icon: 'fa-tree' },
    { id: 'hobby', label: 'Hobbies', icon: 'fa-palette' },
    { id: 'work', label: 'Working', icon: 'fa-laptop' },
    { id: 'rest', label: 'Resting', icon: 'fa-couch' },
    { id: 'cooking', label: 'Cooking', icon: 'fa-utensils' }
];

function openMoodLogModal(moodId = null) {
    // Reset state
    moodModalState.isEditing = !!moodId;
    moodModalState.editingId = moodId;
    moodModalState.moodScore = 5;
    moodModalState.selectedEmotions = [];
    moodModalState.energyLevel = 5;
    moodModalState.selectedTriggers = [];
    moodModalState.selectedActivities = [];
    moodModalState.notes = '';

    // If editing, load existing data
    if (moodId) {
        const mood = mentalHealthState.moods.find(m => m.id === moodId);
        if (mood) {
            moodModalState.moodScore = mood.mood_score || 5;
            moodModalState.selectedEmotions = mood.emotions || [];
            moodModalState.energyLevel = mood.energy_level || 5;
            moodModalState.selectedTriggers = mood.triggers || [];
            moodModalState.selectedActivities = mood.activities || [];
            moodModalState.notes = mood.notes || '';
        }
    }

    // Create and show modal
    const modalHtml = createMoodModalHtml();

    // Remove existing modal if any
    const existingModal = document.getElementById('moodLogModal');
    if (existingModal) existingModal.remove();

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Initialize modal components
    initializeMoodModal();

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('moodLogModal'));
    modal.show();
}

function createMoodModalHtml() {
    return `
    <div class="modal fade mh-modal" id="moodLogModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <i class="fas fa-smile me-2"></i>${moodModalState.isEditing ? 'Edit Mood Entry' : 'Log Your Mood'}
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <!-- Mood Score Slider -->
                    <div class="mb-4">
                        <label class="form-label fw-bold"><i class="fas fa-heart me-2"></i>How are you feeling? (1-10)</label>
                        <div class="mh-mood-slider-container">
                            <div class="mh-mood-slider-labels">
                                <span>😢</span>
                                <span>😕</span>
                                <span>😐</span>
                                <span>🙂</span>
                                <span>😊</span>
                            </div>
                            <input type="range" class="mh-mood-slider" id="moodScoreSlider" 
                                   min="1" max="10" step="0.5" value="${moodModalState.moodScore}">
                            <div class="mh-mood-score-display" id="moodScoreDisplay">${moodModalState.moodScore}</div>
                        </div>
                    </div>
                    
                    <!-- Emotion Selection -->
                    <div class="mb-4">
                        <label class="form-label fw-bold"><i class="fas fa-theater-masks me-2"></i>What emotions are you experiencing?</label>
                        <div class="mh-emotion-section" id="emotionSelection">
                            ${Object.entries(EMOTIONS).map(([category, emotions]) => `
                                <div class="mh-emotion-category">
                                    <div class="mh-emotion-category-label">
                                        <i class="fas ${getCategoryIcon(category)}"></i>
                                        ${category.charAt(0).toUpperCase() + category.slice(1)}
                                    </div>
                                    <div class="mh-emotion-chips">
                                        ${emotions.map(emotion => `
                                            <span class="mh-emotion-chip ${category} ${moodModalState.selectedEmotions.includes(emotion) ? 'selected' : ''}" 
                                                  data-emotion="${emotion}" onclick="toggleEmotion('${emotion}')">
                                                ${emotion}
                                            </span>
                                        `).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Energy Level -->
                    <div class="mb-4">
                        <label class="form-label fw-bold"><i class="fas fa-bolt me-2"></i>Energy Level</label>
                        <div class="mh-energy-container">
                            <div class="mh-energy-icons">
                                ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => `
                                    <button type="button" class="mh-energy-btn ${moodModalState.energyLevel === level ? 'selected' : ''}" 
                                            data-level="${level}" onclick="setEnergyLevel(${level})">
                                        ${level}
                                    </button>
                                `).join('')}
                            </div>
                            <div class="text-center mt-2">
                                <small class="text-muted">1 = Very Low, 10 = Very High</small>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Triggers -->
                    <div class="mb-4">
                        <label class="form-label fw-bold"><i class="fas fa-bolt me-2"></i>What's influencing your mood? (Triggers)</label>
                        <div class="mh-trigger-grid" id="triggerSelection">
                            ${TRIGGERS.map(trigger => `
                                <div class="mh-trigger-item ${moodModalState.selectedTriggers.includes(trigger.id) ? 'selected' : ''}" 
                                     data-trigger="${trigger.id}" onclick="toggleTrigger('${trigger.id}')">
                                    <i class="fas ${trigger.icon}"></i>
                                    <span>${trigger.label}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Activities -->
                    <div class="mb-4">
                        <label class="form-label fw-bold"><i class="fas fa-list-check me-2"></i>Activities today</label>
                        <div class="mh-trigger-grid" id="activitySelection">
                            ${ACTIVITIES.map(activity => `
                                <div class="mh-trigger-item ${moodModalState.selectedActivities.includes(activity.id) ? 'selected' : ''}" 
                                     data-activity="${activity.id}" onclick="toggleActivity('${activity.id}')">
                                    <i class="fas ${activity.icon}"></i>
                                    <span>${activity.label}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Notes -->
                    <div class="mb-3">
                        <label class="form-label fw-bold"><i class="fas fa-pencil-alt me-2"></i>Notes (optional)</label>
                        <textarea class="form-control" id="moodNotes" rows="3" 
                                  placeholder="Any thoughts you'd like to add...">${moodModalState.notes}</textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="mh-btn-primary" onclick="saveMoodEntry()">
                        <i class="fas fa-save me-1"></i>${moodModalState.isEditing ? 'Update' : 'Save'} Entry
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;
}

function getCategoryIcon(category) {
    const icons = {
        joy: 'fa-smile',
        sadness: 'fa-sad-tear',
        anger: 'fa-angry',
        fear: 'fa-grimace',
        surprise: 'fa-surprise',
        neutral: 'fa-meh'
    };
    return icons[category] || 'fa-circle';
}

function initializeMoodModal() {
    // Setup slider
    const slider = document.getElementById('moodScoreSlider');
    const display = document.getElementById('moodScoreDisplay');

    if (slider && display) {
        slider.addEventListener('input', function () {
            moodModalState.moodScore = parseFloat(this.value);
            display.textContent = this.value;
        });
    }
}

function toggleEmotion(emotion) {
    const index = moodModalState.selectedEmotions.indexOf(emotion);
    if (index > -1) {
        moodModalState.selectedEmotions.splice(index, 1);
    } else {
        moodModalState.selectedEmotions.push(emotion);
    }

    // Update UI
    document.querySelectorAll(`.mh-emotion-chip[data-emotion="${emotion}"]`).forEach(chip => {
        chip.classList.toggle('selected');
    });
}

function setEnergyLevel(level) {
    moodModalState.energyLevel = level;

    // Update UI
    document.querySelectorAll('.mh-energy-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (parseInt(btn.dataset.level) === level) {
            btn.classList.add('selected');
        }
    });
}

function toggleTrigger(triggerId) {
    const index = moodModalState.selectedTriggers.indexOf(triggerId);
    if (index > -1) {
        moodModalState.selectedTriggers.splice(index, 1);
    } else {
        moodModalState.selectedTriggers.push(triggerId);
    }

    // Update UI
    document.querySelectorAll(`.mh-trigger-item[data-trigger="${triggerId}"]`).forEach(item => {
        item.classList.toggle('selected');
    });
}

function toggleActivity(activityId) {
    const index = moodModalState.selectedActivities.indexOf(activityId);
    if (index > -1) {
        moodModalState.selectedActivities.splice(index, 1);
    } else {
        moodModalState.selectedActivities.push(activityId);
    }

    // Update UI
    document.querySelectorAll(`.mh-trigger-item[data-activity="${activityId}"]`).forEach(item => {
        item.classList.toggle('selected');
    });
}

async function saveMoodEntry() {
    const now = new Date();
    const notes = document.getElementById('moodNotes')?.value || '';

    const moodData = {
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().slice(0, 5),
        mood_score: moodModalState.moodScore,
        quick_mood: moodModalState.moodScore >= 8 ? 'great' :
            moodModalState.moodScore >= 6 ? 'good' :
                moodModalState.moodScore >= 4 ? 'okay' :
                    moodModalState.moodScore >= 2 ? 'bad' : 'awful',
        emotions: moodModalState.selectedEmotions,
        energy_level: moodModalState.energyLevel,
        triggers: moodModalState.selectedTriggers,
        activities: moodModalState.selectedActivities,
        notes: notes
    };

    try {
        let url = '/api/client/mental-health/mood';
        let method = 'POST';

        if (moodModalState.isEditing && moodModalState.editingId) {
            url = `/api/client/mental-health/mood/${moodModalState.editingId}`;
            method = 'PUT';
        }

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(moodData)
        });

        const data = await response.json();

        if (data.success) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('moodLogModal'));
            if (modal) modal.hide();

            showMentalHealthNotification(
                moodModalState.isEditing ? 'Mood entry updated!' : 'Mood entry saved!',
                'success'
            );

            // Refresh data
            loadMentalHealthStats();
            loadMoodHistory();
        } else {
            showMentalHealthNotification('Error saving mood entry', 'error');
        }
    } catch (error) {
        console.error('Error saving mood entry:', error);
        showMentalHealthNotification('Error saving mood entry', 'error');
    }
}

async function deleteMoodEntry(moodId) {
    if (!confirm('Are you sure you want to delete this mood entry?')) return;

    try {
        const response = await fetch(`/api/client/mental-health/mood/${moodId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showMentalHealthNotification('Mood entry deleted', 'success');
            loadMoodHistory();
            loadMentalHealthStats();
        } else {
            showMentalHealthNotification('Error deleting entry', 'error');
        }
    } catch (error) {
        console.error('Error deleting mood entry:', error);
        showMentalHealthNotification('Error deleting entry', 'error');
    }
}

// Enhanced mood history rendering with cards
function renderMoodHistory(moods) {
    const container = document.getElementById('mh-mood-history');
    if (!container) return;

    if (moods.length === 0) {
        container.innerHTML = `
            <div class="mh-empty-state">
                <i class="fas fa-smile"></i>
                <h4>No mood entries yet</h4>
                <p>Start tracking your mood to see patterns and insights</p>
                <button class="mh-btn-primary" onclick="openMoodLogModal()">
                    <i class="fas fa-plus me-2"></i>Log Your First Mood
                </button>
            </div>
        `;
        return;
    }

    let html = '<div class="row">';
    moods.forEach(mood => {
        const emoji = getMoodEmoji(mood.mood_score);
        html += `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="mh-mood-card">
                    <div class="mh-mood-card-header">
                        <div>
                            <span class="mh-mood-card-emoji">${emoji}</span>
                            <span class="mh-mood-card-score">${mood.mood_score ? mood.mood_score.toFixed(1) : '--'}/10</span>
                        </div>
                        <div class="text-end">
                            <div class="mh-mood-card-date">${formatMoodDate(mood.date)}</div>
                            <small class="text-muted">${mood.time || ''}</small>
                        </div>
                    </div>
                    ${mood.emotions && mood.emotions.length > 0 ? `
                        <div class="mh-mood-card-emotions">
                            ${mood.emotions.slice(0, 5).map(e => `<span class="mh-mood-card-emotion">${e}</span>`).join('')}
                            ${mood.emotions.length > 5 ? `<span class="mh-mood-card-emotion">+${mood.emotions.length - 5}</span>` : ''}
                        </div>
                    ` : ''}
                    ${mood.energy_level ? `
                        <div class="mb-2">
                            <small class="text-muted"><i class="fas fa-bolt me-1"></i>Energy: ${mood.energy_level}/10</small>
                        </div>
                    ` : ''}
                    ${mood.notes ? `<div class="mh-mood-card-notes">${mood.notes}</div>` : ''}
                    <div class="mh-mood-card-actions">
                        <button onclick="openMoodLogModal(${mood.id})"><i class="fas fa-edit me-1"></i>Edit</button>
                        <button class="btn-delete" onclick="deleteMoodEntry(${mood.id})"><i class="fas fa-trash me-1"></i>Delete</button>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;

    // Load chart if on mood tab
    loadMoodChart();
}

// ============================================
// MOOD CHARTS
// ============================================

let moodTrendChart = null;

async function loadMoodChart() {
    try {
        const response = await fetch('/api/client/mental-health/mood/chart?days=7');
        const data = await response.json();

        if (data.success && data.chart_data.length > 0) {
            renderMoodTrendChart(data.chart_data);
        }
    } catch (error) {
        console.error('Error loading mood chart:', error);
    }
}

function renderMoodTrendChart(chartData) {
    const canvas = document.getElementById('mhMoodTrendChart');
    if (!canvas) return;

    // Destroy existing chart
    if (moodTrendChart) {
        moodTrendChart.destroy();
    }

    const ctx = canvas.getContext('2d');

    moodTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(d => formatMoodDate(d.date)),
            datasets: [
                {
                    label: 'Mood Score',
                    data: chartData.map(d => d.mood_avg),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 6,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                },
                {
                    label: 'Energy Level',
                    data: chartData.map(d => d.energy_avg),
                    borderColor: '#f5576c',
                    backgroundColor: 'rgba(245, 87, 108, 0.1)',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#f5576c',
                    borderDash: [5, 5]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    ticks: {
                        stepSize: 2
                    }
                }
            }
        }
    });
}

// Initialize when page loads mental health section
document.addEventListener('DOMContentLoaded', function () {
    // Check if we're on the mental health page
    const mentalHealthPage = document.getElementById('mental-health-page');
    if (mentalHealthPage && mentalHealthPage.classList.contains('active')) {
        initializeMentalHealthModule();
    }
});

// Export for use in client_dashboard.js
if (typeof window !== 'undefined') {
    window.initializeMentalHealthModule = initializeMentalHealthModule;
    window.loadMentalHealthStats = loadMentalHealthStats;
    window.switchMentalHealthTab = switchMentalHealthTab;
    window.openMoodLogModal = openMoodLogModal;
    window.toggleEmotion = toggleEmotion;
    window.setEnergyLevel = setEnergyLevel;
    window.toggleTrigger = toggleTrigger;
    window.toggleActivity = toggleActivity;
    window.saveMoodEntry = saveMoodEntry;
    window.deleteMoodEntry = deleteMoodEntry;
    window.startAssessment = startAssessment;
    window.selectAssessmentAnswer = selectAssessmentAnswer;
    window.nextQuestion = nextQuestion;
    window.prevQuestion = prevQuestion;
    window.submitAssessment = submitAssessment;
    window.deleteAssessment = deleteAssessment;
    window.showAssessmentHistory = showAssessmentHistory;
}

// ===========================================
// Phase 3: Assessment Functions
// ===========================================

// Assessment state
const assessmentState = {
    currentType: null,
    typeInfo: null,
    currentQuestion: 0,
    answers: [],
    isActive: false
};

/**
 * Load and render assessments tab content
 */
async function loadAssessmentsContent() {
    const container = document.getElementById('mh-assessments-content');
    if (!container) return;

    // Fetch assessment types
    try {
        const response = await fetch('/api/client/mental-health/assessments/types');
        const data = await response.json();

        if (data.success) {
            renderAssessmentsPage(data.types);
        }
    } catch (error) {
        console.error('Error loading assessments:', error);
    }
}

/**
 * Render the assessments page with type selection and history
 */
function renderAssessmentsPage(types) {
    const container = document.getElementById('mh-assessments-content');
    if (!container) return;

    container.innerHTML = `
        <div class="mh-section-card">
            <div class="mh-section-header">
                <h3><i class="fas fa-clipboard-check"></i> Take an Assessment</h3>
            </div>
            <p style="color: #6c757d; margin-bottom: 20px;">
                Over the past 2 weeks, how often have you been bothered by the following problems?
            </p>
            <div class="mh-assessment-types">
                ${Object.entries(types).map(([key, info]) => `
                    <div class="mh-assessment-type-card" onclick="startAssessment('${key}')">
                        <div class="mh-assessment-type-icon ${key.toLowerCase().replace('-', '')}">
                            <i class="fas ${key === 'PHQ-9' ? 'fa-brain' : 'fa-heartbeat'}"></i>
                        </div>
                        <div class="mh-assessment-type-name">${key}</div>
                        <div class="mh-assessment-type-desc">${info.description}</div>
                        <div style="margin-top: 10px; font-size: 0.8rem; color: #667eea;">
                            ${info.questions.length} questions • ${Math.ceil(info.questions.length * 0.5)} min
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="mh-section-card" id="assessment-history-section">
            <div class="mh-section-header">
                <h3><i class="fas fa-history"></i> Assessment History</h3>
            </div>
            <div id="assessment-history-container">
                <div class="mh-loading">
                    <div class="mh-loading-spinner"></div>
                </div>
            </div>
        </div>
    `;

    // Load assessment history
    loadAssessmentHistory();
}

/**
 * Start an assessment
 */
async function startAssessment(type) {
    try {
        const response = await fetch('/api/client/mental-health/assessments/types');
        const data = await response.json();

        if (!data.success || !data.types[type]) {
            alert('Could not load assessment');
            return;
        }

        assessmentState.currentType = type;
        assessmentState.typeInfo = data.types[type];
        assessmentState.currentQuestion = 0;
        assessmentState.answers = new Array(data.types[type].questions.length).fill(null);
        assessmentState.isActive = true;

        renderAssessmentQuiz();
    } catch (error) {
        console.error('Error starting assessment:', error);
        alert('Error loading assessment');
    }
}

/**
 * Render the assessment quiz
 */
function renderAssessmentQuiz() {
    const container = document.getElementById('mh-assessments-content');
    if (!container || !assessmentState.typeInfo) return;

    const { typeInfo, currentQuestion, answers } = assessmentState;
    const question = typeInfo.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / typeInfo.questions.length) * 100;

    container.innerHTML = `
        <div class="mh-assessment-quiz">
            <div class="mh-quiz-header">
                <div class="mh-quiz-title">${assessmentState.currentType}</div>
                <div class="mh-quiz-subtitle">${typeInfo.name}</div>
            </div>
            
            <div class="mh-quiz-progress">
                <div class="mh-quiz-progress-bar">
                    <div class="mh-quiz-progress-fill" style="width: ${progress}%;"></div>
                </div>
                <div class="mh-quiz-progress-text">
                    Question ${currentQuestion + 1} of ${typeInfo.questions.length}
                </div>
            </div>
            
            <div class="mh-question-card">
                <div class="mh-question-number">Question ${currentQuestion + 1}</div>
                <div class="mh-question-text">${question}</div>
                
                <div class="mh-answer-options">
                    ${typeInfo.options.map(opt => `
                        <div class="mh-answer-option ${answers[currentQuestion] === opt.value ? 'selected' : ''}"
                             onclick="selectAssessmentAnswer(${opt.value})">
                            <div class="mh-answer-radio"></div>
                            <div class="mh-answer-label">${opt.label}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="mh-quiz-nav">
                <button class="mh-btn-secondary" onclick="prevQuestion()" ${currentQuestion === 0 ? 'disabled style="opacity:0.5"' : ''}>
                    <i class="fas fa-arrow-left"></i> Previous
                </button>
                ${currentQuestion === typeInfo.questions.length - 1 ? `
                    <button class="mh-btn-primary" onclick="submitAssessment()" ${answers.includes(null) ? 'disabled style="opacity:0.5"' : ''}>
                        <i class="fas fa-check"></i> Submit
                    </button>
                ` : `
                    <button class="mh-btn-primary" onclick="nextQuestion()">
                        Next <i class="fas fa-arrow-right"></i>
                    </button>
                `}
            </div>
            
            <div style="text-align: center; margin-top: 16px;">
                <button class="mh-btn-secondary" onclick="cancelAssessment()" style="font-size: 0.85rem;">
                    Cancel Assessment
                </button>
            </div>
        </div>
    `;
}

/**
 * Select an answer for the current question
 */
function selectAssessmentAnswer(value) {
    assessmentState.answers[assessmentState.currentQuestion] = value;
    renderAssessmentQuiz();
}

/**
 * Go to next question
 */
function nextQuestion() {
    if (assessmentState.currentQuestion < assessmentState.typeInfo.questions.length - 1) {
        assessmentState.currentQuestion++;
        renderAssessmentQuiz();
    }
}

/**
 * Go to previous question
 */
function prevQuestion() {
    if (assessmentState.currentQuestion > 0) {
        assessmentState.currentQuestion--;
        renderAssessmentQuiz();
    }
}

/**
 * Cancel the current assessment
 */
function cancelAssessment() {
    if (confirm('Are you sure you want to cancel this assessment? Your progress will be lost.')) {
        assessmentState.isActive = false;
        loadAssessmentsContent();
    }
}

/**
 * Submit the assessment
 */
async function submitAssessment() {
    if (assessmentState.answers.includes(null)) {
        alert('Please answer all questions before submitting.');
        return;
    }

    try {
        const response = await fetch('/api/client/mental-health/assessments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                assessment_type: assessmentState.currentType,
                answers: assessmentState.answers
            })
        });

        const data = await response.json();

        if (data.success) {
            assessmentState.isActive = false;
            renderAssessmentResult(data);

            // Update stats
            loadMentalHealthStats();
        } else {
            alert('Error saving assessment: ' + data.error);
        }
    } catch (error) {
        console.error('Error submitting assessment:', error);
        alert('Error saving assessment');
    }
}

/**
 * Render assessment result
 */
function renderAssessmentResult(data) {
    const container = document.getElementById('mh-assessments-content');
    if (!container) return;

    const { interpretation } = data;
    const severityClass = interpretation.severity.toLowerCase().replace(' ', '-');

    // Get icon and color based on severity
    let icon = '✅', color = '#28a745';
    if (interpretation.severity === 'Mild') { icon = '😐'; color = '#ffc107'; }
    else if (interpretation.severity === 'Moderate') { icon = '😕'; color = '#fd7e14'; }
    else if (interpretation.severity === 'Moderately Severe') { icon = '😟'; color = '#dc3545'; }
    else if (interpretation.severity === 'Severe') { icon = '😢'; color = '#721c24'; }

    container.innerHTML = `
        <div class="mh-section-card">
            <div class="mh-result-card">
                <div class="mh-result-icon">${icon}</div>
                <div class="mh-result-score" style="color: ${color};">${interpretation.score}</div>
                <div class="mh-result-max">out of ${interpretation.max_score}</div>
                <div class="mh-result-severity ${severityClass}">${interpretation.severity}</div>
                <div class="mh-result-desc">
                    ${getResultDescription(assessmentState.currentType, interpretation.severity)}
                </div>
                <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                    <button class="mh-btn-primary" onclick="loadAssessmentsContent()">
                        <i class="fas fa-redo"></i> Take Another Assessment
                    </button>
                    <button class="mh-btn-secondary" onclick="showAssessmentHistory()">
                        <i class="fas fa-history"></i> View History
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Get result description based on type and severity
 */
function getResultDescription(type, severity) {
    const descriptions = {
        'PHQ-9': {
            'Minimal': 'Your responses suggest minimal depression symptoms. Continue monitoring your mental health.',
            'Mild': 'Your responses suggest mild depression symptoms. Consider tracking your mood and engaging in self-care activities.',
            'Moderate': 'Your responses suggest moderate depression symptoms. Consider speaking with a healthcare provider.',
            'Moderately Severe': 'Your responses suggest moderately severe depression symptoms. We recommend consulting with a healthcare provider.',
            'Severe': 'Your responses suggest severe depression symptoms. Please speak with a healthcare provider as soon as possible.'
        },
        'GAD-7': {
            'Minimal': 'Your responses suggest minimal anxiety symptoms. Continue monitoring your mental health.',
            'Mild': 'Your responses suggest mild anxiety symptoms. Consider relaxation techniques and mindfulness exercises.',
            'Moderate': 'Your responses suggest moderate anxiety symptoms. Consider speaking with a healthcare provider.',
            'Severe': 'Your responses suggest severe anxiety symptoms. We recommend consulting with a healthcare provider.'
        }
    };

    return descriptions[type]?.[severity] || 'Please consult with a healthcare provider to discuss your results.';
}

/**
 * Load assessment history
 */
async function loadAssessmentHistory() {
    const container = document.getElementById('assessment-history-container');
    if (!container) return;

    try {
        const response = await fetch('/api/client/mental-health/assessments?days=90');
        const data = await response.json();

        if (data.success && data.assessments.length > 0) {
            renderAssessmentHistory(data.assessments);
        } else {
            container.innerHTML = `
                <div class="mh-empty-state" style="padding: 24px;">
                    <i class="fas fa-clipboard-list"></i>
                    <h4>No assessments yet</h4>
                    <p>Take your first assessment to start tracking your mental health</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading assessment history:', error);
        container.innerHTML = '<p class="text-danger">Error loading history</p>';
    }
}

/**
 * Render assessment history
 */
function renderAssessmentHistory(assessments) {
    const container = document.getElementById('assessment-history-container');
    if (!container) return;

    container.innerHTML = assessments.map(a => {
        const severityClass = a.severity.toLowerCase().replace(' ', '-');
        const color = getSeverityColor(a.severity);
        const date = new Date(a.date).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });

        return `
            <div class="mh-assessment-history-card">
                <div class="mh-assessment-history-info">
                    <div class="mh-assessment-history-type">
                        <i class="fas ${a.assessment_type === 'PHQ-9' ? 'fa-brain' : 'fa-heartbeat'}" style="color: ${color}"></i>
                        ${a.assessment_type}
                    </div>
                    <div class="mh-assessment-history-date">${date}</div>
                </div>
                <div class="mh-assessment-history-score">
                    <div class="mh-assessment-history-score-value" style="color: ${color}">
                        ${a.total_score}/${a.max_score}
                    </div>
                    <div class="mh-assessment-history-severity-badge" style="background: ${color}20; color: ${color};">
                        ${a.severity}
                    </div>
                </div>
                <button class="mh-btn-icon" onclick="deleteAssessment(${a.id})" title="Delete"
                        style="margin-left: 12px; color: #dc3545;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }).join('');
}

/**
 * Get color for severity
 */
function getSeverityColor(severity) {
    const colors = {
        'Minimal': '#28a745',
        'Mild': '#ffc107',
        'Moderate': '#fd7e14',
        'Moderately Severe': '#dc3545',
        'Severe': '#721c24'
    };
    return colors[severity] || '#6c757d';
}

/**
 * Delete an assessment
 */
async function deleteAssessment(assessmentId) {
    if (!confirm('Are you sure you want to delete this assessment?')) return;

    try {
        const response = await fetch(`/api/client/mental-health/assessments/${assessmentId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            loadAssessmentHistory();
            loadMentalHealthStats();
        } else {
            alert('Error deleting assessment: ' + data.error);
        }
    } catch (error) {
        console.error('Error deleting assessment:', error);
        alert('Error deleting assessment');
    }
}

/**
 * Show/scroll to assessment history
 */
function showAssessmentHistory() {
    loadAssessmentsContent();
    setTimeout(() => {
        document.getElementById('assessment-history-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

// Make cancelAssessment available globally
if (typeof window !== 'undefined') {
    window.cancelAssessment = cancelAssessment;
    window.loadAssessmentsContent = loadAssessmentsContent;
    window.loadSleepContent = loadSleepContent;
    window.openSleepLogModal = openSleepLogModal;
    window.saveSleepEntry = saveSleepEntry;
    window.deleteSleepEntry = deleteSleepEntry;
    window.updateQualityValue = updateQualityValue;
    window.calculateSleepHours = calculateSleepHours;
}

// ===========================================
// Phase 4: Sleep Tracking Functions
// ===========================================

/**
 * Load and render sleep tracking content
 */
async function loadSleepContent() {
    const container = document.getElementById('mh-sleep-content');
    if (!container) return;

    container.innerHTML = `
        <div class="mh-section-card">
            <div class="mh-section-header">
                <h3><i class="fas fa-bed"></i> Sleep Tracking</h3>
                <button class="mh-btn-primary" onclick="openSleepLogModal()">
                    <i class="fas fa-plus"></i> Log Sleep
                </button>
            </div>
            
            <!-- Sleep Stats -->
            <div class="mh-sleep-stats" id="sleep-stats-container">
                <div class="mh-loading"><div class="mh-loading-spinner"></div></div>
            </div>
            
            <!-- Sleep Insight -->
            <div id="sleep-insight-container"></div>
            
            <!-- Sleep History -->
            <h4 style="margin-top: 24px; margin-bottom: 16px;"><i class="fas fa-history me-2"></i>Sleep History</h4>
            <div id="sleep-history-container">
                <div class="mh-loading"><div class="mh-loading-spinner"></div></div>
            </div>
        </div>
        
        <!-- Correlation Chart -->
        <div class="mh-section-card" style="margin-top: 20px;">
            <div class="mh-section-header">
                <h3><i class="fas fa-chart-line"></i> Sleep-Mood Correlation</h3>
            </div>
            <div id="sleep-correlation-container">
                <div class="mh-loading"><div class="mh-loading-spinner"></div></div>
            </div>
        </div>
    `;

    // Load data
    await Promise.all([
        loadSleepStats(),
        loadSleepHistory(),
        loadSleepCorrelation()
    ]);
}

/**
 * Load sleep statistics
 */
async function loadSleepStats() {
    try {
        const response = await fetch('/api/client/mental-health/sleep/stats?days=7');
        const data = await response.json();

        if (data.success) {
            renderSleepStats(data.stats);
        }
    } catch (error) {
        console.error('Error loading sleep stats:', error);
    }
}

/**
 * Render sleep stats
 */
function renderSleepStats(stats) {
    const container = document.getElementById('sleep-stats-container');
    if (!container) return;

    container.innerHTML = `
        <div class="mh-sleep-stat-card">
            <div class="mh-sleep-stat-value">${stats.avg_hours || '--'}</div>
            <div class="mh-sleep-stat-label">Avg Hours</div>
        </div>
        <div class="mh-sleep-stat-card">
            <div class="mh-sleep-stat-value">${stats.avg_quality || '--'}/10</div>
            <div class="mh-sleep-stat-label">Avg Quality</div>
        </div>
        <div class="mh-sleep-stat-card">
            <div class="mh-sleep-stat-value">${stats.avg_alertness || '--'}/10</div>
            <div class="mh-sleep-stat-label">Morning Alert</div>
        </div>
        <div class="mh-sleep-stat-card">
            <div class="mh-sleep-stat-value">${stats.total_entries}</div>
            <div class="mh-sleep-stat-label">Entries (7 days)</div>
        </div>
    `;
}

/**
 * Load sleep history
 */
async function loadSleepHistory() {
    try {
        const response = await fetch('/api/client/mental-health/sleep?days=30');
        const data = await response.json();

        if (data.success) {
            renderSleepHistory(data.sleep_entries);
        }
    } catch (error) {
        console.error('Error loading sleep history:', error);
    }
}

/**
 * Render sleep history
 */
function renderSleepHistory(entries) {
    const container = document.getElementById('sleep-history-container');
    if (!container) return;

    if (!entries || entries.length === 0) {
        container.innerHTML = `
            <div class="mh-empty-state" style="padding: 24px;">
                <i class="fas fa-moon"></i>
                <h4>No sleep entries yet</h4>
                <p>Start logging your sleep to track patterns</p>
            </div>
        `;
        return;
    }

    container.innerHTML = entries.map(entry => {
        const qualityClass = getQualityClass(entry.quality_rating);
        const date = new Date(entry.date).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric'
        });

        return `
            <div class="mh-sleep-entry">
                <div class="mh-sleep-entry-icon">
                    <i class="fas fa-moon"></i>
                </div>
                <div class="mh-sleep-entry-info">
                    <div class="mh-sleep-entry-date">${date}</div>
                    <div class="mh-sleep-entry-times">
                        <i class="fas fa-bed"></i> ${entry.bedtime || '--'} → 
                        <i class="fas fa-sun"></i> ${entry.wake_time || '--'}
                    </div>
                </div>
                <div class="mh-sleep-entry-stats">
                    <div class="mh-sleep-entry-hours">
                        <div class="mh-sleep-entry-hours-value">${entry.total_hours || '--'}</div>
                        <div class="mh-sleep-entry-hours-label">hours</div>
                    </div>
                    <div class="mh-sleep-entry-quality">
                        <div class="mh-sleep-quality-dot ${qualityClass}"></div>
                        <span>${entry.quality_rating || '--'}/10</span>
                    </div>
                </div>
                <div class="mh-sleep-entry-actions">
                    <button class="mh-btn-icon" onclick="deleteSleepEntry(${entry.id})" title="Delete">
                        <i class="fas fa-trash" style="color: #dc3545;"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Get quality class based on rating
 */
function getQualityClass(rating) {
    if (!rating) return '';
    if (rating >= 9) return 'excellent';
    if (rating >= 7) return 'good';
    if (rating >= 5) return 'fair';
    if (rating >= 3) return 'poor';
    return 'bad';
}

/**
 * Load sleep-mood correlation
 */
async function loadSleepCorrelation() {
    try {
        const response = await fetch('/api/client/mental-health/sleep/mood-correlation?days=30');
        const data = await response.json();

        if (data.success) {
            renderSleepCorrelation(data);
        }
    } catch (error) {
        console.error('Error loading sleep correlation:', error);
    }
}

/**
 * Render sleep-mood correlation
 */
function renderSleepCorrelation(data) {
    const container = document.getElementById('sleep-correlation-container');
    const insightContainer = document.getElementById('sleep-insight-container');
    if (!container) return;

    // Show insight
    if (insightContainer && data.insight) {
        insightContainer.innerHTML = `
            <div class="mh-sleep-insight">
                <div class="mh-sleep-insight-icon"><i class="fas fa-lightbulb"></i></div>
                <div class="mh-sleep-insight-text">${data.insight}</div>
            </div>
        `;
    }

    if (!data.correlation_data || data.correlation_data.length < 3) {
        container.innerHTML = `
            <div class="mh-empty-state" style="padding: 24px;">
                <i class="fas fa-chart-bar"></i>
                <h4>Not enough data</h4>
                <p>Log sleep and mood entries on the same days to see correlations</p>
            </div>
        `;
        return;
    }

    // Render a simple text-based correlation view
    container.innerHTML = `
        <div class="mh-correlation-legend">
            <div class="mh-correlation-legend-item">
                <div class="mh-correlation-legend-dot sleep"></div>
                <span>Sleep Hours</span>
            </div>
            <div class="mh-correlation-legend-item">
                <div class="mh-correlation-legend-dot mood"></div>
                <span>Mood Score</span>
            </div>
        </div>
        <div style="margin-top: 16px;">
            ${data.correlation_data.map(d => {
        const date = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 8px;">
                        <span style="min-width: 60px; font-weight: 500;">${date}</span>
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-bed" style="color: #5e35b1;"></i>
                                <div style="flex: 1; height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden;">
                                    <div style="width: ${Math.min(d.sleep_hours / 10 * 100, 100)}%; height: 100%; background: #5e35b1;"></div>
                                </div>
                                <span style="min-width: 35px; font-size: 0.85rem;">${d.sleep_hours}h</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                                <i class="fas fa-smile" style="color: #f093fb;"></i>
                                <div style="flex: 1; height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden;">
                                    <div style="width: ${d.mood_score * 10}%; height: 100%; background: #f093fb;"></div>
                                </div>
                                <span style="min-width: 35px; font-size: 0.85rem;">${d.mood_score}</span>
                            </div>
                        </div>
                    </div>
                `;
    }).join('')}
        </div>
    `;
}

/**
 * Open sleep log modal
 */
function openSleepLogModal() {
    const container = document.getElementById('mh-sleep-content');
    if (!container) return;

    const today = new Date().toISOString().split('T')[0];

    // Insert modal at the top of container
    const existingModal = document.getElementById('sleep-log-modal');
    if (existingModal) existingModal.remove();

    const modalHtml = `
        <div id="sleep-log-modal" class="mh-section-card" style="border: 2px solid #667eea; margin-bottom: 20px;">
            <div class="mh-section-header">
                <h3><i class="fas fa-plus"></i> Log Last Night's Sleep</h3>
                <button class="mh-btn-secondary" onclick="document.getElementById('sleep-log-modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <form id="sleep-log-form" class="mh-sleep-form">
                <div class="mh-sleep-form-row">
                    <div class="mh-form-group">
                        <label class="mh-form-label">Date</label>
                        <input type="date" class="mh-form-input" id="sleep-date" value="${today}" required>
                    </div>
                    <div class="mh-form-group">
                        <label class="mh-form-label">Bedtime</label>
                        <input type="time" class="mh-form-input" id="sleep-bedtime" onchange="calculateSleepHours()">
                    </div>
                    <div class="mh-form-group">
                        <label class="mh-form-label">Wake Time</label>
                        <input type="time" class="mh-form-input" id="sleep-wake-time" onchange="calculateSleepHours()">
                    </div>
                </div>
                
                <div class="mh-sleep-form-row">
                    <div class="mh-form-group">
                        <label class="mh-form-label">Total Hours</label>
                        <input type="number" step="0.5" class="mh-form-input" id="sleep-hours" placeholder="7.5">
                    </div>
                    <div class="mh-form-group">
                        <label class="mh-form-label">Awakenings</label>
                        <input type="number" class="mh-form-input" id="sleep-awakenings" value="0" min="0">
                    </div>
                </div>
                
                <div class="mh-form-group">
                    <label class="mh-form-label">Sleep Quality (1-10)</label>
                    <div class="mh-quality-rating">
                        <input type="range" class="mh-quality-slider" id="sleep-quality" min="1" max="10" value="7" 
                               oninput="updateQualityValue('quality', this.value)">
                        <span class="mh-quality-value" id="quality-value">7</span>
                    </div>
                </div>
                
                <div class="mh-form-group">
                    <label class="mh-form-label">Morning Alertness (1-10)</label>
                    <div class="mh-quality-rating">
                        <input type="range" class="mh-quality-slider" id="sleep-alertness" min="1" max="10" value="6" 
                               oninput="updateQualityValue('alertness', this.value)">
                        <span class="mh-quality-value" id="alertness-value">6</span>
                    </div>
                </div>
                
                <div class="mh-form-group">
                    <label class="mh-form-label">Notes (optional)</label>
                    <textarea class="mh-form-textarea" id="sleep-notes" placeholder="How was your sleep?"></textarea>
                </div>
                
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button type="button" class="mh-btn-secondary" onclick="document.getElementById('sleep-log-modal').remove()">
                        Cancel
                    </button>
                    <button type="submit" class="mh-btn-primary">
                        <i class="fas fa-save"></i> Save Sleep Entry
                    </button>
                </div>
            </form>
        </div>
    `;

    container.insertAdjacentHTML('afterbegin', modalHtml);

    // Add form submit handler
    document.getElementById('sleep-log-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveSleepEntry();
    });
}

/**
 * Update quality value display
 */
function updateQualityValue(type, value) {
    const el = document.getElementById(`${type}-value`);
    if (el) el.textContent = value;
}

/**
 * Calculate sleep hours from bedtime and wake time
 */
function calculateSleepHours() {
    const bedtime = document.getElementById('sleep-bedtime')?.value;
    const wakeTime = document.getElementById('sleep-wake-time')?.value;
    const hoursInput = document.getElementById('sleep-hours');

    if (!bedtime || !wakeTime || !hoursInput) return;

    const bed = new Date(`2000-01-01 ${bedtime}`);
    let wake = new Date(`2000-01-01 ${wakeTime}`);

    // If wake time is earlier than bedtime, it's the next day
    if (wake <= bed) {
        wake = new Date(`2000-01-02 ${wakeTime}`);
    }

    const diff = (wake - bed) / (1000 * 60 * 60);
    hoursInput.value = Math.round(diff * 2) / 2; // Round to nearest 0.5
}

/**
 * Save sleep entry
 */
async function saveSleepEntry() {
    const data = {
        date: document.getElementById('sleep-date')?.value,
        bedtime: document.getElementById('sleep-bedtime')?.value,
        wake_time: document.getElementById('sleep-wake-time')?.value,
        total_hours: parseFloat(document.getElementById('sleep-hours')?.value) || null,
        quality_rating: parseInt(document.getElementById('sleep-quality')?.value) || null,
        awakenings: parseInt(document.getElementById('sleep-awakenings')?.value) || 0,
        morning_alertness: parseInt(document.getElementById('sleep-alertness')?.value) || null,
        notes: document.getElementById('sleep-notes')?.value
    };

    try {
        const response = await fetch('/api/client/mental-health/sleep', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            document.getElementById('sleep-log-modal')?.remove();
            await loadSleepContent(); // Reload the page
        } else {
            alert('Error saving: ' + result.error);
        }
    } catch (error) {
        console.error('Error saving sleep:', error);
        alert('Error saving sleep entry');
    }
}

/**
 * Delete sleep entry
 */
async function deleteSleepEntry(id) {
    if (!confirm('Are you sure you want to delete this sleep entry?')) return;

    try {
        const response = await fetch(`/api/client/mental-health/sleep/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            await Promise.all([loadSleepHistory(), loadSleepStats()]);
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting sleep:', error);
    }
}

// ===========================================
// Phase 5: Journaling Functions
// ===========================================

// Journal state
const journalState = {
    selectedType: 'free',
    searchQuery: '',
    filterType: ''
};

/**
 * Load and render journal content
 */
async function loadJournalContent() {
    const container = document.getElementById('mh-journal-content');
    if (!container) return;

    container.innerHTML = `
        <div class="mh-section-card">
            <div class="mh-section-header">
                <h3><i class="fas fa-book"></i> Journal</h3>
                <button class="mh-btn-primary" onclick="openJournalModal()">
                    <i class="fas fa-plus"></i> New Entry
                </button>
            </div>
            
            <!-- Journal Stats -->
            <div class="mh-journal-stats" id="journal-stats-container">
                <div class="mh-loading"><div class="mh-loading-spinner"></div></div>
            </div>
            
            <!-- Search and Filter -->
            <div class="mh-journal-search">
                <input type="text" class="mh-journal-search-input" id="journal-search" 
                       placeholder="Search entries..." onkeyup="filterJournals()">
                <select class="mh-journal-filter-select" id="journal-type-filter" onchange="filterJournals()">
                    <option value="">All Types</option>
                    <option value="free">Free Writing</option>
                    <option value="gratitude">Gratitude</option>
                    <option value="cbt">CBT</option>
                </select>
            </div>
            
            <!-- Journal History -->
            <div id="journal-history-container">
                <div class="mh-loading"><div class="mh-loading-spinner"></div></div>
            </div>
        </div>
    `;

    // Load data
    await Promise.all([
        loadJournalStats(),
        loadJournalHistory()
    ]);
}

/**
 * Load journal statistics
 */
async function loadJournalStats() {
    try {
        const response = await fetch('/api/client/mental-health/journal/stats?days=30');
        const data = await response.json();

        if (data.success) {
            renderJournalStats(data.stats);
        }
    } catch (error) {
        console.error('Error loading journal stats:', error);
    }
}

/**
 * Render journal stats
 */
function renderJournalStats(stats) {
    const container = document.getElementById('journal-stats-container');
    if (!container) return;

    container.innerHTML = `
        <div class="mh-journal-stat">
            <div class="mh-journal-stat-value">${stats.total_entries}</div>
            <div class="mh-journal-stat-label">Entries (30d)</div>
        </div>
        <div class="mh-journal-stat">
            <div class="mh-journal-stat-value">${stats.streak}</div>
            <div class="mh-journal-stat-label">Day Streak</div>
        </div>
        <div class="mh-journal-stat">
            <div class="mh-journal-stat-value">${stats.by_type.free}</div>
            <div class="mh-journal-stat-label">Free Writing</div>
        </div>
        <div class="mh-journal-stat">
            <div class="mh-journal-stat-value">${stats.by_type.gratitude}</div>
            <div class="mh-journal-stat-label">Gratitude</div>
        </div>
    `;
}

/**
 * Load journal history
 */
async function loadJournalHistory() {
    try {
        let url = '/api/client/mental-health/journal?days=30';

        const search = document.getElementById('journal-search')?.value || '';
        const type = document.getElementById('journal-type-filter')?.value || '';

        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (type) url += `&type=${type}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            renderJournalHistory(data.journals);
        }
    } catch (error) {
        console.error('Error loading journal history:', error);
    }
}

/**
 * Render journal history
 */
function renderJournalHistory(entries) {
    const container = document.getElementById('journal-history-container');
    if (!container) return;

    if (!entries || entries.length === 0) {
        container.innerHTML = `
            <div class="mh-empty-state" style="padding: 24px;">
                <i class="fas fa-pen-fancy"></i>
                <h4>No journal entries yet</h4>
                <p>Start writing to capture your thoughts</p>
            </div>
        `;
        return;
    }

    container.innerHTML = entries.map(entry => {
        const date = new Date(entry.date).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric'
        });

        const typeLabels = {
            'free': '<i class="fas fa-pen"></i> Free',
            'gratitude': '<i class="fas fa-heart"></i> Gratitude',
            'cbt': '<i class="fas fa-brain"></i> CBT'
        };

        let preview = '';
        if (entry.journal_type === 'free') {
            preview = entry.content || '';
        } else if (entry.journal_type === 'gratitude' && entry.gratitude_items) {
            preview = entry.gratitude_items.slice(0, 3).map(i => `❤️ ${i}`).join(' • ');
        } else if (entry.journal_type === 'cbt') {
            preview = entry.balanced_thought || entry.situation || '';
        }

        return `
            <div class="mh-journal-entry">
                <div class="mh-journal-entry-header">
                    <div class="mh-journal-entry-info">
                        <div class="mh-journal-entry-title">${entry.title || 'Untitled Entry'}</div>
                        <div class="mh-journal-entry-meta">
                            <span><i class="fas fa-calendar"></i> ${date}</span>
                            <span class="mh-journal-entry-type ${entry.journal_type}">
                                ${typeLabels[entry.journal_type] || entry.journal_type}
                            </span>
                        </div>
                    </div>
                    <button class="mh-btn-icon" onclick="deleteJournal(${entry.id})" title="Delete">
                        <i class="fas fa-trash" style="color: #dc3545;"></i>
                    </button>
                </div>
                <div class="mh-journal-entry-preview">${preview}</div>
            </div>
        `;
    }).join('');
}

/**
 * Filter journals based on search/type
 */
function filterJournals() {
    loadJournalHistory();
}

/**
 * Open journal creation modal
 */
function openJournalModal(type = 'free') {
    journalState.selectedType = type;

    const container = document.getElementById('mh-journal-content');
    if (!container) return;

    const today = new Date().toISOString().split('T')[0];

    const existingModal = document.getElementById('journal-modal');
    if (existingModal) existingModal.remove();

    const modalHtml = `
        <div id="journal-modal" class="mh-section-card" style="border: 2px solid #667eea; margin-bottom: 20px;">
            <div class="mh-section-header">
                <h3><i class="fas fa-plus"></i> New Journal Entry</h3>
                <button class="mh-btn-secondary" onclick="document.getElementById('journal-modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <!-- Type Selector -->
            <div class="mh-journal-types">
                <button class="mh-journal-type-btn ${type === 'free' ? 'active' : ''}" onclick="setJournalType('free')">
                    <i class="fas fa-pen"></i>
                    <span>Free Writing</span>
                </button>
                <button class="mh-journal-type-btn ${type === 'gratitude' ? 'active' : ''}" onclick="setJournalType('gratitude')">
                    <i class="fas fa-heart"></i>
                    <span>Gratitude</span>
                </button>
                <button class="mh-journal-type-btn ${type === 'cbt' ? 'active' : ''}" onclick="setJournalType('cbt')">
                    <i class="fas fa-brain"></i>
                    <span>CBT Record</span>
                </button>
            </div>
            
            <form id="journal-form" class="mh-journal-form">
                <input type="hidden" id="journal-type" value="${type}">
                
                <div class="mh-form-group">
                    <label class="mh-form-label">Title (optional)</label>
                    <input type="text" class="mh-form-input" id="journal-title" placeholder="Give your entry a title...">
                </div>
                
                <div id="journal-form-content">
                    ${getJournalFormContent(type)}
                </div>
                
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button type="button" class="mh-btn-secondary" onclick="document.getElementById('journal-modal').remove()">
                        Cancel
                    </button>
                    <button type="submit" class="mh-btn-primary">
                        <i class="fas fa-save"></i> Save Entry
                    </button>
                </div>
            </form>
        </div>
    `;

    container.insertAdjacentHTML('afterbegin', modalHtml);

    document.getElementById('journal-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveJournal();
    });
}

/**
 * Get form content based on journal type
 */
function getJournalFormContent(type) {
    switch (type) {
        case 'gratitude':
            return `
                <div class="mh-form-group">
                    <label class="mh-form-label">What are you grateful for today?</label>
                    <div class="mh-gratitude-input-list">
                        <div class="mh-gratitude-input-item">
                            <span>1️⃣</span>
                            <input type="text" class="mh-form-input gratitude-item" placeholder="I'm grateful for...">
                        </div>
                        <div class="mh-gratitude-input-item">
                            <span>2️⃣</span>
                            <input type="text" class="mh-form-input gratitude-item" placeholder="I'm grateful for...">
                        </div>
                        <div class="mh-gratitude-input-item">
                            <span>3️⃣</span>
                            <input type="text" class="mh-form-input gratitude-item" placeholder="I'm grateful for...">
                        </div>
                    </div>
                </div>
                <div class="mh-form-group">
                    <label class="mh-form-label">Additional thoughts (optional)</label>
                    <textarea class="mh-form-textarea mh-form-input" id="journal-content" placeholder="Write more..."></textarea>
                </div>
            `;
        case 'cbt':
            return `
                <div class="mh-form-group">
                    <label class="mh-form-label">Situation</label>
                    <textarea class="mh-form-textarea mh-form-input" id="cbt-situation" placeholder="What happened? Where were you?"></textarea>
                </div>
                <div class="mh-form-group">
                    <label class="mh-form-label">Automatic Thoughts</label>
                    <textarea class="mh-form-textarea mh-form-input" id="cbt-thoughts" placeholder="What went through your mind?"></textarea>
                </div>
                <div class="mh-form-group">
                    <label class="mh-form-label">Evidence For This Thought</label>
                    <textarea class="mh-form-textarea mh-form-input" id="cbt-evidence-for" placeholder="What supports this thought?"></textarea>
                </div>
                <div class="mh-form-group">
                    <label class="mh-form-label">Evidence Against This Thought</label>
                    <textarea class="mh-form-textarea mh-form-input" id="cbt-evidence-against" placeholder="What contradicts this thought?"></textarea>
                </div>
                <div class="mh-form-group">
                    <label class="mh-form-label">Balanced Thought</label>
                    <textarea class="mh-form-textarea mh-form-input" id="cbt-balanced" placeholder="A more balanced way to think about this..."></textarea>
                </div>
            `;
        default: // free
            return `
                <div class="mh-form-group">
                    <label class="mh-form-label">Write freely...</label>
                    <textarea class="mh-form-textarea mh-form-input mh-journal-textarea" id="journal-content" 
                              placeholder="Express your thoughts, feelings, and experiences..."></textarea>
                </div>
            `;
    }
}

/**
 * Set journal type and update form
 */
function setJournalType(type) {
    journalState.selectedType = type;

    // Update type buttons
    document.querySelectorAll('.mh-journal-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.currentTarget.classList.add('active');

    // Update form content
    document.getElementById('journal-type').value = type;
    document.getElementById('journal-form-content').innerHTML = getJournalFormContent(type);
}

/**
 * Save journal entry
 */
async function saveJournal() {
    const type = journalState.selectedType;

    const data = {
        journal_type: type,
        title: document.getElementById('journal-title')?.value,
        date: new Date().toISOString().split('T')[0]
    };

    if (type === 'free') {
        data.content = document.getElementById('journal-content')?.value;
    } else if (type === 'gratitude') {
        const items = Array.from(document.querySelectorAll('.gratitude-item'))
            .map(input => input.value.trim())
            .filter(v => v);
        data.gratitude_items = items;
        data.content = document.getElementById('journal-content')?.value;
    } else if (type === 'cbt') {
        data.situation = document.getElementById('cbt-situation')?.value;
        data.automatic_thoughts = document.getElementById('cbt-thoughts')?.value;
        data.evidence_for = document.getElementById('cbt-evidence-for')?.value;
        data.evidence_against = document.getElementById('cbt-evidence-against')?.value;
        data.balanced_thought = document.getElementById('cbt-balanced')?.value;
    }

    try {
        const response = await fetch('/api/client/mental-health/journal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            document.getElementById('journal-modal')?.remove();
            await loadJournalContent();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error saving journal:', error);
        alert('Error saving journal entry');
    }
}

/**
 * Delete journal entry
 */
async function deleteJournal(id) {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
        const response = await fetch(`/api/client/mental-health/journal/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            await Promise.all([loadJournalHistory(), loadJournalStats()]);
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting journal:', error);
    }
}

// Export journal functions
if (typeof window !== 'undefined') {
    window.loadJournalContent = loadJournalContent;
    window.openJournalModal = openJournalModal;
    window.setJournalType = setJournalType;
    window.saveJournal = saveJournal;
    window.deleteJournal = deleteJournal;
    window.filterJournals = filterJournals;
    window.loadMindfulnessContent = loadMindfulnessContent;
    window.startBreathingExercise = startBreathingExercise;
    window.startGroundingExercise = startGroundingExercise;
    window.startMeditation = startMeditation;
    window.stopExercise = stopExercise;
}

// ===========================================
// Phase 6: Mindfulness Functions
// ===========================================

// Mindfulness state
const mindfulnessState = {
    currentTab: 'breathing',
    exerciseActive: false,
    exerciseType: null,
    exerciseName: null,
    timer: null,
    startTime: null,
    moodBefore: null
};

/**
 * Load and render mindfulness content
 */
async function loadMindfulnessContent() {
    const container = document.getElementById('mh-mindfulness-content');
    if (!container) return;

    container.innerHTML = `
        <div class="mh-section-card">
            <div class="mh-section-header">
                <h3><i class="fas fa-spa"></i> Mindfulness</h3>
            </div>
            
            <!-- Stats -->
            <div class="mh-journal-stats" id="mindfulness-stats-container">
                <div class="mh-loading"><div class="mh-loading-spinner"></div></div>
            </div>
            
            <!-- Type Tabs -->
            <div class="mh-mindfulness-tabs">
                <button class="mh-mindfulness-tab active" data-type="breathing" onclick="setMindfulnessTab('breathing')">
                    <i class="fas fa-wind"></i> Breathing
                </button>
                <button class="mh-mindfulness-tab" data-type="grounding" onclick="setMindfulnessTab('grounding')">
                    <i class="fas fa-hand-paper"></i> Grounding
                </button>
                <button class="mh-mindfulness-tab" data-type="meditation" onclick="setMindfulnessTab('meditation')">
                    <i class="fas fa-om"></i> Meditation
                </button>
            </div>
            
            <!-- Exercise Content -->
            <div id="mindfulness-exercise-container">
                <div class="mh-loading"><div class="mh-loading-spinner"></div></div>
            </div>
        </div>
        
        <!-- Session History -->
        <div class="mh-section-card" style="margin-top: 20px;">
            <div class="mh-section-header">
                <h3><i class="fas fa-history"></i> Session History</h3>
            </div>
            <div id="mindfulness-history-container">
                <div class="mh-loading"><div class="mh-loading-spinner"></div></div>
            </div>
        </div>
    `;

    await Promise.all([
        loadMindfulnessStats(),
        loadMindfulnessExercises('breathing'),
        loadMindfulnessHistory()
    ]);
}

/**
 * Load mindfulness stats
 */
async function loadMindfulnessStats() {
    try {
        const response = await fetch('/api/client/mental-health/mindfulness/stats?days=30');
        const data = await response.json();

        if (data.success) {
            const stats = data.stats;
            document.getElementById('mindfulness-stats-container').innerHTML = `
                <div class="mh-journal-stat">
                    <div class="mh-journal-stat-value">${stats.total_sessions}</div>
                    <div class="mh-journal-stat-label">Sessions</div>
                </div>
                <div class="mh-journal-stat">
                    <div class="mh-journal-stat-value">${stats.total_minutes}</div>
                    <div class="mh-journal-stat-label">Minutes</div>
                </div>
                <div class="mh-journal-stat">
                    <div class="mh-journal-stat-value">${stats.streak}</div>
                    <div class="mh-journal-stat-label">Day Streak</div>
                </div>
                <div class="mh-journal-stat">
                    <div class="mh-journal-stat-value">${stats.avg_mood_change >= 0 ? '+' : ''}${stats.avg_mood_change}</div>
                    <div class="mh-journal-stat-label">Mood Change</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading mindfulness stats:', error);
    }
}

/**
 * Set mindfulness tab
 */
function setMindfulnessTab(type) {
    mindfulnessState.currentTab = type;

    document.querySelectorAll('.mh-mindfulness-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.type === type) tab.classList.add('active');
    });

    loadMindfulnessExercises(type);
}

/**
 * Load exercises for a type
 */
async function loadMindfulnessExercises(type) {
    const container = document.getElementById('mindfulness-exercise-container');
    if (!container) return;

    try {
        const response = await fetch('/api/client/mental-health/mindfulness/exercises');
        const data = await response.json();

        if (data.success) {
            const exercises = data.exercises[type];

            container.innerHTML = `
                <div class="mh-exercise-cards">
                    ${Object.entries(exercises).map(([key, ex]) => `
                        <div class="mh-exercise-card" onclick="startExercise('${type}', '${key}')">
                            <div class="mh-exercise-card-icon">
                                <i class="fas ${ex.icon}"></i>
                            </div>
                            <div class="mh-exercise-card-name">${ex.name}</div>
                            <div class="mh-exercise-card-desc">${ex.description}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading exercises:', error);
    }
}

/**
 * Start an exercise based on type
 */
function startExercise(type, name) {
    // Ask for mood before starting
    const moodBefore = prompt('How do you feel right now? (1-10, 10 being best)', '5');
    if (!moodBefore) return;

    mindfulnessState.moodBefore = parseInt(moodBefore) || 5;
    mindfulnessState.exerciseType = type;
    mindfulnessState.exerciseName = name;
    mindfulnessState.startTime = Date.now();

    if (type === 'breathing') {
        startBreathingExercise(name);
    } else if (type === 'grounding') {
        startGroundingExercise(name);
    } else if (type === 'meditation') {
        startMeditation(name);
    }
}

/**
 * Start breathing exercise
 */
async function startBreathingExercise(name) {
    const response = await fetch('/api/client/mental-health/mindfulness/exercises');
    const data = await response.json();
    const exercise = data.exercises.breathing[name];

    const container = document.getElementById('mindfulness-exercise-container');

    container.innerHTML = `
        <div class="mh-breathing-container">
            <div class="mh-breathing-circle" id="breathing-circle">
                <i class="fas fa-wind" style="font-size: 48px;"></i>
            </div>
            <div class="mh-breathing-instruction" id="breathing-instruction">Get Ready...</div>
            <div class="mh-breathing-timer" id="breathing-timer">--</div>
            <div class="mh-breathing-progress" id="breathing-progress">Cycle 1 of ${exercise.cycles}</div>
            <button class="mh-btn-secondary" onclick="stopExercise()">
                <i class="fas fa-stop"></i> Stop
            </button>
        </div>
    `;

    // Start the breathing animation
    runBreathingCycles(exercise);
}

/**
 * Run breathing cycles
 */
async function runBreathingCycles(exercise) {
    mindfulnessState.exerciseActive = true;

    for (let cycle = 1; cycle <= exercise.cycles && mindfulnessState.exerciseActive; cycle++) {
        document.getElementById('breathing-progress').textContent = `Cycle ${cycle} of ${exercise.cycles}`;

        for (const step of exercise.steps) {
            if (!mindfulnessState.exerciseActive) break;

            const circle = document.getElementById('breathing-circle');
            const instruction = document.getElementById('breathing-instruction');
            const timer = document.getElementById('breathing-timer');

            circle.className = 'mh-breathing-circle';
            if (step.action.toLowerCase().includes('inhale')) {
                circle.classList.add('inhale');
            } else if (step.action.toLowerCase().includes('exhale')) {
                circle.classList.add('exhale');
            } else {
                circle.classList.add('hold');
            }

            instruction.textContent = step.action;

            for (let sec = step.duration; sec > 0 && mindfulnessState.exerciseActive; sec--) {
                timer.textContent = sec;
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }

    if (mindfulnessState.exerciseActive) {
        completeExercise();
    }
}

/**
 * Start grounding exercise
 */
async function startGroundingExercise(name) {
    const response = await fetch('/api/client/mental-health/mindfulness/exercises');
    const data = await response.json();
    const exercise = data.exercises.grounding[name];

    const container = document.getElementById('mindfulness-exercise-container');

    container.innerHTML = `
        <div class="mh-grounding-container">
            <h3 style="text-align: center; margin-bottom: 20px;">${exercise.name}</h3>
            ${exercise.steps.map((step, i) => `
                <div class="mh-grounding-step" id="grounding-step-${i}">
                    <div class="mh-grounding-step-number">${5 - i}</div>
                    <div class="mh-grounding-step-text">${step}</div>
                </div>
            `).join('')}
            <div style="text-align: center; margin-top: 20px;">
                <button class="mh-btn-primary" id="grounding-next-btn" onclick="nextGroundingStep()">
                    <i class="fas fa-check"></i> Done - Next Step
                </button>
                <button class="mh-btn-secondary" onclick="stopExercise()">
                    <i class="fas fa-stop"></i> Stop
                </button>
            </div>
        </div>
    `;

    mindfulnessState.exerciseActive = true;
    mindfulnessState.groundingStep = 0;
    document.getElementById('grounding-step-0').classList.add('active');
}

// Track grounding step
function nextGroundingStep() {
    const current = mindfulnessState.groundingStep;
    document.getElementById(`grounding-step-${current}`)?.classList.remove('active');

    mindfulnessState.groundingStep++;

    if (mindfulnessState.groundingStep >= 5) {
        completeExercise();
    } else {
        document.getElementById(`grounding-step-${mindfulnessState.groundingStep}`)?.classList.add('active');
    }
}

/**
 * Start meditation timer
 */
async function startMeditation(name) {
    const response = await fetch('/api/client/mental-health/mindfulness/exercises');
    const data = await response.json();
    const exercise = data.exercises.meditation[name];

    const container = document.getElementById('mindfulness-exercise-container');

    container.innerHTML = `
        <div class="mh-timer-container">
            <h3 style="margin-bottom: 16px;">${exercise.name}</h3>
            <p style="color: #6c757d; margin-bottom: 24px;">${exercise.description}</p>
            
            <div class="mh-timer-duration-select">
                ${exercise.durations.map(d => `
                    <button class="mh-timer-duration-btn ${d === 5 ? 'active' : ''}" 
                            data-duration="${d}" onclick="selectDuration(${d})">
                        ${d} min
                    </button>
                `).join('')}
            </div>
            
            <div class="mh-timer-display" id="meditation-timer">5:00</div>
            
            <div style="display: flex; gap: 12px;">
                <button class="mh-btn-primary" id="meditation-start-btn" onclick="startMeditationTimer()">
                    <i class="fas fa-play"></i> Start
                </button>
                <button class="mh-btn-secondary" onclick="stopExercise()">
                    <i class="fas fa-stop"></i> Cancel
                </button>
            </div>
        </div>
    `;

    mindfulnessState.meditationDuration = 5;
}

function selectDuration(min) {
    mindfulnessState.meditationDuration = min;
    document.querySelectorAll('.mh-timer-duration-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.duration) === min) btn.classList.add('active');
    });
    document.getElementById('meditation-timer').textContent = `${min}:00`;
}

async function startMeditationTimer() {
    mindfulnessState.exerciseActive = true;
    let seconds = mindfulnessState.meditationDuration * 60;

    document.getElementById('meditation-start-btn').style.display = 'none';
    document.querySelectorAll('.mh-timer-duration-btn').forEach(b => b.disabled = true);

    while (seconds > 0 && mindfulnessState.exerciseActive) {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        document.getElementById('meditation-timer').textContent =
            `${min}:${sec.toString().padStart(2, '0')}`;
        seconds--;
        await new Promise(r => setTimeout(r, 1000));
    }

    if (mindfulnessState.exerciseActive) {
        completeExercise();
    }
}

/**
 * Complete an exercise
 */
async function completeExercise() {
    mindfulnessState.exerciseActive = false;

    const moodAfter = prompt('How do you feel now? (1-10, 10 being best)', '7');
    const duration = Math.round((Date.now() - mindfulnessState.startTime) / 1000);

    try {
        await fetch('/api/client/mental-health/mindfulness', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                exercise_type: mindfulnessState.exerciseType,
                exercise_name: mindfulnessState.exerciseName,
                duration_seconds: duration,
                completed: true,
                mood_before: mindfulnessState.moodBefore,
                mood_after: parseInt(moodAfter) || 5
            })
        });

        alert('🎉 Great job completing your exercise!');
        loadMindfulnessContent();
    } catch (error) {
        console.error('Error logging session:', error);
    }
}

/**
 * Stop current exercise
 */
function stopExercise() {
    mindfulnessState.exerciseActive = false;
    clearInterval(mindfulnessState.timer);
    loadMindfulnessExercises(mindfulnessState.currentTab);
}

/**
 * Load mindfulness history
 */
async function loadMindfulnessHistory() {
    const container = document.getElementById('mindfulness-history-container');
    if (!container) return;

    try {
        const response = await fetch('/api/client/mental-health/mindfulness?days=30');
        const data = await response.json();

        if (data.success && data.sessions.length > 0) {
            const exerciseNames = {
                'box': 'Box Breathing', '478': '4-7-8 Breathing', 'diaphragmatic': 'Belly Breathing',
                '54321': '5-4-3-2-1 Grounding', 'body_scan': 'Body Scan',
                'mindful': 'Mindful Meditation', 'loving_kindness': 'Loving Kindness'
            };

            container.innerHTML = data.sessions.map(s => {
                const date = new Date(s.date).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric'
                });
                const moodChange = s.mood_after && s.mood_before ? s.mood_after - s.mood_before : 0;
                const moodClass = moodChange > 0 ? 'positive' : moodChange < 0 ? 'negative' : 'neutral';
                const minutes = Math.round((s.duration_seconds || 0) / 60);

                return `
                    <div class="mh-mindfulness-session">
                        <div class="mh-mindfulness-session-icon ${s.exercise_type}">
                            <i class="fas ${s.exercise_type === 'breathing' ? 'fa-wind' : s.exercise_type === 'grounding' ? 'fa-hand-paper' : 'fa-om'}"></i>
                        </div>
                        <div class="mh-mindfulness-session-info">
                            <div class="mh-mindfulness-session-name">${exerciseNames[s.exercise_name] || s.exercise_name}</div>
                            <div class="mh-mindfulness-session-meta">
                                <span><i class="fas fa-calendar"></i> ${date}</span>
                                <span><i class="fas fa-clock"></i> ${minutes} min</span>
                            </div>
                        </div>
                        <div class="mh-mindfulness-session-mood">
                            <div class="mh-mindfulness-session-mood-change ${moodClass}">
                                ${moodChange > 0 ? '+' : ''}${moodChange || '—'}
                            </div>
                            <div style="font-size: 0.75rem; color: #6c757d;">mood</div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = `
                <div class="mh-empty-state" style="padding: 24px;">
                    <i class="fas fa-spa"></i>
                    <h4>No sessions yet</h4>
                    <p>Start a mindfulness exercise to begin tracking</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading mindfulness history:', error);
    }
}

// Export new functions
if (typeof window !== 'undefined') {
    window.setMindfulnessTab = setMindfulnessTab;
    window.startExercise = startExercise;
    window.nextGroundingStep = nextGroundingStep;
    window.selectDuration = selectDuration;
    window.startMeditationTimer = startMeditationTimer;
    window.loadInsightsContent = loadInsightsContent;
    window.setInsightsPeriod = setInsightsPeriod;
    window.exportReport = exportReport;
}

// ===========================================
// Phase 7: AI Insights Functions
// ===========================================

// Insights state
const insightsState = {
    period: 30
};

/**
 * Load and render insights content
 */
async function loadInsightsContent() {
    const container = document.getElementById('mh-insights-content');
    if (!container) return;

    container.innerHTML = `
        <div class="mh-section-card">
            <div class="mh-section-header">
                <h3><i class="fas fa-brain"></i> AI Insights</h3>
                <button class="mh-export-btn" onclick="exportReport()">
                    <i class="fas fa-download"></i> Export Report
                </button>
            </div>
            
            <!-- Period Selector -->
            <div class="mh-period-selector">
                <button class="mh-period-btn ${insightsState.period === 7 ? 'active' : ''}" onclick="setInsightsPeriod(7)">7 Days</button>
                <button class="mh-period-btn ${insightsState.period === 30 ? 'active' : ''}" onclick="setInsightsPeriod(30)">30 Days</button>
                <button class="mh-period-btn ${insightsState.period === 90 ? 'active' : ''}" onclick="setInsightsPeriod(90)">90 Days</button>
            </div>
            
            <!-- Summary Stats -->
            <div class="mh-summary-grid" id="insights-summary-container">
                <div class="mh-loading"><div class="mh-loading-spinner"></div></div>
            </div>
            
            <!-- AI Insights -->
            <h4 style="margin-bottom: 16px;"><i class="fas fa-lightbulb me-2"></i>Personalized Insights</h4>
            <div class="mh-insights-list" id="insights-list-container">
                <div class="mh-loading"><div class="mh-loading-spinner"></div></div>
            </div>
        </div>
        
        <!-- Trends Chart -->
        <div class="mh-section-card" style="margin-top: 20px;">
            <div class="mh-section-header">
                <h3><i class="fas fa-chart-line"></i> Trends</h3>
            </div>
            <div id="insights-trends-container">
                <div class="mh-loading"><div class="mh-loading-spinner"></div></div>
            </div>
        </div>
    `;

    await Promise.all([
        loadInsights(),
        loadTrends()
    ]);
}

/**
 * Set insights period
 */
function setInsightsPeriod(days) {
    insightsState.period = days;

    document.querySelectorAll('.mh-period-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.currentTarget.classList.add('active');

    loadInsights();
    loadTrends();
}

/**
 * Load AI insights
 */
async function loadInsights() {
    try {
        const response = await fetch(`/api/client/mental-health/insights?days=${insightsState.period}`);
        const data = await response.json();

        if (data.success) {
            renderSummary(data.summary);
            renderInsights(data.insights);
        }
    } catch (error) {
        console.error('Error loading insights:', error);
    }
}

/**
 * Render summary stats
 */
function renderSummary(summary) {
    const container = document.getElementById('insights-summary-container');
    if (!container) return;

    container.innerHTML = `
        <div class="mh-summary-card">
            <div class="mh-summary-card-value">${summary.avg_mood || '--'}</div>
            <div class="mh-summary-card-label">Avg Mood</div>
        </div>
        <div class="mh-summary-card">
            <div class="mh-summary-card-value">${summary.avg_sleep || '--'}h</div>
            <div class="mh-summary-card-label">Avg Sleep</div>
        </div>
        <div class="mh-summary-card">
            <div class="mh-summary-card-value">${summary.total_mood_entries}</div>
            <div class="mh-summary-card-label">Mood Logs</div>
        </div>
        <div class="mh-summary-card">
            <div class="mh-summary-card-value">${summary.total_journal_entries}</div>
            <div class="mh-summary-card-label">Journal Entries</div>
        </div>
        <div class="mh-summary-card">
            <div class="mh-summary-card-value">${summary.total_mindfulness_sessions}</div>
            <div class="mh-summary-card-label">Mindfulness</div>
        </div>
        <div class="mh-summary-card">
            <div class="mh-summary-card-value">${summary.total_assessments}</div>
            <div class="mh-summary-card-label">Assessments</div>
        </div>
    `;
}

/**
 * Render AI insights
 */
function renderInsights(insights) {
    const container = document.getElementById('insights-list-container');
    if (!container) return;

    if (!insights || insights.length === 0) {
        container.innerHTML = `
            <div class="mh-empty-state" style="padding: 24px;">
                <i class="fas fa-brain"></i>
                <h4>No insights yet</h4>
                <p>Keep tracking your mood, sleep, and activities to receive personalized insights!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = insights.map(insight => `
        <div class="mh-insight-card ${insight.type}">
            <div class="mh-insight-icon">
                <i class="fas ${insight.icon}"></i>
            </div>
            <div class="mh-insight-content">
                <div class="mh-insight-title">${insight.title}</div>
                <div class="mh-insight-message">${insight.message}</div>
            </div>
        </div>
    `).join('');
}

/**
 * Load trends data
 */
async function loadTrends() {
    try {
        const response = await fetch(`/api/client/mental-health/trends?days=${insightsState.period}`);
        const data = await response.json();

        if (data.success) {
            renderTrends(data.trends);
        }
    } catch (error) {
        console.error('Error loading trends:', error);
    }
}

/**
 * Render trends visualization
 */
function renderTrends(trends) {
    const container = document.getElementById('insights-trends-container');
    if (!container) return;

    if (!trends || trends.length === 0) {
        container.innerHTML = `
            <div class="mh-empty-state" style="padding: 24px;">
                <i class="fas fa-chart-bar"></i>
                <h4>No trend data yet</h4>
                <p>Log your mood and sleep to see trends over time</p>
            </div>
        `;
        return;
    }

    // Show last 14 entries max
    const displayTrends = trends.slice(-14);

    container.innerHTML = `
        <div class="mh-trend-chart">
            <div class="mh-trend-chart-legend">
                <div class="mh-trend-legend-item">
                    <div class="mh-trend-legend-dot mood"></div>
                    <span>Mood (0-10)</span>
                </div>
                <div class="mh-trend-legend-item">
                    <div class="mh-trend-legend-dot sleep"></div>
                    <span>Sleep (hours)</span>
                </div>
                <div class="mh-trend-legend-item">
                    <div class="mh-trend-legend-dot energy"></div>
                    <span>Energy (0-10)</span>
                </div>
            </div>
            ${displayTrends.map(t => {
        const date = new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `
                    <div class="mh-trend-row">
                        <div class="mh-trend-date">${date}</div>
                        <div class="mh-trend-bars">
                            ${t.mood !== null ? `
                                <div class="mh-trend-bar-row">
                                    <div class="mh-trend-bar-label">Mood</div>
                                    <div class="mh-trend-bar-container">
                                        <div class="mh-trend-bar mood" style="width: ${t.mood * 10}%"></div>
                                    </div>
                                    <div class="mh-trend-bar-value">${t.mood}</div>
                                </div>
                            ` : ''}
                            ${t.sleep !== null ? `
                                <div class="mh-trend-bar-row">
                                    <div class="mh-trend-bar-label">Sleep</div>
                                    <div class="mh-trend-bar-container">
                                        <div class="mh-trend-bar sleep" style="width: ${Math.min(t.sleep / 10 * 100, 100)}%"></div>
                                    </div>
                                    <div class="mh-trend-bar-value">${t.sleep}h</div>
                                </div>
                            ` : ''}
                            ${t.energy !== null ? `
                                <div class="mh-trend-bar-row">
                                    <div class="mh-trend-bar-label">Energy</div>
                                    <div class="mh-trend-bar-container">
                                        <div class="mh-trend-bar energy" style="width: ${t.energy * 10}%"></div>
                                    </div>
                                    <div class="mh-trend-bar-value">${t.energy}</div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
    }).join('')}
        </div>
    `;
}

/**
 * Export mental health report
 */
async function exportReport() {
    try {
        const response = await fetch(`/api/client/mental-health/report?days=${insightsState.period}`);
        const data = await response.json();

        if (data.success) {
            // Create downloadable JSON
            const blob = new Blob([JSON.stringify(data.report, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mental_health_report_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            alert('✅ Report downloaded successfully!');
        } else {
            alert('Error generating report: ' + data.error);
        }
    } catch (error) {
        console.error('Error exporting report:', error);
        alert('Error exporting report');
    }
}
