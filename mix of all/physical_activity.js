/**
 * Physical Activity Module JavaScript
 * Handles workouts, exercises, goals, schedule, and achievements
 */

// ===========================================
// Module State
// ===========================================

const paState = {
    currentTab: 'dashboard',
    stats: null,
    profile: null,
    workouts: [],
    exercises: [],
    goals: [],
    schedules: [],
    favorites: [],
    isInitialized: false
};

// ===========================================
// Initialization
// ===========================================

// Initialize the Physical Activity module
function initializePhysicalActivityModule() {
    if (paState.isInitialized) return;

    console.log('Initializing Physical Activity module...');

    setupPAEventListeners();
    loadPADashboardContent();

    paState.isInitialized = true;
}

// Setup event listeners
function setupPAEventListeners() {
    // Tab navigation
    document.querySelectorAll('.pa-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = tab.dataset.tab;
            switchPATab(tabName);
        });
    });

    // Quick action buttons
    const logWorkoutBtn = document.getElementById('pa-log-workout-btn');
    if (logWorkoutBtn) {
        logWorkoutBtn.addEventListener('click', () => openLogWorkoutModal());
    }

    const browseExercisesBtn = document.getElementById('pa-browse-exercises-btn');
    if (browseExercisesBtn) {
        browseExercisesBtn.addEventListener('click', () => switchPATab('exercises'));
    }

    const setGoalBtn = document.getElementById('pa-set-goal-btn');
    if (setGoalBtn) {
        setGoalBtn.addEventListener('click', () => openSetGoalModal());
    }

    const viewAllWorkoutsBtn = document.getElementById('pa-view-all-workouts');
    if (viewAllWorkoutsBtn) {
        viewAllWorkoutsBtn.addEventListener('click', () => switchPATab('workouts'));
    }
}

