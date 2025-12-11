let simulationState = {
    running: false,
    day: 0,
    speed: 1,
    numClinics: 12,
    outbreakProbability: 30,
    totalCases: 0,
    dailyCases: 0,
    activeAlerts: 0,
    clinics: [],
    outbreakActive: false,
    outbreakEpicenter: null,
    interval: null,
    dailyCasesHistory: [],
    alertsHistory: [],
    activeAlertsList: [],
    alertsBySeverity: {
        high: 0,
        medium: 0,
        low: 0
    },
    lastProcessedDay: 0 
};

// API Base URL - Change this if your Flask server runs on a different port
const API_URL = '/api';

// Chart instances
let dailyCasesChart = null;
let alertsChart = null;

// Initialize simulation
async function initializeSimulation() {
    console.log('Initializing simulation with Flask backend...');
    
    try {
        const response = await fetch(`${API_URL}/simulation/init`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                num_clinics: simulationState.numClinics,
                outbreak_probability: simulationState.outbreakProbability
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            updateStateFromBackend(data.state);
            createClinicGrid();
            initializeCharts();
            updateStats();
            updateStatusMessage();
            console.log('Simulation initialized successfully');
        }
    } catch (error) {
        console.error('Error initializing simulation:', error);
        alert('Failed to connect to Flask backend. Make sure the server is running on port 5000.\n\nRun: python app.py');
    }
}

// Update local state from backend response
function updateStateFromBackend(state) {
    simulationState.day = state.day;
    simulationState.totalCases = state.total_cases;
    simulationState.dailyCases = state.daily_cases;
    simulationState.activeAlerts = state.active_alerts.length;
    simulationState.activeAlertsList = state.active_alerts || [];
    simulationState.clinics = state.clinics;
    simulationState.outbreakActive = state.outbreak_active;
    simulationState.outbreakEpicenter = state.outbreak_epicenter;
    simulationState.dailyCasesHistory = state.daily_cases_history;
    simulationState.alertsHistory = state.alerts_history;

    // --- accumulate cumulative severity counts (High / Medium / Low) ---
    if (state.day > simulationState.lastProcessedDay) {
        let high = 0, medium = 0, low = 0;

        state.active_alerts.forEach(a => {
            if (a.severity === 'high') {
                high++;
            } else if (a.severity === 'medium') {
                medium++;
            } else {
                low++;
            }
        });

        simulationState.alertsBySeverity.high += high;
        simulationState.alertsBySeverity.medium += medium;
        simulationState.alertsBySeverity.low += low;
        simulationState.lastProcessedDay = state.day;
    }

    // Show alerts in the feed
    displayAlerts(state.active_alerts);

    // Display alerts in feed
    displayAlerts(state.active_alerts);
    updateRuleStatus();
    updatePerformanceMetrics();
    updateStatusMessage();

}

