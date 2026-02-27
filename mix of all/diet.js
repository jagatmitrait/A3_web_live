/**
 * Diet Plan Module JavaScript
 * Handles diet plans, meal logging, nutrition tracking, and progress
 */

// ===========================================
// Module State
// ===========================================

const dietState = {
    currentTab: 'dashboard',
    healthProfile: null,
    activePlan: null,
    todayStats: null,
    isInitialized: false
};

// ===========================================
// Initialization
// ===========================================

/**
 * Initialize the Diet Plan module
 */
function initializeDietModule() {
    if (dietState.isInitialized) return;

    console.log('Initializing Diet Plan Module...');

    // Setup event listeners
    setupDietEventListeners();

    // Load initial data
    loadDashboardContent();

    dietState.isInitialized = true;
    console.log('Diet Plan Module initialized');
}

/**
 * Setup event listeners
 */
function setupDietEventListeners() {
    // Tab navigation
    document.querySelectorAll('.diet-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            const tabName = this.dataset.tab;
            switchDietTab(tabName);
        });
    });

    // Close modals on outside click
    document.querySelectorAll('.diet-modal').forEach(modal => {
        modal.addEventListener('click', function (e) {
            if (e.target === this) {
                closeDietModal(this.id);
            }
        });
    });
}

/**
 * Switch between diet tabs
 */
function switchDietTab(tabName) {
    dietState.currentTab = tabName;

    // Update tab buttons
    document.querySelectorAll('.diet-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });

    // Update tab content
    document.querySelectorAll('.diet-tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const activeContent = document.getElementById(`diet-${tabName}-content`);
    if (activeContent) {
        activeContent.classList.add('active');
    }

    // Load content for the tab
    switch (tabName) {
        case 'dashboard':
            loadDashboardContent();
            break;
        case 'meals':
            loadMealsContent();
            break;
        case 'foods':
            loadFoodsContent();
            break;
        case 'water':
            loadWaterContent();
            break;
        case 'progress':
            loadProgressContent();
            break;
        case 'plan':
            loadPlanContent();
            break;
        case 'reports':
            loadReportsContent();
            break;
    }
}

// ===========================================
// Dashboard
// ===========================================

/**
 * Load dashboard content
 */
async function loadDashboardContent() {
    const container = document.getElementById('diet-dashboard-content');
    if (!container) return;

    container.innerHTML = `
        <div class="diet-loading"><div class="diet-loading-spinner"></div></div>
    `;

    try {
        const response = await fetch('/api/client/diet/stats');
        const data = await response.json();

        if (data.success) {
            dietState.todayStats = data.stats;
            renderDashboard(data.stats);
        } else {
            container.innerHTML = `<div class="diet-empty-state"><i class="fas fa-exclamation-circle"></i><h4>Error loading stats</h4></div>`;
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        container.innerHTML = `<div class="diet-empty-state"><i class="fas fa-exclamation-circle"></i><h4>Error loading dashboard</h4></div>`;
    }
}

/**
 * Render dashboard
 */
function renderDashboard(stats) {
    const container = document.getElementById('diet-dashboard-content');
    if (!container) return;

    const caloriePercent = stats.targets.calories > 0
        ? Math.min(100, Math.round((stats.today.calories / stats.targets.calories) * 100))
        : 0;
    const proteinPercent = stats.targets.protein_g > 0
        ? Math.min(100, Math.round((stats.today.protein / stats.targets.protein_g) * 100))
        : 0;
    const carbsPercent = stats.targets.carbs_g > 0
        ? Math.min(100, Math.round((stats.today.carbs / stats.targets.carbs_g) * 100))
        : 0;
    const fatPercent = stats.targets.fat_g > 0
        ? Math.min(100, Math.round((stats.today.fat / stats.targets.fat_g) * 100))
        : 0;

    container.innerHTML = `
        <!-- Quick Actions -->
        <div class="diet-section-card" style="margin-bottom: 16px;">
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <button class="diet-btn-primary" onclick="openMealModal()">
                    <i class="fas fa-plus"></i> Log Meal
                </button>
                <button class="diet-btn-secondary" onclick="openWaterModal()">
                    <i class="fas fa-tint"></i> Add Water
                </button>
                <button class="diet-btn-secondary" onclick="openWeightModal()">
                    <i class="fas fa-weight"></i> Log Weight
                </button>
                ${!stats.has_health_profile ? `
                    <button class="diet-btn-primary" onclick="switchDietTab('plan')" style="background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);">
                        <i class="fas fa-magic"></i> Generate Diet Plan
                    </button>
                ` : ''}
            </div>
        </div>
        
        <!-- Today's Stats -->
        <div class="diet-stats-grid">
            <div class="diet-stat-card calories">
                <div class="diet-stat-icon calories"><i class="fas fa-fire"></i></div>
                <div class="diet-stat-content">
                    <div class="diet-stat-value">${stats.today.calories}</div>
                    <div class="diet-stat-label">of ${stats.targets.calories} kcal</div>
                    <div class="diet-stat-progress">
                        <div class="diet-stat-progress-bar" style="width: ${caloriePercent}%"></div>
                    </div>
                </div>
            </div>
            
            <div class="diet-stat-card protein">
                <div class="diet-stat-icon protein"><i class="fas fa-drumstick-bite"></i></div>
                <div class="diet-stat-content">
                    <div class="diet-stat-value">${stats.today.protein}g</div>
                    <div class="diet-stat-label">of ${stats.targets.protein_g}g protein</div>
                    <div class="diet-stat-progress">
                        <div class="diet-stat-progress-bar" style="width: ${proteinPercent}%"></div>
                    </div>
                </div>
            </div>
            
            <div class="diet-stat-card carbs">
                <div class="diet-stat-icon carbs"><i class="fas fa-bread-slice"></i></div>
                <div class="diet-stat-content">
                    <div class="diet-stat-value">${stats.today.carbs}g</div>
                    <div class="diet-stat-label">of ${stats.targets.carbs_g}g carbs</div>
                    <div class="diet-stat-progress">
                        <div class="diet-stat-progress-bar" style="width: ${carbsPercent}%"></div>
                    </div>
                </div>
            </div>
            
            <div class="diet-stat-card fat">
                <div class="diet-stat-icon fat"><i class="fas fa-cheese"></i></div>
                <div class="diet-stat-content">
                    <div class="diet-stat-value">${stats.today.fat}g</div>
                    <div class="diet-stat-label">of ${stats.targets.fat_g}g fat</div>
                    <div class="diet-stat-progress">
                        <div class="diet-stat-progress-bar" style="width: ${fatPercent}%"></div>
                    </div>
                </div>
            </div>
            
            <div class="diet-stat-card water">
                <div class="diet-stat-icon water"><i class="fas fa-tint"></i></div>
                <div class="diet-stat-content">
                    <div class="diet-stat-value">${stats.water.amount_ml}ml</div>
                    <div class="diet-stat-label">of ${stats.water.goal_ml}ml water</div>
                    <div class="diet-stat-progress">
                        <div class="diet-stat-progress-bar" style="width: ${stats.water.percentage}%"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Today's Meals -->
        <div class="diet-section-card">
            <div class="diet-section-header">
                <h3><i class="fas fa-utensils"></i> Today's Meals</h3>
                <button class="diet-btn-icon" onclick="openMealModal()">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div class="diet-meal-cards" id="today-meals-container">
                ${renderMealCards(stats.today.meals_logged)}
            </div>
        </div>
        
        <!-- Weight & BMI -->
        ${stats.weight.current_kg ? `
            <div class="diet-section-card">
                <div class="diet-section-header">
                    <h3><i class="fas fa-weight"></i> Weight Tracking</h3>
                </div>
                <div style="display: flex; gap: 40px; flex-wrap: wrap;">
                    <div>
                        <div style="font-size: 2rem; font-weight: 700; color: var(--diet-primary);">${stats.weight.current_kg} kg</div>
                        <div style="color: var(--diet-text-muted);">Current Weight</div>
                    </div>
                    ${stats.weight.bmi ? `
                        <div>
                            <div style="font-size: 2rem; font-weight: 700; color: ${getBMIColor(stats.weight.bmi)};">${stats.weight.bmi}</div>
                            <div style="color: var(--diet-text-muted);">BMI (${getBMICategory(stats.weight.bmi)})</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        ` : ''}
    `;

    // Load today's meals
    loadTodayMeals();
}

/**
 * Render meal cards placeholder
 */
function renderMealCards(mealsLogged) {
    const mealTypes = [
        { type: 'breakfast', name: 'Breakfast', icon: 'fa-sun', time: '7:00 - 9:00 AM' },
        { type: 'lunch', name: 'Lunch', icon: 'fa-cloud-sun', time: '12:00 - 2:00 PM' },
        { type: 'dinner', name: 'Dinner', icon: 'fa-moon', time: '7:00 - 9:00 PM' },
        { type: 'snack', name: 'Snacks', icon: 'fa-cookie', time: 'Anytime' }
    ];

    return mealTypes.map(meal => `
        <div class="diet-meal-card" onclick="openMealModal('${meal.type}')">
            <div class="diet-meal-card-header">
                <div class="diet-meal-card-icon ${meal.type}">
                    <i class="fas ${meal.icon}"></i>
                </div>
                <button class="diet-btn-icon" onclick="event.stopPropagation(); openMealModal('${meal.type}')">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div class="diet-meal-card-title">${meal.name}</div>
            <div class="diet-meal-card-subtitle">${meal.time}</div>
            <div class="diet-meal-card-calories" id="meal-calories-${meal.type}">-- kcal</div>
        </div>
    `).join('');
}

/**
 * Load today's meals
 */
async function loadTodayMeals() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`/api/client/diet/meals?date=${today}`);
        const data = await response.json();

        if (data.success) {
            // Group by meal type
            const byType = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
            data.meals.forEach(meal => {
                if (byType.hasOwnProperty(meal.meal_type)) {
                    byType[meal.meal_type] += meal.total_calories || 0;
                }
            });

            // Update UI
            Object.keys(byType).forEach(type => {
                const el = document.getElementById(`meal-calories-${type}`);
                if (el) {
                    el.textContent = `${Math.round(byType[type])} kcal`;
                }
            });
        }
    } catch (error) {
        console.error('Error loading today meals:', error);
    }
}

// ===========================================
// Helper Functions
// ===========================================

function getBMIColor(bmi) {
    if (bmi < 18.5) return '#2196F3';
    if (bmi < 25) return '#4CAF50';
    if (bmi < 30) return '#FF9800';
    return '#F44336';
}

function getBMICategory(bmi) {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
}

// ===========================================
// Modal Functions
// ===========================================

function openDietModal(title, content) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('dietDynamicModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'dietDynamicModal';
        modal.className = 'diet-modal';
        modal.innerHTML = `
            <div class="diet-modal-overlay" onclick="closeDietModal()"></div>
            <div class="diet-modal-content">
                <div class="diet-modal-header">
                    <h3 id="dietModalTitle"></h3>
                    <button class="diet-modal-close" onclick="closeDietModal()"><i class="fas fa-times"></i></button>
                </div>
                <div class="diet-modal-body" id="dietModalBody"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    document.getElementById('dietModalTitle').textContent = title;
    document.getElementById('dietModalBody').innerHTML = content;
    modal.classList.add('show');
}

function closeDietModal() {
    const modal = document.getElementById('dietDynamicModal');
    if (modal) modal.classList.remove('show');
}

function openMealModal(mealType = 'breakfast') {
    // Call the new log meal modal
    openLogMealModal(mealType);
}

function openWaterModal() {
    // Quick water add
    addWater(250);
}

function openWeightModal() {
    // Call the new weight log modal
    openWeightLogModal();
}

// ===========================================
// Water Functions
// ===========================================

async function addWater(ml) {
    try {
        const response = await fetch('/api/client/diet/water', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ add_ml: ml })
        });

        const data = await response.json();
        if (data.success) {
            // Refresh dashboard
            loadDashboardContent();
        }
    } catch (error) {
        console.error('Error adding water:', error);
    }
}

