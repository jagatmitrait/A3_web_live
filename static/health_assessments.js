// Health Assessments module for client dashboard
(function () {
    'use strict';

    const state = { assessments: [], filteredAssessments: [], currentCategory: 'all', initialized: false };
    function $(id) { return document.getElementById(id); }

    async function loadHealthAssessments() {
        try {
            const loadingEl = $('assessmentLoadingState');
            if (loadingEl) loadingEl.style.display = 'block';

            const response = await fetch('/api/client/health-assessments');
            const data = await response.json();

            if (loadingEl) loadingEl.style.display = 'none';

            if (data.success) {
                state.assessments = data.assessments || [];
                state.filteredAssessments = state.assessments;
                renderAssessmentCards(state.assessments);
                updateAssessmentStats(state.assessments);
            } else {
                console.error('Error loading assessments:', data.error);
            }
        } catch (error) {
            console.error('Error loading health assessments:', error);
            const loadingEl = $('assessmentLoadingState');
            if (loadingEl) loadingEl.style.display = 'none';
        }
    }

    function updateAssessmentStats(assessments) {
        const totalEl = $('assessmentStatTotal');
        const lastBpEl = $('assessmentStatLastBP');
        const lastPulseEl = $('assessmentStatLastPulse');
        const lastDateEl = $('assessmentStatLastDate');

        if (totalEl) totalEl.textContent = assessments.length;

        if (assessments.length > 0) {
            const latest = assessments[0];
            if (lastBpEl && latest.systolic_bp && latest.diastolic_bp) {
                lastBpEl.textContent = latest.systolic_bp + '/' + latest.diastolic_bp + ' mmHg';
            }
            if (lastPulseEl && latest.pulse) {
                lastPulseEl.textContent = latest.pulse + ' bpm';
            }
            if (lastDateEl && latest.date) {
                lastDateEl.textContent = latest.date.split(',')[0]; // Just the date part
            }
        }
    }

    function filterByCategory(category) {
        state.currentCategory = category;

        // Update active tab
        document.querySelectorAll('.assessment-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.category === category) {
                tab.classList.add('active');
            }
        });

        if (category === 'all') {
            state.filteredAssessments = state.assessments;
        } else {
            state.filteredAssessments = state.assessments.filter(a =>
                a.assessment_type && a.assessment_type.toLowerCase().includes(category.toLowerCase())
            );
        }

        renderAssessmentCards(state.filteredAssessments);
    }

    function renderAssessmentCards(assessments) {
        const container = $('assessmentCardsContainer');
        const emptyState = $('assessmentEmptyState');
        if (!container) return;

        container.innerHTML = '';
        if (!assessments || assessments.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        if (emptyState) emptyState.style.display = 'none';

        assessments.forEach(a => container.appendChild(buildAssessmentCard(a)));
    }

    function buildAssessmentCard(a) {
        const col = document.createElement('div');
        col.className = 'col-md-6 mb-3';

        // Build vitals display
        const vitalsHtml = [];
        if (a.systolic_bp && a.diastolic_bp) {
            vitalsHtml.push(`<div class="vital-mini"><div class="vital-mini-value">${a.systolic_bp}/${a.diastolic_bp}</div><div class="vital-mini-label">BP (mmHg)</div></div>`);
        }
        if (a.pulse) {
            vitalsHtml.push(`<div class="vital-mini"><div class="vital-mini-value">${a.pulse}</div><div class="vital-mini-label">Pulse</div></div>`);
        }
        if (a.temperature) {
            vitalsHtml.push(`<div class="vital-mini"><div class="vital-mini-value">${a.temperature}°F</div><div class="vital-mini-label">Temp</div></div>`);
        }
        if (a.spo2) {
            vitalsHtml.push(`<div class="vital-mini"><div class="vital-mini-value">${a.spo2}%</div><div class="vital-mini-label">SpO2</div></div>`);
        }
        if (a.blood_glucose) {
            vitalsHtml.push(`<div class="vital-mini"><div class="vital-mini-value">${a.blood_glucose}</div><div class="vital-mini-label">Glucose</div></div>`);
        }
        if (a.weight) {
            vitalsHtml.push(`<div class="vital-mini"><div class="vital-mini-value">${a.weight}kg</div><div class="vital-mini-label">Weight</div></div>`);
        }

        // Build extra data sections
        let extraHtml = '';
        if (a.pregnancy_data) {
            try {
                const pd = typeof a.pregnancy_data === 'string' ? JSON.parse(a.pregnancy_data) : a.pregnancy_data;
                extraHtml += `<div class="mt-2 p-2 bg-light rounded"><small><i class="fas fa-baby text-pink"></i> <strong>Pregnancy:</strong> Week ${pd.gestational_week || 'N/A'}, EDD: ${pd.edd || 'N/A'}</small></div>`;
            } catch (e) { }
        }
        if (a.child_data) {
            try {
                const cd = typeof a.child_data === 'string' ? JSON.parse(a.child_data) : a.child_data;
                extraHtml += `<div class="mt-2 p-2 bg-light rounded"><small><i class="fas fa-child text-info"></i> <strong>Child:</strong> Weight ${cd.weight || 'N/A'}kg, Height ${cd.height || 'N/A'}cm</small></div>`;
            } catch (e) { }
        }
        if (a.ncd_data) {
            try {
                const nd = typeof a.ncd_data === 'string' ? JSON.parse(a.ncd_data) : a.ncd_data;
                extraHtml += `<div class="mt-2 p-2 bg-light rounded"><small><i class="fas fa-heart-broken text-danger"></i> <strong>NCD:</strong> ${nd.condition || 'Chronic Condition'}</small></div>`;
            } catch (e) { }
        }
        if (a.mental_health_data) {
            try {
                const mh = typeof a.mental_health_data === 'string' ? JSON.parse(a.mental_health_data) : a.mental_health_data;
                extraHtml += `<div class="mt-2 p-2 bg-light rounded"><small><i class="fas fa-brain text-purple"></i> <strong>Mental Health:</strong> PHQ-2 Score ${mh.phq2_score || 'N/A'}</small></div>`;
            } catch (e) { }
        }

        col.innerHTML = `
            <div class="assessment-card">
                <div class="assessment-card-header d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${a.date}</strong>
                        <span class="category-badge category-${a.assessment_type} ms-2">${a.assessment_type || 'General'}</span>
                    </div>
                    ${a.referral_made ? '<span class="badge bg-warning">Referral Made</span>' : ''}
                </div>
                <div class="assessment-card-body">
                    <div class="vitals-grid-compact mb-2">
                        ${vitalsHtml.join('')}
                    </div>
                    ${extraHtml}
                    ${a.notes ? `<div class="mt-2 border-top pt-2"><small class="text-muted"><i class="fas fa-sticky-note"></i> ${a.notes}</small></div>` : ''}
                    <div class="mt-2 d-flex justify-content-between align-items-center">
                        <small class="text-muted"><i class="fas fa-user-nurse"></i> ${a.health_worker}</small>
                        ${a.follow_up_date ? `<small class="text-primary"><i class="fas fa-calendar"></i> Follow-up: ${a.follow_up_date}</small>` : ''}
                    </div>
                </div>
            </div>
        `;
        return col;
    }

    function init() {
        if (state.initialized) return;

        const page = $('health-assessments-page');
        if (!page) return;

        state.initialized = true;

        // Set up tab click handlers
        document.querySelectorAll('.assessment-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                filterByCategory(tab.dataset.category);
            });
        });

        // Load data
        loadHealthAssessments();
    }

    // Expose functions
    window.loadHealthAssessments = loadHealthAssessments;
    window.filterAssessmentCategory = filterByCategory;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