// Create clinic visualization grid
function createClinicGrid() {
    const grid = document.getElementById('clinicGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    // Create 10x10 grid (100 cells)
    for (let i = 0; i < 100; i++) {
        const cell = document.createElement('div');
        cell.className = 'clinic-cell';
        cell.id = `cell-${i}`;
        grid.appendChild(cell);
    }
    
    // Place clinics from backend data
    updateClinicVisuals();
}

// Update clinic visuals on grid
function updateClinicVisuals() {
    // Clear all cells
    for (let i = 0; i < 100; i++) {
        const cell = document.getElementById(`cell-${i}`);
        if (cell) {
            cell.className = 'clinic-cell';
            cell.innerHTML = '';
        }
    }

    // Place clinics based on backend positions
    simulationState.clinics.forEach(clinic => {
        const [x, y] = clinic.position;   // [x, y] from backend
        const cellIndex = y * 10 + x;
        const cell = document.getElementById(`cell-${cellIndex}`);

        if (cell) {
            cell.classList.add('has-clinic');

            // work out which status class to apply
            let statusClass = 'normal';
            if (clinic.status === 'alert') {
                statusClass = 'alert';
            } else if (clinic.status === 'warning') {
                statusClass = 'warning';
            }

            // marker with status class so colors change
            const marker = document.createElement('div');
            marker.className = `clinic-marker ${statusClass}`;
            marker.innerHTML = `<span class="clinic-id">${clinic.id + 1}</span>`;
            marker.title = clinic.name;

            marker.onclick = () => showClinicInfo(clinic);
            cell.appendChild(marker);
        }
    });
}


// Display alerts in feed
function displayAlerts(alerts) {
    const alertFeed = document.getElementById('alertsFeed');
    if (!alertFeed) return;
    
    // Clear old alerts if starting fresh
    if (simulationState.day === 1) {
        alertFeed.innerHTML = '';
    }
    
    // Add new alerts
    alerts.forEach(alert => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert-item ${alert.severity}`;
        
        const severityBadge = alert.severity === 'high' ? 
            '<span class="severity-badge high">HIGH</span>' :
            '<span class="severity-badge medium">MEDIUM</span>';
        
        alertDiv.innerHTML = `
            ${severityBadge}
            <div class="alert-content">
                <strong>Day ${simulationState.day}</strong> - ${alert.clinic}<br>
                ${alert.message}
            </div>
            <div class="alert-timestamp">${new Date().toLocaleTimeString()}</div>
        `;
        
        alertFeed.insertBefore(alertDiv, alertFeed.firstChild);
    });
    
    // Limit to 50 alerts
    while (alertFeed.children.length > 50) {
        alertFeed.removeChild(alertFeed.lastChild);
    }
}

// Show clinic details
function showClinicInfo(clinic) {
    alert(`${clinic.name}\n\nStatus: ${clinic.status.toUpperCase()}\nToday's Cases: ${clinic.daily_cases}\nTotal Cases: ${clinic.total_cases}\nFever+Cough: ${clinic.fever_cough_cases}\nSevere Cases: ${clinic.severe_cases}`);
}

// Start simulation
async function startSimulation() {
    if (simulationState.running) return;
    
    simulationState.running = true;
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    if (startBtn) startBtn.disabled = true;
    if (pauseBtn) pauseBtn.disabled = false;
    
    try {
        await fetch(`${API_URL}/simulation/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                speed: simulationState.speed
            })
        });
        
        // Poll for updates
        simulationState.interval = setInterval(async () => {
            await fetchSimulationState();
        }, 1000 / simulationState.speed);
        
    } catch (error) {
        console.error('Error starting simulation:', error);
        alert('Failed to start simulation. Check if Flask server is running.');
    }
}

// Pause simulation
async function pauseSimulation() {
    if (!simulationState.running) return;
    
    simulationState.running = false;
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    if (startBtn) startBtn.disabled = false;
    if (pauseBtn) pauseBtn.disabled = true;
    
    if (simulationState.interval) {
        clearInterval(simulationState.interval);
    }
    
    try {
        await fetch(`${API_URL}/simulation/pause`, {
            method: 'POST'
        });
    } catch (error) {
        console.error('Error pausing simulation:', error);
    }
}

// Reset simulation
async function resetSimulation() {
    await pauseSimulation();

    simulationState.alertsBySeverity = { high: 0, medium: 0, low: 0 };
    simulationState.lastProcessedDay = 0;   

    try {
        const response = await fetch(`${API_URL}/simulation/reset`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                num_clinics: simulationState.numClinics,
                outbreak_probability: simulationState.outbreakProbability
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            updateStateFromBackend(data.state);
            updateClinicVisuals();
            updateStats();
            updateCharts();
            
            // Clear alerts
            const alertFeed = document.getElementById('alertsFeed');
            if (alertFeed) {
                alertFeed.innerHTML = '<div class="no-alerts">No alerts yet. Start simulation to begin monitoring.</div>';
            }
            updateRuleStatus();
            updatePerformanceMetrics();
            updateStatusMessage();

        }
    } catch (error) {
        console.error('Error resetting simulation:', error);
        alert('Failed to reset simulation. Check if Flask server is running.');
    }
}

// Fetch current simulation state
async function fetchSimulationState() {
    try {
        const response = await fetch(`${API_URL}/simulation/state`);
        const data = await response.json();
        
        if (data.status === 'success') {
            updateStateFromBackend(data.state);
            updateStats();
            updateClinicVisuals();
            updateCharts();
        }
    } catch (error) {
        console.error('Error fetching state:', error);
        // Don't show alert here as it would be annoying during polling
    }
}

// Update statistics display
function updateStats() {
    const dayEl = document.getElementById('simDay');
    const totalCasesEl = document.getElementById('totalCases');
    const dailyCasesEl = document.getElementById('dailyCases');
    const activeAlertsEl = document.getElementById('activeAlerts');

    if (dayEl) dayEl.textContent = simulationState.day;
    if (totalCasesEl) totalCasesEl.textContent = simulationState.totalCases;
    if (dailyCasesEl) dailyCasesEl.textContent = simulationState.dailyCases;
    if (activeAlertsEl) activeAlertsEl.textContent = simulationState.activeAlerts;

    updateRuleStatus();
    updatePerformanceMetrics();
    updateStatusMessage();
}


// Initialize charts
function initializeCharts() {
    const ctx1 = document.getElementById('dailyCasesChart');
    const ctx2 = document.getElementById('alertsChart');
    
    if (ctx1) {
        dailyCasesChart = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Daily Cases',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, labels: { color: '#ffffff' } }
                },
                scales: {
                    x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                    y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.1)' } }
                }
            }
        });
    }
    
    if (ctx2) {
        alertsChart = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: ['High', 'Medium', 'Low'],
                datasets: [{
                    label: 'Alerts',
                    data: [0, 0, 0],
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',   // High - red
                        'rgba(234, 179, 8, 0.8)',   // Medium - yellow
                        'rgba(34, 197, 94, 0.8)'    // Low - green
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#ffffff' } }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    }
                }
            }
        });
    }
}

// Update charts
function updateCharts() {
    if (dailyCasesChart) {
        dailyCasesChart.data.labels = simulationState.dailyCasesHistory.map((_, i) => `Day ${i + 1}`);
        dailyCasesChart.data.datasets[0].data = simulationState.dailyCasesHistory;
        dailyCasesChart.update();
    }
    
    if (alertsChart) {
        const { high, medium, low } = simulationState.alertsBySeverity;

        alertsChart.data.labels = ['High', 'Medium', 'Low'];
        alertsChart.data.datasets[0].data = [high, medium, low];
        alertsChart.update();
    }
}

// Control event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize simulation on load (if you want auto-init)
    initializeSimulation();

    // Start button
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', startSimulation);
    }
    
    // Pause button
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', pauseSimulation);
    }
    
    // Reset button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSimulation);
    }
    
    // Speed slider
    const speedSlider = document.getElementById('speedSlider');
    if (speedSlider) {
        speedSlider.addEventListener('input', (e) => {
            simulationState.speed = parseInt(e.target.value);
            const speedValue = document.getElementById('speedValue');
            if (speedValue) {
                speedValue.textContent = simulationState.speed + 'x';
            }
            
            // Restart interval if running
            if (simulationState.running) {
                clearInterval(simulationState.interval);
                simulationState.interval = setInterval(async () => {
                    await fetchSimulationState();
                }, 1000 / simulationState.speed);
            }
        });
    }
    
    // Clinics slider
    const clinicSlider = document.getElementById('clinicSlider');
    if (clinicSlider) {
        clinicSlider.addEventListener('input', (e) => {
            simulationState.numClinics = parseInt(e.target.value);
            const clinicValue = document.getElementById('clinicValue');
            if (clinicValue) {
                clinicValue.textContent = simulationState.numClinics;
            }
        });
    }
    
    // Outbreak probability slider
    const probSlider = document.getElementById('probSlider');
    if (probSlider) {
        probSlider.addEventListener('input', (e) => {
            simulationState.outbreakProbability = parseInt(e.target.value);
            const probValue = document.getElementById('probValue');
            if (probValue) {
                probValue.textContent = simulationState.outbreakProbability + '%';
            }
        });
    }
});

// Toggle detection rules visibility (used by "Show Details" button)
function toggleRules() {
    const container = document.getElementById('rulesContainer');
    const btn = document.getElementById('rulesToggle');

    if (!container || !btn) return;

    if (container.style.display === 'none' || container.style.display === '') {
        container.style.display = 'grid';
        btn.textContent = 'Hide Details';
    } else {
        container.style.display = 'none';
        btn.textContent = 'Show Details';
    }
}

// Update rule status based on backend alerts (Rule 1/2/3)
function updateRuleStatus() {
    const alerts = simulationState.activeAlertsList || [];

    const hasHighCases = alerts.some(a => a.type === 'high_cases');
    const hasGeoCluster = alerts.some(a => a.type === 'geographic_cluster');
    const hasRapidIncrease = alerts.some(a => a.type === 'rapid_increase');

    // Rule 1: High 7-day fever+cough load
    const rule1Status = document.getElementById('rule1Status');
    if (rule1Status) {
        if (hasHighCases) {
            rule1Status.classList.remove('inactive');
            rule1Status.classList.add('active');
            rule1Status.textContent = 'ACTIVE';
        } else {
            rule1Status.classList.remove('active');
            rule1Status.classList.add('inactive');
            rule1Status.textContent = 'INACTIVE';
        }
    }

    // Rule 2: Geographic clustering
    const rule2Status = document.getElementById('rule2Status');
    if (rule2Status) {
        if (hasGeoCluster) {
            rule2Status.classList.remove('inactive');
            rule2Status.classList.add('active');
            rule2Status.textContent = 'ACTIVE';
        } else {
            rule2Status.classList.remove('active');
            rule2Status.classList.add('inactive');
            rule2Status.textContent = 'INACTIVE';
        }
    }

    // Rule 3: Rapid increase
    const rule3Status = document.getElementById('rule3Status');
    if (rule3Status) {
        if (hasRapidIncrease) {
            rule3Status.classList.remove('inactive');
            rule3Status.classList.add('active');
            rule3Status.textContent = 'ACTIVE';
        } else {
            rule3Status.classList.remove('active');
            rule3Status.classList.add('inactive');
            rule3Status.textContent = 'INACTIVE';
        }
    }
}

// Update system performance metrics (same style as v1)
function updatePerformanceMetrics() {
    // Detection Accuracy (simple heuristic 85–95%)
    const accuracyEl = document.getElementById('perfAccuracy');
    const accuracyBar = document.getElementById('perfAccuracyBar');
    if (accuracyEl && simulationState.day > 0) {
        const alertsPerDay = simulationState.activeAlerts / Math.max(1, simulationState.day);
        const accuracy = Math.min(95, 85 + alertsPerDay * 10);
        accuracyEl.textContent = accuracy.toFixed(1) + '%';
        if (accuracyBar) {
            accuracyBar.style.width = accuracy + '%';
        }
    }

    // Average Detection Time
    const detectionTimeEl = document.getElementById('perfDetectionTime');
    if (detectionTimeEl && simulationState.activeAlerts > 0) {
        const avgTime = Math.max(1, Math.floor(simulationState.day / simulationState.activeAlerts));
        detectionTimeEl.textContent = avgTime;
    }

    // False Positive Rate (simulated 0–5%)
    const falsePositiveEl = document.getElementById('perfFalsePositive');
    if (falsePositiveEl) {
        const falsePositiveRate = Math.floor(Math.random() * 5);
        falsePositiveEl.textContent = falsePositiveRate;
    }

    // System Uptime (always 100% in simulation)
    const uptimeEl = document.getElementById('perfUptime');
    if (uptimeEl) {
        uptimeEl.textContent = '100';
    }
}

// Status message banner (matches v1 texts/styles)
function updateStatusMessage() {
    const statusEl = document.getElementById('statusMessage');
    if (!statusEl) return;

    if (simulationState.outbreakActive) {
        statusEl.textContent = '⚠️ OUTBREAK ACTIVE! Multiple clinics reporting elevated case counts.';
        statusEl.classList.add('outbreak');
    } else if (simulationState.day === 0) {
        statusEl.textContent = '🎮 Ready to start. Click START SIMULATION to begin monitoring.';
        statusEl.classList.remove('outbreak');
    } else if (simulationState.activeAlerts > 0) {
        statusEl.textContent = `🚨 Monitoring: ${simulationState.activeAlerts} active alert(s) in the network.`;
        statusEl.classList.remove('outbreak');
    } else {
        statusEl.textContent = '✅ Monitoring: No active outbreak signals detected.';
        statusEl.classList.remove('outbreak');
    }
}