// Switch between tabs
function switchPATab(tabName) {
    paState.currentTab = tabName;

    // Update tab buttons
    document.querySelectorAll('.pa-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.pa-tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const activeContent = document.getElementById(`pa-${tabName}-content`);
    if (activeContent) {
        activeContent.classList.add('active');
    }

    // Load content for the tab
    switch (tabName) {
        case 'dashboard':
            loadPADashboardContent();
            break;
        case 'workouts':
            loadWorkoutsContent();
            break;
        case 'exercises':
            loadExercisesContent();
            break;
        case 'goals':
            loadGoalsContent();
            break;
        case 'schedule':
            loadScheduleContent();
            break;
        case 'achievements':
            loadAchievementsContent();
            break;
    }
}

// ===========================================
// Dashboard
// ===========================================

async function loadPADashboardContent() {
    try {
        const response = await fetch('/api/client/physical-activity/stats');
        const data = await response.json();

        if (data.success) {
            paState.stats = data.stats;
            renderPADashboard(data.stats);
        } else {
            console.error('Failed to load stats:', data.error);
            renderPADashboardEmpty();
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        renderPADashboardEmpty();
    }
}

function renderPADashboard(stats) {
    // Update stat cards
    document.getElementById('pa-today-calories').textContent = stats.today?.calories || 0;
    document.getElementById('pa-today-minutes').textContent = stats.today?.minutes || 0;
    document.getElementById('pa-current-streak').textContent = stats.profile?.current_streak || 0;
    document.getElementById('pa-total-workouts').textContent = stats.profile?.total_workouts || 0;

    // Update weekly progress
    const weekSessions = stats.week?.sessions || 0;
    const weekMinutes = stats.week?.minutes || 0;
    const weekCalories = stats.week?.calories || 0;
    const targetMinutes = stats.week?.target_minutes || 150;

    document.getElementById('pa-week-sessions').textContent = `${weekSessions} / 5`;
    document.getElementById('pa-week-minutes').textContent = `${weekMinutes} / ${targetMinutes}`;
    document.getElementById('pa-week-calories').textContent = weekCalories;

    // Update progress bars
    document.getElementById('pa-week-sessions-bar').style.width = `${Math.min(100, (weekSessions / 5) * 100)}%`;
    document.getElementById('pa-week-minutes-bar').style.width = `${Math.min(100, (weekMinutes / targetMinutes) * 100)}%`;
    document.getElementById('pa-week-calories-bar').style.width = `${Math.min(100, (weekCalories / 2000) * 100)}%`;

    // Load recent workouts
    loadRecentWorkouts();
}

function renderPADashboardEmpty() {
    document.getElementById('pa-today-calories').textContent = '0';
    document.getElementById('pa-today-minutes').textContent = '0';
    document.getElementById('pa-current-streak').textContent = '0';
    document.getElementById('pa-total-workouts').textContent = '0';
}

async function loadRecentWorkouts() {
    try {
        const response = await fetch('/api/client/physical-activity/workouts?limit=5');
        const data = await response.json();

        const container = document.getElementById('pa-recent-workouts');
        if (!container) return;

        if (data.success && data.workouts && data.workouts.length > 0) {
            container.innerHTML = data.workouts.map(w => renderWorkoutCard(w)).join('');
        } else {
            container.innerHTML = `
                <div class="pa-empty-state-small">
                    <i class="fas fa-dumbbell"></i>
                    <p>No workouts logged yet. Start by logging your first workout!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading recent workouts:', error);
    }
}

function renderWorkoutCard(workout) {
    const categoryIcons = {
        'cardio': 'fa-heartbeat',
        'strength': 'fa-dumbbell',
        'yoga': 'fa-spa',
        'hiit': 'fa-fire',
        'dance': 'fa-music',
        'sports': 'fa-futbol',
        'flexibility': 'fa-child'
    };

    const icon = categoryIcons[workout.exercise_category] || 'fa-running';
    const date = new Date(workout.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    return `
        <div class="pa-workout-card" data-id="${workout.id}">
            <div class="pa-workout-icon">
                <i class="fas ${icon}"></i>
            </div>
            <div class="pa-workout-info">
                <div class="pa-workout-name">${workout.exercise_name}</div>
                <div class="pa-workout-meta">
                    <span><i class="fas fa-clock"></i> ${workout.duration_minutes} min</span>
                    <span><i class="fas fa-calendar"></i> ${date}</span>
                </div>
            </div>
            <div class="pa-workout-calories">
                <i class="fas fa-fire"></i> ${workout.calories_burned || 0}
            </div>
        </div>
    `;
}

// ===========================================
// Workouts Tab
// ===========================================

async function loadWorkoutsContent() {
    const container = document.getElementById('pa-workouts-content');
    if (!container) return;

    container.innerHTML = `
        <div class="pa-section-card">
            <div class="pa-section-header">
                <h3><i class="fas fa-dumbbell"></i> Workout Log</h3>
                <button class="pa-btn pa-btn-primary" onclick="openLogWorkoutModal()">
                    <i class="fas fa-plus"></i> Log Workout
                </button>
            </div>
        </div>
        <div id="pa-workouts-list">
            <div class="pa-loading"><div class="pa-loading-spinner"></div></div>
        </div>
    `;

    try {
        const response = await fetch('/api/client/physical-activity/workouts?days=30');
        const data = await response.json();

        const listContainer = document.getElementById('pa-workouts-list');

        if (data.success && data.workouts && data.workouts.length > 0) {
            listContainer.innerHTML = data.workouts.map(w => renderWorkoutCard(w)).join('');
            paState.workouts = data.workouts;
        } else {
            listContainer.innerHTML = `
                <div class="pa-section-card">
                    <div class="pa-empty-state-small">
                        <i class="fas fa-dumbbell"></i>
                        <p>No workouts logged in the last 30 days</p>
                        <button class="pa-btn pa-btn-primary" onclick="openLogWorkoutModal()">
                            <i class="fas fa-plus"></i> Log Your First Workout
                        </button>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading workouts:', error);
    }
}

// ===========================================
// Exercises Tab
// ===========================================

async function loadExercisesContent() {
    const container = document.getElementById('pa-exercises-content');
    if (!container) return;

    container.innerHTML = `
        <div class="pa-section-card">
            <div class="pa-section-header">
                <h3><i class="fas fa-running"></i> Exercise Library</h3>
                <button class="pa-btn pa-btn-primary" onclick="openAddExerciseModal()">
                    <i class="fas fa-plus"></i> Add Exercise
                </button>
            </div>
            <div class="pa-exercise-filters">
                <input type="search" id="pa-exercise-search" class="pa-form-control" placeholder="Search exercises..." oninput="searchExercises(this.value)">
                <select id="pa-category-filter" class="pa-form-control" onchange="filterExercisesByCategory(this.value)" style="max-width: 200px; margin-left: 12px;">
                    <option value="">All Categories</option>
                    <option value="cardio">🏃 Cardio</option>
                    <option value="strength">💪 Strength</option>
                    <option value="yoga">🧘 Yoga</option>
                    <option value="hiit">🔥 HIIT</option>
                    <option value="dance">💃 Dance</option>
                    <option value="sports">⚽ Sports</option>
                    <option value="flexibility">🤸 Flexibility</option>
                </select>
            </div>
        </div>
        <div class="pa-exercise-grid" id="pa-exercises-grid">
            <div class="pa-loading"><div class="pa-loading-spinner"></div></div>
        </div>
    `;

    await loadAllExercises();
}

async function loadAllExercises(search = '', category = '') {
    try {
        let url = '/api/client/physical-activity/exercises?limit=50';
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (category) url += `&category=${category}`;

        const response = await fetch(url);
        const data = await response.json();

        const grid = document.getElementById('pa-exercises-grid');
        if (!grid) return;

        if (data.success && data.exercises && data.exercises.length > 0) {
            grid.innerHTML = data.exercises.map(e => renderExerciseCard(e)).join('');
            paState.exercises = data.exercises;
        } else {
            grid.innerHTML = `
                <div class="pa-section-card" style="grid-column: 1/-1;">
                    <div class="pa-empty-state-small">
                        <i class="fas fa-search"></i>
                        <p>No exercises found. Try a different search.</p>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading exercises:', error);
    }
}

function searchExercises(query) {
    clearTimeout(window.exerciseSearchTimeout);
    window.exerciseSearchTimeout = setTimeout(() => {
        const category = document.getElementById('pa-category-filter')?.value || '';
        loadAllExercises(query, category);
    }, 300);
}

function filterExercisesByCategory(category) {
    const search = document.getElementById('pa-exercise-search')?.value || '';
    loadAllExercises(search, category);
}

function renderExerciseCard(exercise) {
    const difficultyClass = `pa-difficulty-badge ${exercise.difficulty_level}`;
    const categoryClass = `pa-exercise-category pa-category-${exercise.category}`;

    return `
        <div class="pa-exercise-card" onclick="selectExerciseForWorkout(${exercise.id}, '${exercise.name}', ${exercise.met_value})">
            <div class="pa-exercise-header">
                <div class="pa-exercise-name">${exercise.name}</div>
                <span class="${categoryClass}">${exercise.category}</span>
            </div>
            ${exercise.name_hindi ? `<div style="font-size: 0.85rem; color: #666; margin-bottom: 8px;">${exercise.name_hindi}</div>` : ''}
            <div class="pa-exercise-meta">
                <span class="${difficultyClass}">${exercise.difficulty_level}</span>
                <span><i class="fas fa-fire"></i> MET: ${exercise.met_value}</span>
            </div>
        </div>
    `;
}

function selectExerciseForWorkout(exerciseId, exerciseName, metValue) {
    openLogWorkoutModal(exerciseId, exerciseName, metValue);
}

// Add Custom Exercise Modal
function openAddExerciseModal() {
    const modalHTML = `
        <div class="pa-modal show" id="pa-add-exercise-modal">
            <div class="pa-modal-content">
                <div class="pa-modal-header">
                    <h3><i class="fas fa-plus-circle"></i> Add Custom Exercise</h3>
                    <button class="pa-modal-close" onclick="closePAModal('pa-add-exercise-modal')">&times;</button>
                </div>
                <div class="pa-modal-body">
                    <form id="pa-add-exercise-form">
                        <div class="pa-form-group">
                            <label>Exercise Name (English) *</label>
                            <input type="text" class="pa-form-control" id="new-exercise-name" placeholder="e.g., Jump Squats" required>
                        </div>
                        <div class="pa-form-group">
                            <label>Exercise Name (Hindi)</label>
                            <input type="text" class="pa-form-control" id="new-exercise-name-hindi" placeholder="e.g., जम्प स्क्वाट्स">
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="pa-form-group">
                                <label>Category *</label>
                                <select class="pa-form-control" id="new-exercise-category" required>
                                    <option value="cardio">🏃 Cardio</option>
                                    <option value="strength">💪 Strength</option>
                                    <option value="yoga">🧘 Yoga</option>
                                    <option value="hiit">🔥 HIIT</option>
                                    <option value="dance">💃 Dance</option>
                                    <option value="sports">⚽ Sports</option>
                                    <option value="flexibility">🤸 Flexibility</option>
                                    <option value="mind-body">🧠 Mind-Body</option>
                                </select>
                            </div>
                            <div class="pa-form-group">
                                <label>Difficulty *</label>
                                <select class="pa-form-control" id="new-exercise-difficulty" required>
                                    <option value="easy">Easy</option>
                                    <option value="medium" selected>Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="pa-form-group">
                                <label>MET Value *</label>
                                <input type="number" class="pa-form-control" id="new-exercise-met" value="5.0" min="1" max="20" step="0.5" required>
                                <small style="color: #666; font-size: 0.8rem;">Energy expenditure (1-20). Higher = more intense</small>
                            </div>
                            <div class="pa-form-group">
                                <label>Equipment Required</label>
                                <input type="text" class="pa-form-control" id="new-exercise-equipment" placeholder="e.g., Dumbbells, Mat">
                            </div>
                        </div>
                        <div class="pa-form-group">
                            <label>Muscle Groups</label>
                            <input type="text" class="pa-form-control" id="new-exercise-muscles" placeholder="e.g., Legs, Core, Glutes">
                        </div>
                        <div class="pa-form-group">
                            <label>Description</label>
                            <textarea class="pa-form-control" id="new-exercise-description" rows="2" placeholder="Brief description of the exercise..."></textarea>
                        </div>
                    </form>
                </div>
                <div class="pa-modal-footer">
                    <button class="pa-btn pa-btn-secondary" onclick="closePAModal('pa-add-exercise-modal')">Cancel</button>
                    <button class="pa-btn pa-btn-primary" onclick="saveCustomExercise()">
                        <i class="fas fa-save"></i> Save Exercise
                    </button>
                </div>
            </div>
        </div>
    `;

    const existing = document.getElementById('pa-add-exercise-modal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function saveCustomExercise() {
    const name = document.getElementById('new-exercise-name').value.trim();
    const nameHindi = document.getElementById('new-exercise-name-hindi').value.trim();
    const category = document.getElementById('new-exercise-category').value;
    const difficulty = document.getElementById('new-exercise-difficulty').value;
    const metValue = parseFloat(document.getElementById('new-exercise-met').value);
    const equipment = document.getElementById('new-exercise-equipment').value.trim();
    const muscles = document.getElementById('new-exercise-muscles').value.trim();
    const description = document.getElementById('new-exercise-description').value.trim();

    if (!name) {
        alert('Please enter an exercise name');
        return;
    }

    if (!metValue || metValue < 1 || metValue > 20) {
        alert('Please enter a valid MET value between 1 and 20');
        return;
    }

    try {
        const response = await fetch('/api/client/physical-activity/exercises', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                name_hindi: nameHindi || null,
                category: category,
                difficulty_level: difficulty,
                met_value: metValue,
                equipment_required: equipment || null,
                muscle_groups: muscles || null,
                description: description || null
            })
        });

        const data = await response.json();

        if (data.success) {
            closePAModal('pa-add-exercise-modal');
            showPAToast('Exercise added successfully! 🎉');
            loadAllExercises(); // Refresh the exercise list
        } else {
            alert('Error: ' + (data.error || 'Failed to add exercise'));
        }
    } catch (error) {
        console.error('Error saving exercise:', error);
        alert('Failed to save exercise');
    }
}

// ===========================================
// Goals Tab
// ===========================================

async function loadGoalsContent() {
    const container = document.getElementById('pa-goals-content');
    if (!container) return;

    container.innerHTML = `
        <div class="pa-section-card">
            <div class="pa-section-header">
                <h3><i class="fas fa-bullseye"></i> My Goals</h3>
                <button class="pa-btn pa-btn-primary" onclick="openSetGoalModal()">
                    <i class="fas fa-plus"></i> Set Goal
                </button>
            </div>
        </div>
        <div id="pa-goals-list">
            <div class="pa-loading"><div class="pa-loading-spinner"></div></div>
        </div>
    `;

    try {
        const response = await fetch('/api/client/physical-activity/goals');
        const data = await response.json();

        const listContainer = document.getElementById('pa-goals-list');

        if (data.success && data.goals && data.goals.length > 0) {
            listContainer.innerHTML = data.goals.map(g => renderGoalCard(g)).join('');
            paState.goals = data.goals;
        } else {
            listContainer.innerHTML = `
                <div class="pa-section-card">
                    <div class="pa-empty-state-small">
                        <i class="fas fa-bullseye"></i>
                        <p>No goals set yet</p>
                        <button class="pa-btn pa-btn-primary" onclick="openSetGoalModal()">
                            <i class="fas fa-plus"></i> Set Your First Goal
                        </button>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading goals:', error);
    }
}

function renderGoalCard(goal) {
    const progress = goal.progress_percentage || 0;
    const isComplete = goal.is_completed;

    return `
        <div class="pa-goal-card ${isComplete ? 'completed' : ''}">
            <div class="pa-goal-header">
                <div class="pa-goal-name">${goal.goal_name || goal.goal_type}</div>
                <span class="pa-difficulty-badge ${isComplete ? 'easy' : 'medium'}">${isComplete ? '✓ Complete' : goal.period_type}</span>
            </div>
            <div class="pa-goal-progress">
                <div class="pa-goal-progress-text">
                    <span>Progress</span>
                    <span class="pa-goal-current">${goal.current_value || 0} / ${goal.target_value} ${goal.target_unit || ''}</span>
                </div>
                <div class="pa-progress-bar">
                    <div class="pa-progress-fill" style="width: ${Math.min(100, progress)}%"></div>
                </div>
            </div>
            ${!isComplete ? `
                <div style="margin-top: 12px; text-align: right;">
                    <button class="pa-btn pa-btn-secondary" onclick="deleteGoal(${goal.id})" style="padding: 6px 12px; font-size: 0.85rem;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

// ===========================================
// Schedule Tab
// ===========================================

async function loadScheduleContent() {
    const container = document.getElementById('pa-schedule-content');
    if (!container) return;

    container.innerHTML = `
        <div class="pa-section-card">
            <div class="pa-section-header">
                <h3><i class="fas fa-calendar-alt"></i> Workout Schedule</h3>
                <button class="pa-btn pa-btn-primary" onclick="openScheduleModal()">
                    <i class="fas fa-plus"></i> Add Schedule
                </button>
            </div>
        </div>
        <div id="pa-schedule-list">
            <div class="pa-loading"><div class="pa-loading-spinner"></div></div>
        </div>
    `;

    try {
        const response = await fetch('/api/client/physical-activity/schedule');
        const data = await response.json();

        const listContainer = document.getElementById('pa-schedule-list');

        if (data.success && data.schedules && data.schedules.length > 0) {
            listContainer.innerHTML = data.schedules.map(s => renderScheduleItem(s)).join('');
            paState.schedules = data.schedules;
        } else {
            listContainer.innerHTML = `
                <div class="pa-section-card">
                    <div class="pa-empty-state-small">
                        <i class="fas fa-calendar-plus"></i>
                        <p>No scheduled workouts</p>
                        <button class="pa-btn pa-btn-primary" onclick="openScheduleModal()">
                            <i class="fas fa-plus"></i> Schedule a Workout
                        </button>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading schedule:', error);
    }
}

function renderScheduleItem(schedule) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = schedule.day_of_week !== null ? days[schedule.day_of_week] : '';
    const time = schedule.scheduled_time || '09:00';

    return `
        <div class="pa-schedule-item" data-id="${schedule.id}">
            <div class="pa-schedule-time">
                ${dayName}<br>${time}
            </div>
            <div class="pa-schedule-info">
                <div class="pa-schedule-title">${schedule.title || schedule.exercise_name}</div>
                <div class="pa-schedule-duration">${schedule.planned_duration_minutes || 30} minutes</div>
            </div>
            <button class="pa-btn pa-btn-secondary" onclick="deleteSchedule(${schedule.id})" style="padding: 8px;">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
}

// ===========================================
// Achievements Tab
// ===========================================

async function loadAchievementsContent() {
    const container = document.getElementById('pa-achievements-content');
    if (!container) return;

    container.innerHTML = `
        <div class="pa-section-card">
            <div class="pa-section-header">
                <h3><i class="fas fa-trophy"></i> Achievements</h3>
                <span id="pa-total-points" style="font-weight: 600; color: #ffd700;">0 points</span>
            </div>
        </div>
        <div class="pa-exercise-grid" id="pa-achievements-grid">
            <div class="pa-loading"><div class="pa-loading-spinner"></div></div>
        </div>
    `;

    // All available achievements
    const allAchievements = [
        { name: 'First Workout', description: 'Log your first workout', icon: '🏆', points: 50 },
        { name: '3-Day Streak', description: 'Workout 3 days in a row', icon: '🔥', points: 100 },
        { name: 'Week Warrior', description: 'Complete 5 workouts in a week', icon: '💪', points: 150 },
        { name: '150 Minutes', description: 'Hit WHO weekly goal', icon: '⏱️', points: 200 },
        { name: '7-Day Streak', description: 'Workout 7 days in a row', icon: '🌟', points: 300 },
        { name: 'Calorie Crusher', description: 'Burn 1000 calories total', icon: '🔥', points: 250 },
        { name: 'Fitness Enthusiast', description: 'Complete 10 workouts', icon: '💪', points: 200 },
        { name: 'Dedicated Athlete', description: 'Complete 25 workouts', icon: '🏅', points: 400 },
        { name: 'Hour of Power', description: 'Exercise 60 minutes total', icon: '⚡', points: 100 },
        { name: 'Marathon Mindset', description: 'Exercise 300 minutes total', icon: '🏃', points: 350 }
    ];

    try {
        const response = await fetch('/api/client/physical-activity/achievements');
        const data = await response.json();

        document.getElementById('pa-total-points').textContent = `${data.total_points || 0} points`;

        // Create a set of earned achievement names
        const earnedNames = new Set((data.achievements || []).map(a => a.achievement_name));

        const grid = document.getElementById('pa-achievements-grid');

        // Render all achievements, marking earned ones
        grid.innerHTML = allAchievements.map(ach => {
            const isEarned = earnedNames.has(ach.name);
            return `
                <div class="pa-achievement-card ${isEarned ? 'earned' : 'locked'}">
                    <div class="pa-achievement-icon">${ach.icon}</div>
                    <div class="pa-achievement-name">${ach.name}</div>
                    <div class="pa-achievement-desc">${ach.description}</div>
                    <div class="pa-achievement-points">${isEarned ? '✓ Earned' : `+${ach.points} pts`}</div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading achievements:', error);
    }
}

function renderAchievementCard(achievement) {
    return `
        <div class="pa-achievement-card earned">
            <div class="pa-achievement-icon">${achievement.icon || '🏆'}</div>
            <div class="pa-achievement-name">${achievement.achievement_name}</div>
            <div class="pa-achievement-desc">${achievement.description || ''}</div>
            <div class="pa-achievement-points">+${achievement.points || 0} pts</div>
        </div>
    `;
}

// ===========================================
// Modal Functions
// ===========================================

function openLogWorkoutModal(exerciseId = null, exerciseName = '', metValue = 3.0) {
    const modalHTML = `
        <div class="pa-modal show" id="pa-workout-modal">
            <div class="pa-modal-content">
                <div class="pa-modal-header">
                    <h3><i class="fas fa-dumbbell"></i> Log Workout</h3>
                    <button class="pa-modal-close" onclick="closePAModal('pa-workout-modal')">&times;</button>
                </div>
                <div class="pa-modal-body">
                    <form id="pa-workout-form">
                        <div class="pa-form-group">
                            <label>Exercise Name *</label>
                            <input type="text" class="pa-form-control" id="workout-exercise-name" value="${exerciseName}" required ${exerciseName ? 'readonly' : ''}>
                            <input type="hidden" id="workout-exercise-id" value="${exerciseId || ''}">
                            <input type="hidden" id="workout-met-value" value="${metValue}">
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="pa-form-group">
                                <label>Duration (minutes) *</label>
                                <input type="number" class="pa-form-control" id="workout-duration" value="30" min="1" max="300" required>
                            </div>
                            <div class="pa-form-group">
                                <label>Date</label>
                                <input type="date" class="pa-form-control" id="workout-date" value="${new Date().toISOString().split('T')[0]}">
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="pa-form-group">
                                <label>Start Time</label>
                                <input type="time" class="pa-form-control" id="workout-start-time">
                            </div>
                            <div class="pa-form-group">
                                <label>Intensity</label>
                                <select class="pa-form-control" id="workout-intensity">
                                    <option value="light">Light</option>
                                    <option value="moderate" selected>Moderate</option>
                                    <option value="vigorous">Vigorous</option>
                                </select>
                            </div>
                        </div>
                        <div class="pa-form-group">
                            <label>Category</label>
                            <select class="pa-form-control" id="workout-category">
                                <option value="cardio">Cardio</option>
                                <option value="strength">Strength</option>
                                <option value="yoga">Yoga</option>
                                <option value="hiit">HIIT</option>
                                <option value="dance">Dance</option>
                                <option value="sports">Sports</option>
                                <option value="flexibility">Flexibility</option>
                            </select>
                        </div>
                        <div class="pa-form-group">
                            <label>Notes</label>
                            <textarea class="pa-form-control" id="workout-notes" rows="2" placeholder="How did you feel?"></textarea>
                        </div>
                    </form>
                </div>
                <div class="pa-modal-footer">
                    <button class="pa-btn pa-btn-secondary" onclick="closePAModal('pa-workout-modal')">Cancel</button>
                    <button class="pa-btn pa-btn-primary" onclick="saveWorkout()">
                        <i class="fas fa-save"></i> Save Workout
                    </button>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existing = document.getElementById('pa-workout-modal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function saveWorkout() {
    const exerciseName = document.getElementById('workout-exercise-name').value;
    const duration = parseInt(document.getElementById('workout-duration').value);
    const workoutDate = document.getElementById('workout-date').value;
    const startTime = document.getElementById('workout-start-time').value;
    const intensity = document.getElementById('workout-intensity').value;
    const category = document.getElementById('workout-category').value;
    const notes = document.getElementById('workout-notes').value;
    const exerciseId = document.getElementById('workout-exercise-id').value;
    const metValue = parseFloat(document.getElementById('workout-met-value').value);

    if (!exerciseName || !duration) {
        alert('Please fill in exercise name and duration');
        return;
    }

    try {
        const response = await fetch('/api/client/physical-activity/workouts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                exercise_id: exerciseId || null,
                exercise_name: exerciseName,
                exercise_category: category,
                duration_minutes: duration,
                date: workoutDate,
                start_time: startTime || null,
                intensity: intensity,
                met_value: metValue,
                notes: notes
            })
        });

        const data = await response.json();

        if (data.success) {
            closePAModal('pa-workout-modal');
            showPAToast(`Workout logged! ${data.calories_burned} calories burned 🔥`);

            // Refresh based on current tab
            if (paState.currentTab === 'dashboard') {
                loadPADashboardContent();
            } else if (paState.currentTab === 'workouts') {
                loadWorkoutsContent();
            }
        } else {
            alert('Error: ' + (data.error || 'Failed to save workout'));
        }
    } catch (error) {
        console.error('Error saving workout:', error);
        alert('Failed to save workout');
    }
}

function openSetGoalModal() {
    const modalHTML = `
        <div class="pa-modal show" id="pa-goal-modal">
            <div class="pa-modal-content">
                <div class="pa-modal-header">
                    <h3><i class="fas fa-bullseye"></i> Set Goal</h3>
                    <button class="pa-modal-close" onclick="closePAModal('pa-goal-modal')">&times;</button>
                </div>
                <div class="pa-modal-body">
                    <form id="pa-goal-form">
                        <div class="pa-form-group">
                            <label>Goal Type *</label>
                            <select class="pa-form-control" id="goal-type" required onchange="updateGoalUnit()">
                                <option value="weekly_minutes">Weekly Active Minutes</option>
                                <option value="weekly_sessions">Weekly Workout Sessions</option>
                                <option value="weekly_calories">Weekly Calories Burned</option>
                                <option value="daily_steps">Daily Steps</option>
                            </select>
                        </div>
                        <div class="pa-form-group">
                            <label>Goal Name</label>
                            <input type="text" class="pa-form-control" id="goal-name" placeholder="e.g., Get Fit 2024">
                        </div>
                        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px;">
                            <div class="pa-form-group">
                                <label>Target Value *</label>
                                <input type="number" class="pa-form-control" id="goal-target" value="150" min="1" required>
                            </div>
                            <div class="pa-form-group">
                                <label>Unit</label>
                                <input type="text" class="pa-form-control" id="goal-unit" value="minutes" readonly>
                            </div>
                        </div>
                        <div class="pa-form-group">
                            <label>Period</label>
                            <select class="pa-form-control" id="goal-period">
                                <option value="weekly" selected>Weekly</option>
                                <option value="daily">Daily</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="pa-modal-footer">
                    <button class="pa-btn pa-btn-secondary" onclick="closePAModal('pa-goal-modal')">Cancel</button>
                    <button class="pa-btn pa-btn-primary" onclick="saveGoal()">
                        <i class="fas fa-save"></i> Create Goal
                    </button>
                </div>
            </div>
        </div>
    `;

    const existing = document.getElementById('pa-goal-modal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function updateGoalUnit() {
    const type = document.getElementById('goal-type').value;
    const unitInput = document.getElementById('goal-unit');
    const targetInput = document.getElementById('goal-target');

    const units = {
        'weekly_minutes': { unit: 'minutes', default: 150 },
        'weekly_sessions': { unit: 'sessions', default: 5 },
        'weekly_calories': { unit: 'calories', default: 2000 },
        'daily_steps': { unit: 'steps', default: 10000 }
    };

    const config = units[type] || { unit: '', default: 100 };
    unitInput.value = config.unit;
    targetInput.value = config.default;
}

async function saveGoal() {
    const goalType = document.getElementById('goal-type').value;
    const goalName = document.getElementById('goal-name').value;
    const targetValue = parseInt(document.getElementById('goal-target').value);
    const targetUnit = document.getElementById('goal-unit').value;
    const periodType = document.getElementById('goal-period').value;

    if (!targetValue) {
        alert('Please enter a target value');
        return;
    }

    try {
        const response = await fetch('/api/client/physical-activity/goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                goal_type: goalType,
                goal_name: goalName || goalType.replace('_', ' '),
                target_value: targetValue,
                target_unit: targetUnit,
                period_type: periodType
            })
        });

        const data = await response.json();

        if (data.success) {
            closePAModal('pa-goal-modal');
            showPAToast('Goal created! Stay motivated 💪');
            loadGoalsContent();
        } else {
            alert('Error: ' + (data.error || 'Failed to create goal'));
        }
    } catch (error) {
        console.error('Error saving goal:', error);
        alert('Failed to save goal');
    }
}

async function deleteGoal(goalId) {
    if (!confirm('Delete this goal?')) return;

    try {
        const response = await fetch(`/api/client/physical-activity/goals/${goalId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showPAToast('Goal deleted');
            loadGoalsContent();
        }
    } catch (error) {
        console.error('Error deleting goal:', error);
    }
}

function openScheduleModal() {
    const modalHTML = `
        <div class="pa-modal show" id="pa-schedule-modal">
            <div class="pa-modal-content">
                <div class="pa-modal-header">
                    <h3><i class="fas fa-calendar-plus"></i> Schedule Workout</h3>
                    <button class="pa-modal-close" onclick="closePAModal('pa-schedule-modal')">&times;</button>
                </div>
                <div class="pa-modal-body">
                    <form id="pa-schedule-form">
                        <div class="pa-form-group">
                            <label>Workout Title *</label>
                            <input type="text" class="pa-form-control" id="schedule-title" placeholder="e.g., Morning Yoga" required>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="pa-form-group">
                                <label>Day of Week *</label>
                                <select class="pa-form-control" id="schedule-day" required>
                                    <option value="0">Sunday</option>
                                    <option value="1">Monday</option>
                                    <option value="2">Tuesday</option>
                                    <option value="3">Wednesday</option>
                                    <option value="4">Thursday</option>
                                    <option value="5">Friday</option>
                                    <option value="6">Saturday</option>
                                </select>
                            </div>
                            <div class="pa-form-group">
                                <label>Time *</label>
                                <input type="time" class="pa-form-control" id="schedule-time" value="09:00" required>
                            </div>
                        </div>
                        <div class="pa-form-group">
                            <label>Duration (minutes)</label>
                            <input type="number" class="pa-form-control" id="schedule-duration" value="30" min="5" max="180">
                        </div>
                        <div class="pa-form-group">
                            <label>
                                <input type="checkbox" id="schedule-recurring" checked> Repeat weekly
                            </label>
                        </div>
                    </form>
                </div>
                <div class="pa-modal-footer">
                    <button class="pa-btn pa-btn-secondary" onclick="closePAModal('pa-schedule-modal')">Cancel</button>
                    <button class="pa-btn pa-btn-primary" onclick="saveSchedule()">
                        <i class="fas fa-save"></i> Save Schedule
                    </button>
                </div>
            </div>
        </div>
    `;

    const existing = document.getElementById('pa-schedule-modal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function saveSchedule() {
    const title = document.getElementById('schedule-title').value;
    const dayOfWeek = parseInt(document.getElementById('schedule-day').value);
    const time = document.getElementById('schedule-time').value;
    const duration = parseInt(document.getElementById('schedule-duration').value);
    const isRecurring = document.getElementById('schedule-recurring').checked;

    if (!title) {
        alert('Please enter a workout title');
        return;
    }

    try {
        const response = await fetch('/api/client/physical-activity/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: title,
                day_of_week: dayOfWeek,
                scheduled_time: time,
                planned_duration_minutes: duration,
                is_recurring: isRecurring
            })
        });

        const data = await response.json();

        if (data.success) {
            closePAModal('pa-schedule-modal');
            showPAToast('Workout scheduled! 📅');
            loadScheduleContent();
        } else {
            alert('Error: ' + (data.error || 'Failed to save schedule'));
        }
    } catch (error) {
        console.error('Error saving schedule:', error);
        alert('Failed to save schedule');
    }
}

async function deleteSchedule(scheduleId) {
    if (!confirm('Delete this scheduled workout?')) return;

    try {
        const response = await fetch(`/api/client/physical-activity/schedule/${scheduleId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showPAToast('Schedule deleted');
            loadScheduleContent();
        }
    } catch (error) {
        console.error('Error deleting schedule:', error);
    }
}

// ===========================================
// Utility Functions
// ===========================================

function closePAModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 200);
    }
}

function showPAToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #d7263d 0%, #a61a2c 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 10000;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===========================================
// Auto-initialize when page loads
// ===========================================

// Check if we're on the physical activity page
document.addEventListener('DOMContentLoaded', function () {
    // Initialize when the Physical Activity tab is clicked
    const paNavItems = document.querySelectorAll('[data-page="physical-activity"]');
    paNavItems.forEach(item => {
        item.addEventListener('click', function () {
            setTimeout(() => initializePhysicalActivityModule(), 100);
        });
    });
});

// Also initialize if page is already visible
if (document.getElementById('physical-activity-page')?.classList.contains('active')) {
    initializePhysicalActivityModule();
}