// ===========================================
// Placeholder Functions for Other Tabs
// ===========================================

function loadMealsContent() {
    const container = document.getElementById('diet-meals-content');
    if (!container) return;

    const today = new Date().toISOString().split('T')[0];

    container.innerHTML = `
        <div class="diet-section-card">
            <div class="diet-section-header">
                <h3><i class="fas fa-utensils"></i> Today's Meals</h3>
                <button class="diet-btn-primary" onclick="openLogMealModal()">
                    <i class="fas fa-plus"></i> Log Meal
                </button>
            </div>
            
            <div id="todaysMeals">
                <div class="diet-loading"><div class="diet-loading-spinner"></div></div>
            </div>
        </div>
    `;

    loadTodaysMeals(today);
}

async function loadTodaysMeals(date) {
    const container = document.getElementById('todaysMeals');
    if (!container) return;

    try {
        const res = await fetch(`/api/client/diet/meals?date=${date}`);
        const data = await res.json();

        if (data.success && data.meals.length > 0) {
            // Group by meal type
            const grouped = { breakfast: [], lunch: [], dinner: [], snacks: [] };
            data.meals.forEach(m => {
                const type = (m.meal_type || 'snacks').toLowerCase();
                if (grouped[type]) grouped[type].push(m);
                else grouped.snacks.push(m);
            });

            container.innerHTML = ['breakfast', 'lunch', 'dinner', 'snacks'].map(type => {
                const meals = grouped[type];
                const totalCal = meals.reduce((s, m) => s + (m.total_calories || 0), 0);
                return `
                    <div class="diet-meal-section">
                        <div class="diet-meal-type-header">
                            <span class="diet-meal-type-icon">${getMealIcon(type)}</span>
                            <span class="diet-meal-type-name">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
                            <span class="diet-meal-type-cal">${totalCal} kcal</span>
                        </div>
                        ${meals.length > 0 ? meals.map(m => renderMealCard(m)).join('') :
                        '<div class="diet-meal-empty">No meals logged</div>'}
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = `
                <div class="diet-empty-state">
                    <i class="fas fa-utensils"></i>
                    <h4>No meals logged today</h4>
                    <p>Start by logging your breakfast!</p>
                </div>
            `;
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="diet-empty-state"><h4>Error loading meals</h4></div>';
    }
}

function getMealIcon(type) {
    const icons = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snacks: '🍪' };
    return icons[type] || '🍽️';
}

function renderMealCard(meal) {
    return `
        <div class="diet-meal-card">
            <div class="diet-meal-info">
                <span class="diet-meal-name">${meal.meal_name || 'Meal'}</span>
                <span class="diet-meal-time">${meal.created_at ? new Date(meal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
            </div>
            <div class="diet-meal-macros">
                <span><strong>${meal.total_calories || 0}</strong> kcal</span>
                <span>P: ${meal.total_protein || 0}g</span>
                <span>C: ${meal.total_carbs || 0}g</span>
                <span>F: ${meal.total_fat || 0}g</span>
            </div>
            <button class="diet-btn-icon" onclick="deleteMeal(${meal.id})" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
}

// Meal items being added
let currentMealItems = [];

function openLogMealModal(mealType = 'breakfast') {
    currentMealItems = [];
    // Map snack to snacks
    if (mealType === 'snack') mealType = 'snacks';

    openDietModal('Log Meal', `
        <div class="diet-form-group">
            <label class="diet-form-label">Meal Type</label>
            <select id="mealTypeSelect" class="diet-form-select">
                <option value="breakfast" ${mealType === 'breakfast' ? 'selected' : ''}>🌅 Breakfast</option>
                <option value="lunch" ${mealType === 'lunch' ? 'selected' : ''}>☀️ Lunch</option>
                <option value="dinner" ${mealType === 'dinner' ? 'selected' : ''}>🌙 Dinner</option>
                <option value="snacks" ${mealType === 'snacks' ? 'selected' : ''}>🍪 Snacks</option>
            </select>
        </div>
        
        <div class="diet-form-group">
            <label class="diet-form-label">Search Foods</label>
            <input type="text" id="mealFoodSearch" class="diet-form-input" 
                placeholder="Type to search foods..." oninput="searchMealFoods(this.value)">
            <div id="mealFoodResults" class="diet-food-search-results"></div>
        </div>
        
        <div id="selectedFoodsContainer" style="margin-top: 16px;">
            <label class="diet-form-label">Selected Foods</label>
            <div id="selectedFoodsList" class="diet-selected-foods">
                <div class="diet-empty-state" style="padding: 16px;"><small>No foods added yet</small></div>
            </div>
        </div>
        
        <div id="mealTotals" class="diet-meal-totals" style="display:none;">
            <span><strong id="totalCal">0</strong> kcal</span>
            <span>P: <strong id="totalP">0</strong>g</span>
            <span>C: <strong id="totalC">0</strong>g</span>
            <span>F: <strong id="totalF">0</strong>g</span>
        </div>
        
        <button class="diet-btn-primary" style="width:100%; margin-top:16px;" onclick="saveMeal()">
            <i class="fas fa-save"></i> Save Meal
        </button>
    `);
}

async function searchMealFoods(query) {
    const results = document.getElementById('mealFoodResults');
    if (!query || query.length < 2) {
        results.innerHTML = '';
        return;
    }

    results.innerHTML = '<div class="diet-loading-spinner" style="margin:10px auto;"></div>';

    try {
        const res = await fetch(`/api/client/diet/foods/search?q=${encodeURIComponent(query)}&limit=10`);
        const data = await res.json();

        if (data.success && data.foods.length > 0) {
            results.innerHTML = data.foods.map(f => `
                <div class="diet-food-result-item" onclick="addFoodToMeal(${f.id}, '${f.food_name.replace(/'/g, "\\'")}', ${f.calories}, ${f.protein}, ${f.carbs}, ${f.fat}, ${f.serving_size}, '${f.serving_unit}')">
                    <span class="diet-food-result-name">${f.food_name}</span>
                    <span class="diet-food-result-cal">${f.calories} kcal / ${f.serving_size} ${f.serving_unit}</span>
                </div>
            `).join('');
        } else {
            results.innerHTML = '<div style="padding:8px;color:#666;">No foods found</div>';
        }
    } catch (e) { console.error(e); }
}

function addFoodToMeal(id, name, cal, p, c, f, serving, unit) {
    currentMealItems.push({ food_id: id, food_name: name, calories: cal, protein: p, carbs: c, fat: f, quantity: serving, serving_unit: unit });
    updateSelectedFoods();
    document.getElementById('mealFoodSearch').value = '';
    document.getElementById('mealFoodResults').innerHTML = '';
}

function removeFoodFromMeal(index) {
    currentMealItems.splice(index, 1);
    updateSelectedFoods();
}

function updateSelectedFoods() {
    const list = document.getElementById('selectedFoodsList');
    const totals = document.getElementById('mealTotals');

    if (currentMealItems.length === 0) {
        list.innerHTML = '<div class="diet-empty-state" style="padding:16px;"><small>No foods added yet</small></div>';
        totals.style.display = 'none';
        return;
    }

    list.innerHTML = currentMealItems.map((item, i) => `
        <div class="diet-selected-food-item">
            <span>${item.food_name} (${item.quantity} ${item.serving_unit})</span>
            <span>${item.calories} kcal</span>
            <button class="diet-btn-icon" onclick="removeFoodFromMeal(${i})"><i class="fas fa-times"></i></button>
        </div>
    `).join('');

    const totalCal = currentMealItems.reduce((s, i) => s + i.calories, 0);
    const totalP = currentMealItems.reduce((s, i) => s + i.protein, 0);
    const totalC = currentMealItems.reduce((s, i) => s + i.carbs, 0);
    const totalF = currentMealItems.reduce((s, i) => s + i.fat, 0);

    document.getElementById('totalCal').textContent = totalCal;
    document.getElementById('totalP').textContent = totalP.toFixed(1);
    document.getElementById('totalC').textContent = totalC.toFixed(1);
    document.getElementById('totalF').textContent = totalF.toFixed(1);
    totals.style.display = 'flex';
}

async function saveMeal() {
    if (currentMealItems.length === 0) {
        alert('Please add at least one food item');
        return;
    }

    const mealType = document.getElementById('mealTypeSelect').value;

    try {
        const res = await fetch('/api/client/diet/meals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                meal_type: mealType,
                meal_name: mealType.charAt(0).toUpperCase() + mealType.slice(1),
                items: currentMealItems
            })
        });

        const data = await res.json();
        if (data.success) {
            closeDietModal();
            loadMealsContent();
            loadDashboardContent();
        } else {
            alert(data.error || 'Error saving meal');
        }
    } catch (e) {
        console.error(e);
        alert('Error saving meal');
    }
}

async function deleteMeal(mealId) {
    if (!confirm('Delete this meal?')) return;

    try {
        await fetch(`/api/client/diet/meals/${mealId}`, { method: 'DELETE' });
        loadMealsContent();
        loadDashboardContent();
    } catch (e) { console.error(e); }
}

function loadFoodsContent() {
    const container = document.getElementById('diet-foods-content');
    if (!container) return;

    container.innerHTML = `
        <div class="diet-section-card">
            <div class="diet-section-header">
                <h3><i class="fas fa-apple-alt"></i> Food Database</h3>
                <button class="diet-btn-secondary" onclick="showAddFoodModal()">
                    <i class="fas fa-plus"></i> Add Custom Food
                </button>
            </div>
            
            <!-- Search Bar -->
            <div style="margin-bottom: 20px;">
                <input type="text" id="foodSearchInput" class="diet-form-input" 
                    placeholder="Search foods (e.g., dal, roti, chicken)..."
                    oninput="searchFoods(this.value)">
            </div>
            
            <!-- Category Filters -->
            <div id="foodCategories" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;">
                <button class="diet-category-chip active" onclick="filterByCategory('')">All</button>
            </div>
            
            <!-- Foods Grid -->
            <div id="foodsGrid" class="diet-foods-grid">
                <div class="diet-loading"><div class="diet-loading-spinner"></div></div>
            </div>
        </div>
    `;

    // Load categories and initial foods
    loadFoodCategories();
    searchFoods('');
}

async function loadFoodCategories() {
    try {
        const res = await fetch('/api/client/diet/foods/categories');
        const data = await res.json();
        if (data.success) {
            const container = document.getElementById('foodCategories');
            container.innerHTML = `<button class="diet-category-chip active" onclick="filterByCategory('')">All</button>` +
                data.categories.map(c => `
                    <button class="diet-category-chip" onclick="filterByCategory('${c.name}')">${c.name} (${c.count})</button>
                `).join('');
        }
    } catch (e) { console.error(e); }
}

async function searchFoods(query) {
    const grid = document.getElementById('foodsGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="diet-loading"><div class="diet-loading-spinner"></div></div>';

    try {
        const res = await fetch(`/api/client/diet/foods/search?q=${encodeURIComponent(query)}&limit=50`);
        const data = await res.json();

        if (data.success && data.foods.length > 0) {
            grid.innerHTML = data.foods.map(f => renderFoodCard(f)).join('');
        } else {
            grid.innerHTML = '<div class="diet-empty-state"><i class="fas fa-search"></i><h4>No foods found</h4></div>';
        }
    } catch (e) {
        console.error(e);
        grid.innerHTML = '<div class="diet-empty-state"><h4>Error loading foods</h4></div>';
    }
}

function filterByCategory(category) {
    document.querySelectorAll('.diet-category-chip').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');

    const grid = document.getElementById('foodsGrid');
    grid.innerHTML = '<div class="diet-loading"><div class="diet-loading-spinner"></div></div>';

    fetch(`/api/client/diet/foods/search?category=${encodeURIComponent(category)}&limit=50`)
        .then(r => r.json())
        .then(data => {
            if (data.success && data.foods.length > 0) {
                grid.innerHTML = data.foods.map(f => renderFoodCard(f)).join('');
            } else {
                grid.innerHTML = '<div class="diet-empty-state"><h4>No foods in this category</h4></div>';
            }
        });
}

function renderFoodCard(food) {
    const vegIcon = food.is_vegetarian ? '🟢' : '🔴';
    return `
        <div class="diet-food-card">
            <div class="diet-food-header">
                <span class="diet-food-veg">${vegIcon}</span>
                <span class="diet-food-category">${food.category}</span>
            </div>
            <div class="diet-food-name">${food.food_name}</div>
            ${food.food_name_hindi ? `<div class="diet-food-hindi">${food.food_name_hindi}</div>` : ''}
            <div class="diet-food-serving">${food.serving_size} ${food.serving_unit}</div>
            <div class="diet-food-nutrition">
                <div class="diet-food-cal"><strong>${food.calories}</strong> kcal</div>
                <div class="diet-food-macros">
                    <span class="p">P: ${food.protein}g</span>
                    <span class="c">C: ${food.carbs}g</span>
                    <span class="f">F: ${food.fat}g</span>
                </div>
            </div>
            <div class="diet-food-actions">
                <button class="diet-btn-icon" onclick="toggleFavorite(${food.id})" title="Add to favorites">
                    <i class="far fa-heart"></i>
                </button>
            </div>
        </div>
    `;
}

async function toggleFavorite(foodId) {
    try {
        await fetch('/api/client/diet/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ food_id: foodId })
        });
        alert('Added to favorites!');
    } catch (e) { console.error(e); }
}

function showAddFoodModal() {
    const categories = ['Grains', 'Proteins', 'Dairy', 'Fruits', 'Vegetables', 'Beverages', 'Snacks', 'Indian', 'Other'];

    openDietModal('Add Custom Food', `
        <form id="addCustomFoodForm" onsubmit="saveCustomFood(event)">
            <div class="diet-form-group">
                <label class="diet-form-label">Food Name *</label>
                <input type="text" id="customFoodName" class="diet-form-input" placeholder="e.g., Homemade Paratha" required>
            </div>
            
            <div class="diet-form-group">
                <label class="diet-form-label">Category</label>
                <select id="customFoodCategory" class="diet-form-input">
                    ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
            </div>
            
            <div class="diet-form-row">
                <div class="diet-form-group">
                    <label class="diet-form-label">Calories *</label>
                    <input type="number" id="customFoodCalories" class="diet-form-input" placeholder="150" required min="0">
                </div>
                <div class="diet-form-group">
                    <label class="diet-form-label">Protein (g)</label>
                    <input type="number" id="customFoodProtein" class="diet-form-input" placeholder="5" step="0.1" min="0">
                </div>
            </div>
            
            <div class="diet-form-row">
                <div class="diet-form-group">
                    <label class="diet-form-label">Carbs (g)</label>
                    <input type="number" id="customFoodCarbs" class="diet-form-input" placeholder="30" step="0.1" min="0">
                </div>
                <div class="diet-form-group">
                    <label class="diet-form-label">Fat (g)</label>
                    <input type="number" id="customFoodFat" class="diet-form-input" placeholder="8" step="0.1" min="0">
                </div>
            </div>
            
            <div class="diet-form-row">
                <div class="diet-form-group">
                    <label class="diet-form-label">Serving Size</label>
                    <input type="number" id="customFoodServing" class="diet-form-input" placeholder="1" value="1" min="0" step="0.1">
                </div>
                <div class="diet-form-group">
                    <label class="diet-form-label">Unit</label>
                    <select id="customFoodUnit" class="diet-form-input">
                        <option value="piece">Piece</option>
                        <option value="g">Grams (g)</option>
                        <option value="ml">Milliliters (ml)</option>
                        <option value="cup">Cup</option>
                        <option value="bowl">Bowl</option>
                        <option value="plate">Plate</option>
                        <option value="tbsp">Tablespoon</option>
                    </select>
                </div>
            </div>
            
            <button type="submit" class="diet-btn-primary" style="width:100%; margin-top:16px;">
                <i class="fas fa-plus"></i> Add Food
            </button>
        </form>
    `);
}

async function saveCustomFood(event) {
    event.preventDefault();

    const data = {
        food_name: document.getElementById('customFoodName').value,
        category: document.getElementById('customFoodCategory').value,
        calories: parseFloat(document.getElementById('customFoodCalories').value) || 0,
        protein: parseFloat(document.getElementById('customFoodProtein').value) || 0,
        carbs: parseFloat(document.getElementById('customFoodCarbs').value) || 0,
        fat: parseFloat(document.getElementById('customFoodFat').value) || 0,
        serving_size: parseFloat(document.getElementById('customFoodServing').value) || 1,
        serving_unit: document.getElementById('customFoodUnit').value
    };

    try {
        const res = await fetch('/api/client/diet/foods/custom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (result.success) {
            closeDietModal();
            alert('Custom food added successfully!');
            // Reload foods content if on foods tab
            if (dietState.currentTab === 'foods') {
                loadFoodsContent();
            }
        } else {
            alert('Error: ' + (result.error || 'Failed to add food'));
        }
    } catch (e) {
        console.error(e);
        alert('Error saving food. Please try again.');
    }
}

function loadWaterContent() {
    const container = document.getElementById('diet-water-content');
    if (!container) return;

    container.innerHTML = `
        <div class="diet-section-card">
            <div class="diet-section-header">
                <h3><i class="fas fa-tint"></i> Water Tracking</h3>
            </div>
            <div id="waterTracker">
                <div class="diet-loading"><div class="diet-loading-spinner"></div></div>
            </div>
        </div>
        
        <div class="diet-section-card">
            <div class="diet-section-header">
                <h3><i class="fas fa-chart-bar"></i> Today's Nutrition</h3>
            </div>
            <div id="nutritionSummary">
                <div class="diet-loading"><div class="diet-loading-spinner"></div></div>
            </div>
        </div>
    `;

    loadWaterData();
    loadNutritionSummary();
}

async function loadWaterData() {
    const container = document.getElementById('waterTracker');
    if (!container) return;

    try {
        const res = await fetch('/api/client/diet/water');
        const data = await res.json();

        if (data.success) {
            const water = data.water;
            const glasses = Math.floor(water.amount_ml / 250);
            const goalGlasses = Math.floor(water.goal_ml / 250);
            const pct = Math.min(100, Math.round((water.amount_ml / water.goal_ml) * 100));

            container.innerHTML = `
                <div class="diet-water-display">
                    <div class="diet-water-circle" style="--progress: ${pct}%;">
                        <div class="diet-water-inner">
                            <div class="diet-water-amount">${water.amount_ml}</div>
                            <div class="diet-water-unit">ml</div>
                            <div class="diet-water-pct">${pct}%</div>
                        </div>
                    </div>
                    <div class="diet-water-goal">Goal: ${water.goal_ml}ml (${goalGlasses} glasses)</div>
                </div>
                
                <div class="diet-water-glasses">
                    <span class="diet-water-glass-count">🥛 ${glasses} / ${goalGlasses} glasses</span>
                </div>
                
                <div class="diet-water-actions">
                    <button class="diet-btn-water" onclick="logWater(250)"><i class="fas fa-glass-whiskey"></i> +1 Glass</button>
                    <button class="diet-btn-water" onclick="logWater(500)"><i class="fas fa-bottle-water"></i> +2 Glass</button>
                    <button class="diet-btn-water" onclick="logWater(150)"><i class="fas fa-mug-hot"></i> +Cup</button>
                </div>
            `;
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="diet-empty-state"><h4>Error loading water data</h4></div>';
    }
}

async function loadNutritionSummary() {
    const container = document.getElementById('nutritionSummary');
    if (!container) return;

    try {
        const res = await fetch('/api/client/diet/stats');
        const data = await res.json();

        if (data.success) {
            const stats = data.stats;
            const calPct = Math.min(100, Math.round((stats.today.calories / stats.targets.calories) * 100));

            container.innerHTML = `
                <div class="diet-nutrition-bar">
                    <div class="diet-macro-bar-item">
                        <span class="diet-macro-bar-label">Calories</span>
                        <div class="diet-macro-bar-track">
                            <div class="diet-macro-bar-fill cal" style="width: ${calPct}%"></div>
                        </div>
                        <span class="diet-macro-bar-value">${stats.today.calories} / ${stats.targets.calories}</span>
                    </div>
                    <div class="diet-macro-bar-item">
                        <span class="diet-macro-bar-label">Protein</span>
                        <div class="diet-macro-bar-track">
                            <div class="diet-macro-bar-fill p" style="width: ${Math.min(100, (stats.today.protein / stats.targets.protein_g) * 100)}%"></div>
                        </div>
                        <span class="diet-macro-bar-value">${stats.today.protein}g / ${stats.targets.protein_g}g</span>
                    </div>
                    <div class="diet-macro-bar-item">
                        <span class="diet-macro-bar-label">Carbs</span>
                        <div class="diet-macro-bar-track">
                            <div class="diet-macro-bar-fill c" style="width: ${Math.min(100, (stats.today.carbs / stats.targets.carbs_g) * 100)}%"></div>
                        </div>
                        <span class="diet-macro-bar-value">${stats.today.carbs}g / ${stats.targets.carbs_g}g</span>
                    </div>
                    <div class="diet-macro-bar-item">
                        <span class="diet-macro-bar-label">Fat</span>
                        <div class="diet-macro-bar-track">
                            <div class="diet-macro-bar-fill f" style="width: ${Math.min(100, (stats.today.fat / stats.targets.fat_g) * 100)}%"></div>
                        </div>
                        <span class="diet-macro-bar-value">${stats.today.fat}g / ${stats.targets.fat_g}g</span>
                    </div>
                </div>
            `;
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="diet-empty-state"><h4>Log meals to see nutrition</h4></div>';
    }
}

async function logWater(ml) {
    try {
        const res = await fetch('/api/client/diet/water', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ add_ml: ml })
        });
        if (res.ok) {
            loadWaterData();
            loadDashboardContent();
        }
    } catch (e) { console.error(e); }
}

function loadProgressContent() {
    const container = document.getElementById('diet-progress-content');
    if (!container) return;

    container.innerHTML = `
        <div class="diet-section-card">
            <div class="diet-section-header">
                <h3><i class="fas fa-weight"></i> Weight Tracking</h3>
                <button class="diet-btn-primary" onclick="openWeightLogModal()">
                    <i class="fas fa-plus"></i> Log Weight
                </button>
            </div>
            <div id="weightTrackingContent">
                <div class="diet-loading"><div class="diet-loading-spinner"></div></div>
            </div>
        </div>
        
        <div class="diet-section-card">
            <div class="diet-section-header">
                <h3><i class="fas fa-bullseye"></i> Goals & BMI</h3>
            </div>
            <div id="goalsBMIContent">
                <div class="diet-loading"><div class="diet-loading-spinner"></div></div>
            </div>
        </div>
    `;

    loadWeightData();
    loadGoalsBMI();
}

async function loadWeightData() {
    const container = document.getElementById('weightTrackingContent');
    if (!container) return;

    try {
        const res = await fetch('/api/client/diet/weight');
        const data = await res.json();

        if (data.success) {
            const logs = data.logs || [];
            let latestWeight = null;
            let latestDate = null;

            if (logs.length > 0) {
                latestWeight = logs[0].weight_kg || logs[0].weight;
                latestDate = logs[0].date || logs[0].log_date;
            } else {
                // Try to get weight from health profile
                try {
                    const profileRes = await fetch('/api/client/diet/health-profile');
                    const profileData = await profileRes.json();
                    if (profileData.success && profileData.profile && profileData.profile.weight_kg) {
                        latestWeight = profileData.profile.weight_kg;
                        latestDate = null; // From profile, not a log
                    }
                } catch (e) { }
            }

            container.innerHTML = `
                <div class="diet-weight-stats">
                    <div class="diet-weight-stat-card current">
                        <div class="diet-weight-stat-label">Current Weight</div>
                        <div class="diet-weight-stat-value">${latestWeight ? latestWeight : 'Not set'} ${latestWeight ? 'kg' : ''}</div>
                        ${latestDate ? `<div class="diet-weight-stat-date">${new Date(latestDate).toLocaleDateString()}</div>` :
                    (latestWeight && logs.length === 0 ? '<div class="diet-weight-stat-date">From profile</div>' : '')}
                    </div>
                    ${data.starting_weight ? `
                        <div class="diet-weight-stat-card">
                            <div class="diet-weight-stat-label">Starting Weight</div>
                            <div class="diet-weight-stat-value">${data.starting_weight} kg</div>
                        </div>
                        <div class="diet-weight-stat-card ${data.change >= 0 ? 'gain' : 'loss'}">
                            <div class="diet-weight-stat-label">Change</div>
                            <div class="diet-weight-stat-value">${data.change >= 0 ? '+' : ''}${data.change} kg</div>
                        </div>
                    ` : ''}
                </div>
                
                ${logs.length > 0 ? `
                    <div class="diet-weight-history">
                        <h4 style="margin-bottom: 12px;"><i class="fas fa-history"></i> Recent Entries</h4>
                        <div class="diet-weight-list">
                            ${logs.slice(0, 7).map(log => `
                                <div class="diet-weight-item">
                                    <span class="diet-weight-date">${new Date(log.date || log.log_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                    <span class="diet-weight-value">${log.weight_kg || log.weight} kg</span>
                                    <button class="diet-btn-icon" onclick="deleteWeightLog(${log.id})" title="Delete">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : '<div class="diet-empty-state"><p>No weight entries yet. Start logging!</p></div>'}
            `;
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="diet-empty-state"><h4>Error loading weight data</h4></div>';
    }
}

async function loadGoalsBMI() {
    const container = document.getElementById('goalsBMIContent');
    if (!container) return;

    try {
        // Get both profile and weight logs
        const [profileRes, weightRes] = await Promise.all([
            fetch('/api/client/diet/health-profile'),
            fetch('/api/client/diet/weight')
        ]);
        const data = await profileRes.json();
        const weightData = await weightRes.json();

        if (data.success && data.profile) {
            const p = data.profile;
            let bmi = null;
            let bmiCategory = '';

            // Use latest logged weight if available, otherwise use profile weight
            let currentWeight = p.weight_kg;
            if (weightData.success && weightData.logs && weightData.logs.length > 0) {
                currentWeight = weightData.logs[0].weight_kg || weightData.logs[0].weight || currentWeight;
            }

            if (currentWeight && p.height_cm) {
                bmi = (currentWeight / Math.pow(p.height_cm / 100, 2)).toFixed(1);
                if (bmi < 18.5) bmiCategory = 'Underweight';
                else if (bmi < 25) bmiCategory = 'Normal';
                else if (bmi < 30) bmiCategory = 'Overweight';
                else bmiCategory = 'Obese';
            }

            container.innerHTML = `
                <div class="diet-goals-grid">
                    ${bmi ? `
                        <div class="diet-bmi-card">
                            <div class="diet-bmi-value">${bmi}</div>
                            <div class="diet-bmi-label">BMI</div>
                            <div class="diet-bmi-category ${bmiCategory.toLowerCase()}">${bmiCategory}</div>
                        </div>
                    ` : ''}
                    
                    <div class="diet-goal-card">
                        <div class="diet-goal-label">Goal</div>
                        <div class="diet-goal-value">${p.goal || 'Not set'}</div>
                    </div>
                    
                    ${p.target_weight_kg ? `
                        <div class="diet-goal-card">
                            <div class="diet-goal-label">Target Weight</div>
                            <div class="diet-goal-value">${p.target_weight_kg} kg</div>
                        </div>
                    ` : ''}
                    
                    <div class="diet-goal-card">
                        <div class="diet-goal-label">Height</div>
                        <div class="diet-goal-value">${p.height_cm || '--'} cm</div>
                    </div>
                    
                    <div class="diet-goal-card">
                        <div class="diet-goal-label">Activity Level</div>
                        <div class="diet-goal-value">${p.activity_level || 'Not set'}</div>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = '<div class="diet-empty-state"><p>Complete your health profile to see BMI and goals</p></div>';
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="diet-empty-state"><h4>Create a diet plan first</h4></div>';
    }
}

function openWeightLogModal() {
    const today = new Date().toISOString().split('T')[0];
    openDietModal('Log Weight', `
        <form id="weightLogForm" onsubmit="saveWeightLog(event)">
            <div class="diet-form-group">
                <label class="diet-form-label">Weight (kg)</label>
                <input type="number" id="weightInput" class="diet-form-input" step="0.1" min="20" max="300" required placeholder="e.g., 70.5">
            </div>
            <div class="diet-form-group">
                <label class="diet-form-label">Date</label>
                <input type="date" id="weightDate" class="diet-form-input" value="${today}" max="${today}" required>
            </div>
            <button type="submit" class="diet-btn-primary" style="width:100%; margin-top:16px;">
                <i class="fas fa-save"></i> Save Weight
            </button>
        </form>
    `);
}

async function saveWeightLog(event) {
    event.preventDefault();

    const weight = parseFloat(document.getElementById('weightInput').value);
    const date = document.getElementById('weightDate').value;

    try {
        const res = await fetch('/api/client/diet/weight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weight_kg: weight, log_date: date })
        });

        const data = await res.json();
        if (data.success) {
            closeDietModal();
            loadProgressContent();
            loadDashboardContent();
        } else {
            alert(data.error || 'Error saving weight');
        }
    } catch (e) {
        console.error(e);
        alert('Error saving weight');
    }
}

async function deleteWeightLog(logId) {
    if (!confirm('Delete this weight entry?')) return;

    try {
        await fetch(`/api/client/diet/weight/${logId}`, { method: 'DELETE' });
        loadProgressContent();
    } catch (e) { console.error(e); }
}

// ===========================================
// Reports Tab
// ===========================================

async function loadReportsContent() {
    const container = document.getElementById('diet-reports-content');
    if (!container) return;

    container.innerHTML = `
        <div class="diet-section-card">
            <div class="diet-section-header">
                <h3><i class="fas fa-chart-pie"></i> Weekly Summary</h3>
                <div class="diet-export-btns">
                    <button class="diet-btn-outline" onclick="printDietReport()">
                        <i class="fas fa-print"></i> Print
                    </button>
                    <button class="diet-btn-outline" onclick="exportDietPDF()">
                        <i class="fas fa-file-pdf"></i> PDF
                    </button>
                </div>
            </div>
            <div id="weeklySummaryContent">
                <div class="diet-loading"><div class="diet-loading-spinner"></div></div>
            </div>
        </div>
        
        <div class="diet-section-card">
            <div class="diet-section-header">
                <h3><i class="fas fa-lightbulb"></i> Insights & Recommendations</h3>
            </div>
            <div id="insightsContent">
                <div class="diet-loading"><div class="diet-loading-spinner"></div></div>
            </div>
        </div>
        
        <div class="diet-section-card">
            <div class="diet-section-header">
                <h3><i class="fas fa-carrot"></i> Food Recommendations</h3>
            </div>
            <div id="foodRecsContent">
                <div class="diet-loading"><div class="diet-loading-spinner"></div></div>
            </div>
        </div>
    `;

    loadWeeklySummary();
    loadInsights();
    loadFoodRecommendations();
}

function printDietReport() {
    window.print();
}

async function exportDietPDF() {
    // Show loading
    const btn = event.target.closest('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    btn.disabled = true;

    try {
        // Fetch data for PDF
        const [statsRes, profileRes] = await Promise.all([
            fetch('/api/client/diet/stats'),
            fetch('/api/client/diet/health-profile')
        ]);
        const stats = (await statsRes.json()).stats || {};
        const profile = (await profileRes.json()).profile || {};

        const todayCalories = stats.today?.calories || 0;
        const targetCalories = stats.targets?.calories || 2000;
        const proteinG = stats.today?.protein || 0;
        const carbsG = stats.today?.carbs || 0;
        const fatG = stats.today?.fat || 0;
        const waterMl = stats.water?.amount_ml || 0;

        // Create PDF content
        const pdfContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #e63946; margin: 0;">🍽️ Diet Report</h1>
                    <p style="color: #666;">Generated on ${new Date().toLocaleDateString('en-IN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })}</p>
                </div>
                
                <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <h2 style="color: #333; margin-top: 0;">📊 Daily Summary</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Calories</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${todayCalories} / ${targetCalories} kcal</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Protein</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${proteinG}g</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Carbs</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${carbsG}g</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Fat</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${fatG}g</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px;"><strong>Water</strong></td>
                            <td style="padding: 10px;">${waterMl}ml</td>
                        </tr>
                    </table>
                </div>
                
                ${profile ? `
                <div style="background: #e8f5e9; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <h2 style="color: #333; margin-top: 0;">👤 Profile</h2>
                    <p><strong>Goal:</strong> ${profile.goal?.replace('_', ' ') || 'Not set'}</p>
                    <p><strong>Weight:</strong> ${profile.weight_kg || '--'} kg</p>
                    <p><strong>Height:</strong> ${profile.height_cm || '--'} cm</p>
                    <p><strong>Activity:</strong> ${profile.activity_level || 'Not set'}</p>
                </div>
                ` : ''}
                
                <div style="text-align: center; margin-top: 40px; color: #999; font-size: 12px;">
                    <p>A3 Health Card - Diet & Nutrition Module</p>
                </div>
            </div>
        `;

        // Create a temporary container
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = pdfContent;
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        document.body.appendChild(tempDiv);

        // Check if html2pdf is loaded, if not use print fallback
        if (typeof html2pdf !== 'undefined') {
            await html2pdf().set({
                margin: 10,
                filename: `diet_report_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).from(tempDiv).save();
        } else {
            // Fallback: Open in new window for print
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head><title>Diet Report</title></head>
                <body>${pdfContent}</body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }

        document.body.removeChild(tempDiv);

    } catch (e) {
        console.error('PDF export error:', e);
        alert('Error generating PDF. Please try the Print option instead.');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function loadFoodRecommendations() {
    const container = document.getElementById('foodRecsContent');
    if (!container) return;

    try {
        const [statsRes, profileRes] = await Promise.all([
            fetch('/api/client/diet/stats'),
            fetch('/api/client/diet/health-profile')
        ]);
        const stats = (await statsRes.json()).stats || {};
        const profile = (await profileRes.json()).profile || {};

        const recs = [];

        // Protein-rich foods for low protein
        if ((stats.today?.protein || 0) < (stats.targets?.protein_g || 100) * 0.5) {
            recs.push({
                category: 'High Protein',
                icon: '<i class="fas fa-egg" style="color:#ff9800;"></i>',
                foods: ['Eggs', 'Paneer', 'Dal', 'Chicken', 'Greek Yogurt', 'Tofu']
            });
        }

        // Fiber-rich foods
        if (profile.conditions?.includes('diabetes') || profile.goal === 'weight_loss') {
            recs.push({
                category: 'High Fiber',
                icon: '<i class="fas fa-leaf" style="color:#4caf50;"></i>',
                foods: ['Oats', 'Brown Rice', 'Broccoli', 'Beans', 'Chia Seeds', 'Almonds']
            });
        }

        // Iron-rich foods
        recs.push({
            category: 'Iron Rich',
            icon: '<i class="fas fa-drumstick-bite" style="color:#e91e63;"></i>',
            foods: ['Spinach', 'Lentils', 'Beetroot', 'Pomegranate', 'Dates', 'Jaggery']
        });

        // Hydrating foods
        if ((stats.water?.percentage || 0) < 50) {
            recs.push({
                category: 'Hydrating Foods',
                icon: '<i class="fas fa-tint" style="color:#2196f3;"></i>',
                foods: ['Watermelon', 'Cucumber', 'Coconut Water', 'Oranges', 'Buttermilk']
            });
        }

        container.innerHTML = `
            <div class="diet-food-recs-grid">
                ${recs.map(r => `
                    <div class="diet-food-rec-card">
                        <div class="diet-food-rec-header">
                            <span class="diet-food-rec-icon">${r.icon}</span>
                            <span class="diet-food-rec-category">${r.category}</span>
                        </div>
                        <div class="diet-food-rec-list">
                            ${r.foods.map(f => `<span class="diet-food-rec-item">${f}</span>`).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="diet-empty-state"><p>Could not load recommendations</p></div>';
    }
}

async function loadWeeklySummary() {
    const container = document.getElementById('weeklySummaryContent');
    if (!container) return;

    try {
        const res = await fetch('/api/client/diet/stats');
        const data = await res.json();

        if (data.success) {
            const stats = data.stats;
            const todayCalories = stats.today?.calories || 0;
            const targetCalories = stats.targets?.calories || 2000;
            const adherence = Math.round((todayCalories / targetCalories) * 100) || 0;
            const mealsCount = stats.meals?.count || 0;
            const waterMl = stats.water?.amount_ml || 0;
            const waterPct = stats.water?.percentage || 0;
            const proteinG = stats.today?.protein || 0;
            const carbsG = stats.today?.carbs || 0;
            const fatG = stats.today?.fat || 0;
            const targetProtein = stats.targets?.protein_g || 100;
            const targetCarbs = stats.targets?.carbs_g || 200;
            const targetFat = stats.targets?.fat_g || 60;

            container.innerHTML = `
                <div class="diet-report-grid">
                    <div class="diet-report-card">
                        <div class="diet-report-icon"><i class="fas fa-fire"></i></div>
                        <div class="diet-report-value">${todayCalories}</div>
                        <div class="diet-report-label">Calories Today</div>
                        <div class="diet-report-target">of ${targetCalories} kcal</div>
                    </div>
                    
                    <div class="diet-report-card">
                        <div class="diet-report-icon"><i class="fas fa-percentage"></i></div>
                        <div class="diet-report-value">${Math.min(adherence, 100)}%</div>
                        <div class="diet-report-label">Daily Adherence</div>
                        <div class="diet-report-target">${adherence >= 90 ? '🎉 Excellent!' : adherence >= 70 ? '👍 Good' : '📈 Keep going'}</div>
                    </div>
                    
                    <div class="diet-report-card">
                        <div class="diet-report-icon"><i class="fas fa-utensils"></i></div>
                        <div class="diet-report-value">${mealsCount}</div>
                        <div class="diet-report-label">Meals Logged</div>
                        <div class="diet-report-target">Today</div>
                    </div>
                    
                    <div class="diet-report-card">
                        <div class="diet-report-icon"><i class="fas fa-tint"></i></div>
                        <div class="diet-report-value">${waterMl}ml</div>
                        <div class="diet-report-label">Water Intake</div>
                        <div class="diet-report-target">${waterPct}% of goal</div>
                    </div>
                </div>
                
                <div class="diet-macro-summary">
                    <h4 style="margin-bottom: 12px;">Macro Breakdown</h4>
                    <div class="diet-macro-bars">
                        <div class="diet-macro-bar-row">
                            <span class="diet-macro-name">Protein</span>
                            <div class="diet-macro-bar-bg">
                                <div class="diet-macro-bar-fill protein" style="width: ${Math.min(100, (proteinG / targetProtein) * 100)}%"></div>
                            </div>
                            <span class="diet-macro-percent">${proteinG}g / ${targetProtein}g</span>
                        </div>
                        <div class="diet-macro-bar-row">
                            <span class="diet-macro-name">Carbs</span>
                            <div class="diet-macro-bar-bg">
                                <div class="diet-macro-bar-fill carbs" style="width: ${Math.min(100, (carbsG / targetCarbs) * 100)}%"></div>
                            </div>
                            <span class="diet-macro-percent">${carbsG}g / ${targetCarbs}g</span>
                        </div>
                        <div class="diet-macro-bar-row">
                            <span class="diet-macro-name">Fat</span>
                            <div class="diet-macro-bar-bg">
                                <div class="diet-macro-bar-fill fat" style="width: ${Math.min(100, (fatG / targetFat) * 100)}%"></div>
                            </div>
                            <span class="diet-macro-percent">${fatG}g / ${targetFat}g</span>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="diet-empty-state"><h4>Error loading summary</h4></div>';
    }
}

async function loadInsights() {
    const container = document.getElementById('insightsContent');
    if (!container) return;

    try {
        const [statsRes, profileRes] = await Promise.all([
            fetch('/api/client/diet/stats'),
            fetch('/api/client/diet/health-profile')
        ]);
        const stats = (await statsRes.json()).stats;
        const profile = (await profileRes.json()).profile;

        const insights = [];

        // Generate insights based on data
        if (stats.today.calories < stats.targets.calories * 0.5) {
            insights.push({ icon: '<i class="fas fa-utensils" style="color:#9c27b0;"></i>', title: 'Eat More', text: 'You\'ve consumed less than 50% of your daily calories. Remember to eat balanced meals!' });
        }
        if (stats.water.percentage < 50) {
            insights.push({ icon: '<i class="fas fa-tint" style="color:#2196f3;"></i>', title: 'Stay Hydrated', text: 'You\'re behind on water intake. Try to drink a glass every hour.' });
        }
        if (stats.today.protein < stats.targets.protein_g * 0.7) {
            insights.push({ icon: '<i class="fas fa-egg" style="color:#ff9800;"></i>', title: 'Protein Boost', text: 'Consider adding protein-rich foods like dal, eggs, or paneer.' });
        }
        if (profile && profile.goal === 'weight_loss' && stats.today.calories > stats.targets.calories) {
            insights.push({ icon: '<i class="fas fa-exclamation-triangle" style="color:#f44336;"></i>', title: 'Calorie Alert', text: 'You\'ve exceeded your calorie target. Consider lighter meals for the rest of the day.' });
        }

        if (insights.length === 0) {
            insights.push({ icon: '<i class="fas fa-star" style="color:#ffc107;"></i>', title: 'Great Job!', text: 'You\'re on track with your diet plan. Keep up the excellent work!' });
        }

        container.innerHTML = `
            <div class="diet-insights-list">
                ${insights.map(i => `
                    <div class="diet-insight-card">
                        <span class="diet-insight-icon">${i.icon}</span>
                        <div class="diet-insight-content">
                            <div class="diet-insight-title">${i.title}</div>
                            <div class="diet-insight-text">${i.text}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="diet-empty-state"><h4>Complete your profile for insights</h4></div>';
    }
}

function loadPlanContent() {
    const container = document.getElementById('diet-plan-content');
    if (!container) return;

    // First check if there's an active plan
    loadActivePlanAndForm(container);
}

async function loadActivePlanAndForm(container) {
    container.innerHTML = `<div class="diet-loading"><div class="diet-loading-spinner"></div></div>`;

    try {
        // Get both profile and active plan
        const [profileRes, planRes] = await Promise.all([
            fetch('/api/client/diet/health-profile'),
            fetch('/api/client/diet/plans/active')
        ]);

        const profileData = await profileRes.json();
        const planData = await planRes.json();

        const profile = profileData.profile || {};
        const plan = planData.plan;

        container.innerHTML = `
            ${plan ? renderActivePlan(plan) : ''}
            ${renderHealthProfileForm(profile)}
        `;

        // Setup form listeners
        setupHealthProfileForm();

    } catch (error) {
        console.error('Error loading plan content:', error);
        container.innerHTML = `<div class="diet-empty-state"><h4>Error loading content</h4></div>`;
    }
}

function renderActivePlan(plan) {
    const mealDist = plan.meal_timing || {};
    const recommendations = plan.special_instructions ? plan.special_instructions.split('\n').filter(r => r.trim()) : [];

    return `
        <div class="diet-section-card" style="background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%); border: 2px solid var(--diet-primary);">
            <div class="diet-section-header">
                <h3><i class="fas fa-check-circle" style="color: var(--diet-success);"></i> Active Diet Plan</h3>
                <span style="background: var(--diet-primary); color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem;">
                    ${plan.plan_name}
                </span>
            </div>
            
            <!-- Calorie Target -->
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="font-size: 3rem; font-weight: 700; color: var(--diet-primary);">${plan.daily_calories}</div>
                <div style="color: var(--diet-text-muted);">Daily Calorie Target</div>
            </div>
            
            <!-- Macro Breakdown -->
            <div class="diet-macros-display">
                <div class="diet-macro-item">
                    <div class="diet-macro-value protein">${plan.protein_g}g</div>
                    <div class="diet-macro-label">Protein (${plan.protein_percent || 25}%)</div>
                </div>
                <div class="diet-macro-item">
                    <div class="diet-macro-value carbs">${plan.carbs_g}g</div>
                    <div class="diet-macro-label">Carbs (${plan.carbs_percent || 50}%)</div>
                </div>
                <div class="diet-macro-item">
                    <div class="diet-macro-value fat">${plan.fat_g}g</div>
                    <div class="diet-macro-label">Fat (${plan.fat_percent || 25}%)</div>
                </div>
                <div class="diet-macro-item">
                    <div class="diet-macro-value" style="color: #667eea;">${plan.fiber_g || 25}g</div>
                    <div class="diet-macro-label">Fiber</div>
                </div>
            </div>
            
            <!-- Meal Distribution -->
            ${Object.keys(mealDist).length > 0 ? `
                <div style="margin-top: 24px;">
                    <h4 style="margin-bottom: 12px;"><i class="fas fa-clock"></i> Meal Schedule</h4>
                    <div style="display: grid; gap: 8px;">
                        ${Object.entries(mealDist).map(([meal, info]) => `
                            <div style="display: flex; justify-content: space-between; padding: 10px 16px; background: #f8f9fa; border-radius: 8px;">
                                <span style="font-weight: 600; text-transform: capitalize;">${meal.replace(/_/g, ' ')}</span>
                                <span style="color: var(--diet-primary); font-weight: 600;">${info.calories} kcal</span>
                                <span style="color: var(--diet-text-muted); font-size: 0.85rem;">${info.time}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Recommendations -->
            ${recommendations.length > 0 ? `
                <div style="margin-top: 24px;">
                    <h4 style="margin-bottom: 12px;"><i class="fas fa-lightbulb"></i> Recommendations</h4>
                    <ul style="margin: 0; padding-left: 20px; color: var(--diet-text-muted);">
                        ${recommendations.map(r => `<li style="margin-bottom: 6px;">${r}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            <!-- Foods -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px;">
                ${(plan.recommended_foods && plan.recommended_foods.length > 0) ? `
                    <div>
                        <h4 style="margin-bottom: 8px; color: var(--diet-success);"><i class="fas fa-check"></i> Include</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                            ${plan.recommended_foods.slice(0, 8).map(f => `
                                <span style="background: #e8f5e9; color: #2e7d32; padding: 4px 10px; border-radius: 12px; font-size: 0.85rem;">${f}</span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                ${(plan.foods_to_avoid && plan.foods_to_avoid.length > 0) ? `
                    <div>
                        <h4 style="margin-bottom: 8px; color: var(--diet-danger);"><i class="fas fa-times"></i> Avoid</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                            ${plan.foods_to_avoid.slice(0, 8).map(f => `
                                <span style="background: #ffebee; color: #c62828; padding: 4px 10px; border-radius: 12px; font-size: 0.85rem;">${f}</span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function renderHealthProfileForm(profile) {
    return `
        <div class="diet-section-card">
            <div class="diet-section-header">
                <h3><i class="fas fa-magic"></i> Generate New Diet Plan</h3>
            </div>
            
            <form id="healthProfileForm">
                <!-- Body Metrics -->
                <div style="margin-bottom: 24px;">
                    <h4 style="margin-bottom: 16px; color: var(--diet-primary);"><i class="fas fa-user"></i> Body Metrics</h4>
                    <div class="diet-form-row">
                        <div class="diet-form-group">
                            <label class="diet-form-label">Height (cm) *</label>
                            <input type="number" class="diet-form-input" name="height_cm" value="${profile.height_cm || ''}" placeholder="e.g. 170" required>
                        </div>
                        <div class="diet-form-group">
                            <label class="diet-form-label">Weight (kg) *</label>
                            <input type="number" class="diet-form-input" name="weight_kg" value="${profile.weight_kg || ''}" placeholder="e.g. 70" step="0.1" required>
                        </div>
                        <div class="diet-form-group">
                            <label class="diet-form-label">Age *</label>
                            <input type="number" class="diet-form-input" name="age" value="${profile.age || ''}" placeholder="e.g. 30" required>
                        </div>
                        <div class="diet-form-group">
                            <label class="diet-form-label">Gender *</label>
                            <select class="diet-form-select" name="gender" required>
                                <option value="">Select</option>
                                <option value="Male" ${profile.gender === 'Male' ? 'selected' : ''}>Male</option>
                                <option value="Female" ${profile.gender === 'Female' ? 'selected' : ''}>Female</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- Activity & Goal -->
                <div style="margin-bottom: 24px;">
                    <h4 style="margin-bottom: 16px; color: var(--diet-primary);"><i class="fas fa-running"></i> Activity & Goal</h4>
                    <div class="diet-form-row">
                        <div class="diet-form-group">
                            <label class="diet-form-label">Activity Level *</label>
                            <select class="diet-form-select" name="activity_level" required>
                                <option value="">Select</option>
                                <option value="sedentary" ${profile.activity_level === 'sedentary' ? 'selected' : ''}>Sedentary (Little/no exercise)</option>
                                <option value="light" ${profile.activity_level === 'light' ? 'selected' : ''}>Light (1-3 days/week)</option>
                                <option value="moderate" ${profile.activity_level === 'moderate' ? 'selected' : ''}>Moderate (3-5 days/week)</option>
                                <option value="active" ${profile.activity_level === 'active' ? 'selected' : ''}>Active (6-7 days/week)</option>
                                <option value="very_active" ${profile.activity_level === 'very_active' ? 'selected' : ''}>Very Active (Physical job)</option>
                            </select>
                        </div>
                        <div class="diet-form-group">
                            <label class="diet-form-label">Goal *</label>
                            <select class="diet-form-select" name="goal" required>
                                <option value="">Select</option>
                                <option value="weight_loss" ${profile.goal === 'weight_loss' ? 'selected' : ''}>Weight Loss</option>
                                <option value="maintain" ${profile.goal === 'maintain' ? 'selected' : ''}>Maintain Weight</option>
                                <option value="weight_gain" ${profile.goal === 'weight_gain' ? 'selected' : ''}>Weight Gain</option>
                                <option value="muscle_gain" ${profile.goal === 'muscle_gain' ? 'selected' : ''}>Muscle Gain</option>
                            </select>
                        </div>
                        <div class="diet-form-group">
                            <label class="diet-form-label">Target Weight (kg)</label>
                            <input type="number" class="diet-form-input" name="target_weight_kg" value="${profile.target_weight_kg || ''}" placeholder="Optional" step="0.1">
                        </div>
                    </div>
                </div>
                
                <!-- Diet Preference -->
                <div style="margin-bottom: 24px;">
                    <h4 style="margin-bottom: 16px; color: var(--diet-primary);"><i class="fas fa-utensils"></i> Diet Preference</h4>
                    <div class="diet-form-row">
                        <div class="diet-form-group">
                            <label class="diet-form-label">Diet Type</label>
                            <select class="diet-form-select" name="diet_preference">
                                <option value="">Select</option>
                                <option value="vegetarian" ${profile.diet_preference === 'vegetarian' ? 'selected' : ''}>Vegetarian</option>
                                <option value="non-vegetarian" ${profile.diet_preference === 'non-vegetarian' ? 'selected' : ''}>Non-Vegetarian</option>
                                <option value="eggetarian" ${profile.diet_preference === 'eggetarian' ? 'selected' : ''}>Eggetarian</option>
                                <option value="vegan" ${profile.diet_preference === 'vegan' ? 'selected' : ''}>Vegan</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- Health Conditions -->
                <div style="margin-bottom: 24px;">
                    <h4 style="margin-bottom: 16px; color: var(--diet-primary);"><i class="fas fa-heartbeat"></i> Health Conditions</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                        ${['Diabetes', 'Prediabetes', 'Hypertension', 'PCOD', 'Thyroid', 'Cholesterol', 'Heart Disease', 'Kidney Disease'].map(condition => `
                            <label style="display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: #f8f9fa; border-radius: 20px; cursor: pointer;">
                                <input type="checkbox" name="known_conditions" value="${condition.toLowerCase()}" 
                                    ${(profile.known_conditions || []).includes(condition.toLowerCase()) ? 'checked' : ''}>
                                <span>${condition}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Allergies -->
                <div style="margin-bottom: 24px;">
                    <h4 style="margin-bottom: 16px; color: var(--diet-primary);"><i class="fas fa-allergies"></i> Allergies</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                        ${['Nuts', 'Dairy', 'Gluten', 'Eggs', 'Soy', 'Seafood', 'Lactose'].map(allergy => `
                            <label style="display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: #f8f9fa; border-radius: 20px; cursor: pointer;">
                                <input type="checkbox" name="allergies" value="${allergy.toLowerCase()}" 
                                    ${(profile.allergies || []).includes(allergy.toLowerCase()) ? 'checked' : ''}>
                                <span>${allergy}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Lab Values (Optional) -->
                <details style="margin-bottom: 24px;">
                    <summary style="cursor: pointer; font-weight: 600; color: var(--diet-primary); margin-bottom: 16px;">
                        <i class="fas fa-flask"></i> Lab Values (Optional - for better recommendations)
                    </summary>
                    <div class="diet-form-row" style="margin-top: 16px;">
                        <div class="diet-form-group">
                            <label class="diet-form-label">Fasting Glucose (mg/dL)</label>
                            <input type="number" class="diet-form-input" name="fasting_glucose" value="${profile.fasting_glucose || ''}" placeholder="e.g. 100">
                        </div>
                        <div class="diet-form-group">
                            <label class="diet-form-label">HbA1c (%)</label>
                            <input type="number" class="diet-form-input" name="hba1c" value="${profile.hba1c || ''}" placeholder="e.g. 5.7" step="0.1">
                        </div>
                        <div class="diet-form-group">
                            <label class="diet-form-label">Total Cholesterol (mg/dL)</label>
                            <input type="number" class="diet-form-input" name="total_cholesterol" value="${profile.total_cholesterol || ''}" placeholder="e.g. 180">
                        </div>
                        <div class="diet-form-group">
                            <label class="diet-form-label">Blood Pressure</label>
                            <select class="diet-form-select" name="blood_pressure">
                                <option value="">Select</option>
                                <option value="Normal" ${profile.blood_pressure === 'Normal' ? 'selected' : ''}>Normal</option>
                                <option value="Elevated" ${profile.blood_pressure === 'Elevated' ? 'selected' : ''}>Elevated</option>
                                <option value="High Stage 1" ${profile.blood_pressure === 'High Stage 1' ? 'selected' : ''}>High Stage 1</option>
                                <option value="High Stage 2" ${profile.blood_pressure === 'High Stage 2' ? 'selected' : ''}>High Stage 2</option>
                            </select>
                        </div>
                    </div>
                </details>
                
                <!-- Submit Button -->
                <div style="text-align: center; margin-top: 32px;">
                    <button type="submit" class="diet-btn-primary" style="padding: 14px 40px; font-size: 1.1rem;">
                        <i class="fas fa-magic"></i> Generate My Diet Plan
                    </button>
                </div>
            </form>
            
            <div id="generatePlanResult" style="margin-top: 24px;"></div>
        </div >
    `;
}

function setupHealthProfileForm() {
    const form = document.getElementById('healthProfileForm');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const formData = new FormData(form);
        const data = {};

        // Get basic fields
        ['height_cm', 'weight_kg', 'age', 'target_weight_kg', 'fasting_glucose', 'hba1c', 'total_cholesterol'].forEach(field => {
            const val = formData.get(field);
            if (val) data[field] = parseFloat(val);
        });

        ['gender', 'activity_level', 'goal', 'diet_preference', 'blood_pressure'].forEach(field => {
            const val = formData.get(field);
            if (val) data[field] = val;
        });

        // Get checkboxes
        data.known_conditions = formData.getAll('known_conditions');
        data.allergies = formData.getAll('allergies');

        const resultDiv = document.getElementById('generatePlanResult');
        resultDiv.innerHTML = `
    < div style = "text-align: center; padding: 40px;" >
                <div class="diet-loading-spinner" style="margin: 0 auto;"></div>
                <p style="margin-top: 16px; color: var(--diet-text-muted);">Generating your personalized diet plan...</p>
            </div >
    `;

        try {
            const response = await fetch('/api/client/diet/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                resultDiv.innerHTML = `
                    <div style="background: #e8f5e9; border: 2px solid #4CAF50; border-radius: 12px; padding: 20px; text-align: center;">
                        <i class="fas fa-check-circle" style="font-size: 3rem; color: #4CAF50;"></i>
                        <h3 style="margin: 16px 0 8px;">Diet Plan Generated!</h3>
                        <p style="color: var(--diet-text-muted); margin-bottom: 16px;">
                            Your daily target: <strong>${result.plan.daily_calories} kcal</strong><br>
                            BMR: ${result.calculation.bmr} kcal | TDEE: ${result.calculation.tdee} kcal
                        </p>
                        <button class="diet-btn-primary" onclick="loadPlanContent()">
                            <i class="fas fa-sync"></i> View Full Plan
                        </button>
                    </div>
                `;

                // Refresh dashboard stats
                loadDashboardContent();
            } else {
                resultDiv.innerHTML = `
                    <div style="background: #ffebee; border: 2px solid #f44336; border-radius: 12px; padding: 20px; text-align: center;">
                        <i class="fas fa-exclamation-circle" style="font-size: 2rem; color: #f44336;"></i>
                        <h4 style="margin: 12px 0;">Error</h4>
                        <p>${result.error || 'Failed to generate plan'}</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error:', error);
            resultDiv.innerHTML = `
                <div style="background: #ffebee; border: 2px solid #f44336; border-radius: 12px; padding: 20px; text-align: center;">
                    <i class="fas fa-exclamation-circle" style="font-size: 2rem; color: #f44336;"></i>
                    <h4 style="margin: 12px 0;">Error</h4>
                    <p>Network error. Please try again.</p>
                </div>
            `;
        }
    });
}

// ===========================================
// Global Exports
// ===========================================

if (typeof window !== 'undefined') {
    window.initializeDietModule = initializeDietModule;
    window.switchDietTab = switchDietTab;
    window.loadDashboardContent = loadDashboardContent;
    window.loadPlanContent = loadPlanContent;
    window.loadMealsContent = loadMealsContent;
    window.openLogMealModal = openLogMealModal;
    window.searchMealFoods = searchMealFoods;
    window.addFoodToMeal = addFoodToMeal;
    window.removeFoodFromMeal = removeFoodFromMeal;
    window.saveMeal = saveMeal;
    window.deleteMeal = deleteMeal;
    window.loadFoodsContent = loadFoodsContent;
    window.searchFoods = searchFoods;
    window.filterByCategory = filterByCategory;
    window.toggleFavorite = toggleFavorite;
    window.showAddFoodModal = showAddFoodModal;
    window.saveCustomFood = saveCustomFood;
    window.loadWaterContent = loadWaterContent;
    window.loadWaterData = loadWaterData;
    window.logWater = logWater;
    window.loadProgressContent = loadProgressContent;
    window.openWeightLogModal = openWeightLogModal;
    window.saveWeightLog = saveWeightLog;
    window.deleteWeightLog = deleteWeightLog;
    window.loadReportsContent = loadReportsContent;
    window.printDietReport = printDietReport;
    window.exportDietPDF = exportDietPDF;
    window.loadFoodRecommendations = loadFoodRecommendations;
    window.openMealModal = openMealModal;
    window.openWaterModal = openWaterModal;
    window.openWeightModal = openWeightModal;
    window.addWater = addWater;
    window.openDietModal = openDietModal;
    window.closeDietModal = closeDietModal;
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    // Check if we're on the diet page
    if (document.getElementById('diet-dashboard-content')) {
        initializeDietModule();
    }
});
