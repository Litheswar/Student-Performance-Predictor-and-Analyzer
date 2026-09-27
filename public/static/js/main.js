/* ============================================================
   EduPredict - Main JS
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ── Tab Navigation ──────────────────────────────────────
    const menuItems = document.querySelectorAll('.menu-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('page-title');

    const tabTitles = {
        predictor: 'Predictive Score Dashboard',
        analytics: 'Insights & Analytics',
        about: 'Model Details'
    };

    menuItems.forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            const targetTab = item.getAttribute('data-tab');

            menuItems.forEach(m => m.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));

            item.classList.add('active');
            const activeTab = document.getElementById(`${targetTab}-tab`);
            if (activeTab) activeTab.classList.add('active');
            if (pageTitle) pageTitle.textContent = tabTitles[targetTab] || '';

            // Load analytics data when switching to that tab
            if (targetTab === 'analytics') loadAnalytics();
            if (targetTab === 'about') loadModelMetrics();
        });
    });

    // ── Slider Live Updates ──────────────────────────────────
    const sliderConfigs = [
        { id: 'previous_score', displayId: 'previous_score_val', suffix: '%' },
        { id: 'study_hours', displayId: 'study_hours_val', suffix: 'h' },
        { id: 'distraction_time', displayId: 'distraction_time_val', suffix: 'h' },
        { id: 'lessons_completed', displayId: 'lessons_completed_val', suffix: '' },
        { id: 'sleep_hours', displayId: 'sleep_hours_val', suffix: 'h' },
    ];

    sliderConfigs.forEach(({ id, displayId, suffix }) => {
        const slider = document.getElementById(id);
        const display = document.getElementById(displayId);
        if (!slider || !display) return;

        const updateDisplay = () => {
            const val = parseFloat(slider.value);
            display.textContent = val % 1 === 0 ? `${val}${suffix}` : `${val}${suffix}`;
            // Update track fill color
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            const pct = ((val - min) / (max - min)) * 100;
            slider.style.background = `linear-gradient(to right, #7c3aed ${pct}%, rgba(255,255,255,0.1) ${pct}%)`;
        };

        slider.addEventListener('input', updateDisplay);
        updateDisplay(); // initial
    });

    // ── Group Study Toggle ───────────────────────────────────
    const groupStudyToggle = document.getElementById('group_study');
    const groupStudyText = document.getElementById('group_study_text');
    if (groupStudyToggle && groupStudyText) {
        groupStudyToggle.addEventListener('change', () => {
            groupStudyText.textContent = groupStudyToggle.checked ? 'Yes' : 'No';
        });
    }

    // ── SVG Gauge Gradient Definition ───────────────────────
    const gaugeSvg = document.querySelector('.gauge-svg');
    if (gaugeSvg) {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#7c3aed"/>
                <stop offset="100%" stop-color="#3b82f6"/>
            </linearGradient>
        `;
        gaugeSvg.prepend(defs);
    }

    // ── Prediction Form Submit ───────────────────────────────
    const predictionForm = document.getElementById('prediction-form');
    const submitBtn = predictionForm ? predictionForm.querySelector('.btn-primary') : null;

    if (predictionForm) {
        predictionForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (submitBtn) {
                submitBtn.classList.add('loading');
                submitBtn.querySelector('span').textContent = 'Calculating';
            }

            const payload = {
                previous_score: document.getElementById('previous_score').value,
                study_hours: document.getElementById('study_hours').value,
                distraction_time: document.getElementById('distraction_time').value,
                lessons_completed: document.getElementById('lessons_completed').value,
                sleep_hours: document.getElementById('sleep_hours').value,
                group_study: document.getElementById('group_study').checked ? 1 : 0,
                learning_style: document.getElementById('learning_style').value,
            };

            try {
                const response = await fetch('/api/predict', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (data.error) {
                    alert('Error: ' + data.error);
                    return;
                }

                updateScoreDisplay(data.predicted_score);
                updateRecommendations(data.recommendations);

            } catch (err) {
                console.error('Prediction error:', err);
                alert('Failed to reach prediction API. Make sure the server is running.');
            } finally {
                if (submitBtn) {
                    submitBtn.classList.remove('loading');
                    submitBtn.querySelector('span').textContent = 'Calculate Projection';
                }
            }
        });
    }

    // ── Score Display & Gauge ────────────────────────────────
    function updateScoreDisplay(score) {
        const scoreText = document.getElementById('predicted-score-text');
        const badge = document.getElementById('score-badge');
        const gaugeFill = document.getElementById('gauge-fill-circle');

        // Animate score count-up
        let current = 0;
        const target = score;
        const step = target / 50;
        const timer = setInterval(() => {
            current = Math.min(current + step, target);
            if (scoreText) scoreText.textContent = Math.round(current);
            if (current >= target) clearInterval(timer);
        }, 20);

        // Animate gauge arc (circumference = 2*PI*r = 2*3.14159*45 ≈ 282.74)
        const circumference = 282.74;
        const offset = circumference - (score / 100) * circumference;
        if (gaugeFill) {
            setTimeout(() => {
                gaugeFill.style.strokeDashoffset = offset;
            }, 50);
        }

        // Update badge
        if (badge) {
            badge.className = 'score-label-badge';
            if (score >= 85) {
                badge.textContent = '🏆 Excellent Performance';
                badge.classList.add('excellent');
            } else if (score >= 70) {
                badge.textContent = '👍 Good Performance';
                badge.classList.add('good');
            } else if (score >= 55) {
                badge.textContent = '📈 Average - Room to Grow';
                badge.classList.add('average');
            } else {
                badge.textContent = '⚠️ Needs Improvement';
                badge.classList.add('needs-improvement');
            }
        }
    }

    // ── Recommendations ──────────────────────────────────────
    const categoryIcons = {
        'Sleep': 'fa-moon',
        'Distractions': 'fa-mobile-screen',
        'Study Habits': 'fa-book-open',
        'Collaboration': 'fa-users',
        'Curriculum Completion': 'fa-list-check',
        'General': 'fa-star',
    };

    function updateRecommendations(recommendations) {
        const container = document.getElementById('recommendations-container');
        if (!container) return;

        container.innerHTML = '';
        recommendations.forEach((rec, i) => {
            const icon = categoryIcons[rec.category] || 'fa-circle-info';
            const item = document.createElement('div');
            item.className = `recommendation-item impact-${rec.impact}`;
            item.style.animationDelay = `${i * 0.08}s`;
            item.innerHTML = `
                <div class="rec-icon-wrap">
                    <i class="fa-solid ${icon}"></i>
                </div>
                <div class="rec-content">
                    <div class="rec-category">${rec.category}</div>
                    <div class="rec-text">${rec.text}</div>
                </div>
            `;
            container.appendChild(item);
        });
    }

    // ── Analytics Charts ─────────────────────────────────────
    let importanceChart = null;
    let correlationChart = null;

    const chartDefaults = {
        color: '#94a3b8',
        borderColor: 'rgba(255,255,255,0.07)',
        font: { family: 'Outfit', size: 12 }
    };

    async function loadAnalytics() {
        try {
            const res = await fetch('/api/analytics');
            const data = await res.json();
            if (data.error) { console.error(data.error); return; }

            renderImportanceChart(data.feature_importances);
            renderCorrelationChart(data.correlation_with_score);
            renderStatsTable(data.stats);
        } catch (err) {
            console.error('Analytics load error:', err);
        }
    }

    function renderImportanceChart(importances) {
        const ctx = document.getElementById('importanceChart');
        if (!ctx) return;

        const labels = {
            previous_score: 'Previous Score',
            study_hours: 'Study Hours',
            distraction_time: 'Distraction Time',
            lessons_completed: 'Lessons Completed',
            sleep_hours: 'Sleep Hours',
            group_study: 'Group Study',
            learning_style_encoded: 'Learning Style',
        };

        const rawLabels = Object.keys(importances);
        const values = rawLabels.map(k => (importances[k] * 100).toFixed(1));
        const displayLabels = rawLabels.map(k => labels[k] || k);

        const colors = [
            'rgba(124, 58, 237, 0.85)',
            'rgba(59, 130, 246, 0.85)',
            'rgba(6, 182, 212, 0.85)',
            'rgba(16, 185, 129, 0.85)',
            'rgba(245, 158, 11, 0.85)',
            'rgba(239, 68, 68, 0.85)',
            'rgba(167, 139, 250, 0.85)',
        ];

        if (importanceChart) importanceChart.destroy();
        importanceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: displayLabels,
                datasets: [{
                    label: 'Importance (%)',
                    data: values,
                    backgroundColor: colors,
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(10, 14, 26, 0.95)',
                        borderColor: 'rgba(124,58,237,0.4)',
                        borderWidth: 1,
                        titleColor: '#f1f5f9',
                        bodyColor: '#94a3b8',
                        callbacks: {
                            label: ctx => ` ${ctx.parsed.x}% importance`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: chartDefaults.borderColor },
                        ticks: { color: chartDefaults.color, font: chartDefaults.font },
                        title: { display: true, text: 'Importance (%)', color: chartDefaults.color }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: chartDefaults.color, font: chartDefaults.font }
                    }
                }
            }
        });
    }

    function renderCorrelationChart(corr) {
        const ctx = document.getElementById('correlationChart');
        if (!ctx) return;

        const labels = {
            previous_score: 'Previous Score',
            study_hours: 'Study Hours',
            distraction_time: 'Distraction Time',
            lessons_completed: 'Lessons Completed',
            sleep_hours: 'Sleep Hours',
            group_study: 'Group Study',
            learning_style: 'Learning Style',
        };

        const keys = Object.keys(corr).filter(k => k !== 'score' && k !== 'effective_study');
        const vals = keys.map(k => parseFloat(corr[k]).toFixed(3));
        const displayLabels = keys.map(k => labels[k] || k);

        const barColors = vals.map(v =>
            v >= 0 ? 'rgba(16, 185, 129, 0.75)' : 'rgba(239, 68, 68, 0.75)'
        );

        if (correlationChart) correlationChart.destroy();
        correlationChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: displayLabels,
                datasets: [{
                    label: 'Correlation with Score',
                    data: vals,
                    backgroundColor: barColors,
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(10, 14, 26, 0.95)',
                        borderColor: 'rgba(16,185,129,0.4)',
                        borderWidth: 1,
                        titleColor: '#f1f5f9',
                        bodyColor: '#94a3b8',
                    }
                },
                scales: {
                    x: {
                        grid: { color: chartDefaults.borderColor },
                        ticks: { color: chartDefaults.color, font: chartDefaults.font, maxRotation: 30 }
                    },
                    y: {
                        grid: { color: chartDefaults.borderColor },
                        ticks: { color: chartDefaults.color, font: chartDefaults.font },
                        title: { display: true, text: 'Pearson Correlation', color: chartDefaults.color }
                    }
                }
            }
        });
    }

    function renderStatsTable(stats) {
        const tbody = document.querySelector('#dataset-stats-table tbody');
        if (!tbody || !stats) return;

        const displayNames = {
            previous_score: 'Previous Score',
            study_hours: 'Study Hours',
            distraction_time: 'Distraction Time',
            lessons_completed: 'Lessons Completed',
            sleep_hours: 'Sleep Hours',
            group_study: 'Group Study',
            effective_study: 'Effective Study',
            score: 'Final Score',
        };

        tbody.innerHTML = '';
        const keys = Object.keys(stats).filter(k => k !== 'learning_style');
        keys.forEach(key => {
            const s = stats[key];
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${displayNames[key] || key}</td>
                <td>${parseFloat(s.mean).toFixed(2)}</td>
                <td>${parseFloat(s.min).toFixed(2)}</td>
                <td>${parseFloat(s.max).toFixed(2)}</td>
                <td>${parseFloat(s.std).toFixed(2)}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // ── Model Metrics (About Tab) ────────────────────────────
    async function loadModelMetrics() {
        try {
            const res = await fetch('/api/analytics');
            const data = await res.json();
            if (data.error) return;

            const m = data.model_metrics;
            const r2El = document.getElementById('r2-val');
            const maeEl = document.getElementById('mae-val');
            const mseEl = document.getElementById('mse-val');
            if (r2El) r2El.textContent = m.r2 ? `${(m.r2 * 100).toFixed(1)}%` : '--';
            if (maeEl) maeEl.textContent = m.mae ? m.mae.toFixed(2) : '--';
            if (mseEl) mseEl.textContent = m.mse ? m.mse.toFixed(2) : '--';
        } catch (err) {
            console.error('Metrics load error:', err);
        }
    }
});
