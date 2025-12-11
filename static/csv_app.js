// CSV Analysis Mode JavaScript

// Initialize CSV upload functionality
function initializeCSVUpload() {
    console.log('Initializing CSV upload...');

    const fileInput = document.getElementById('csvFile');
    const uploadZone = document.getElementById('uploadZone');

    // File input change
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = '#3b82f6';
        uploadZone.style.background = 'rgba(59, 130, 246, 0.2)';
    });

    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'rgba(59, 130, 246, 0.5)';
        uploadZone.style.background = 'rgba(255, 255, 255, 0.03)';
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'rgba(59, 130, 246, 0.5)';
        uploadZone.style.background = 'rgba(255, 255, 255, 0.03)';

        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.csv')) {
            handleFile(file);
        } else {
            alert('Please upload a CSV file');
        }
    });
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// Handle file reading
function handleFile(file) {
    const reader = new FileReader();

    reader.onload = function(e) {
        const csvText = e.target.result;
        console.log('CSV file loaded, parsing...');
        analyzeCSVData(csvText);
    };

    reader.onerror = function() {
        alert('Error reading file. Please try again.');
    };

    reader.readAsText(file);
}

// Parse CSV text
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',');
        const row = {};

        headers.forEach((header, index) => {
            row[header] = values[index] ? values[index].trim() : '';
        });

        data.push(row);
    }

    return data;
}

// Analyze CSV data
function analyzeCSVData(csvText) {
    try {
        const data = parseCSV(csvText);

        // Convert data types
        data.forEach(row => {
            row.date = new Date(row.date);
            row.total_patients = parseInt(row.total_patients) || 0;
            row.fever_cases = parseInt(row.fever_cases) || 0;
            row.cough_cases = parseInt(row.cough_cases) || 0;
            row.fever_and_cough_cases = parseInt(row.fever_and_cough_cases) || 0;
            row.sore_throat_cases = parseInt(row.sore_throat_cases) || 0;
            row.body_ache_cases = parseInt(row.body_ache_cases) || 0;
            row.headache_cases = parseInt(row.headache_cases) || 0;
            row.severe_cases = parseInt(row.severe_cases) || 0;
        });

        // Sort by date
        data.sort((a, b) => a.date - b.date);

        console.log(`Parsed ${data.length} records`);

        // Perform analysis
        const analysis = performOutbreakAnalysis(data);

        // Display results
        displayAnalysisResults(analysis);

    } catch (error) {
        console.error('Error analyzing CSV:', error);
        alert('Error analyzing CSV file. Please check the format and try again.');
    }
}

// Perform outbreak detection analysis
function performOutbreakAnalysis(data) {
    const alerts = [];

    // Rule 1: High fever+cough cases in 7-day window
    const uniqueDates = [...new Set(data.map(d => d.date.toISOString().split('T')[0]))];

    uniqueDates.forEach(dateStr => {
        const date = new Date(dateStr);
        const windowStart = new Date(date);
        windowStart.setDate(windowStart.getDate() - 7);

        const windowData = data.filter(d => d.date >= windowStart && d.date <= date);
        const totalFeverCough = windowData.reduce((sum, d) => sum + d.fever_and_cough_cases, 0);

        if (totalFeverCough > 50) {
            alerts.push({
                date: dateStr,
                type: 'High Fever+Cough Cases',
                severity: 'high',
                count: totalFeverCough,
                description: `${totalFeverCough} fever+cough cases in 7-day window`,
                rule: 'Rule 1'
            });
        }
    });

    // Rule 2: Geographic clustering (>10 cases at single clinic)
    data.forEach(row => {
        if (row.fever_and_cough_cases > 10) {
            alerts.push({
                date: row.date.toISOString().split('T')[0],
                type: 'Geographic Cluster',
                severity: 'medium',
                clinic: row.clinic_name,
                count: row.fever_and_cough_cases,
                description: `Cluster at ${row.clinic_name}: ${row.fever_and_cough_cases} cases`,
                rule: 'Rule 2'
            });
        }
    });

    // Rule 3: Rapid increase detection
    const dailyTotals = {};
    data.forEach(row => {
        const dateKey = row.date.toISOString().split('T')[0];
        if (!dailyTotals[dateKey]) {
            dailyTotals[dateKey] = 0;
        }
        dailyTotals[dateKey] += row.fever_and_cough_cases;
    });

    const dates = Object.keys(dailyTotals).sort();
    for (let i = 7; i < dates.length; i++) {
        const current = dailyTotals[dates[i]];
        const previous7 = dates.slice(i - 7, i).map(d => dailyTotals[d]);
        const avg = previous7.reduce((a, b) => a + b, 0) / 7;

        if (current > avg * 2 && avg > 0) {
            alerts.push({
                date: dates[i],
                type: 'Rapid Increase',
                severity: 'high',
                current: current,
                average: Math.round(avg * 10) / 10,
                description: `Cases doubled: ${current} vs avg ${Math.round(avg * 10) / 10}`,
                rule: 'Rule 3'
            });
        }
    }
    
    // Calculate risk prediction
    const riskPrediction = calculateRiskScore(data, alerts);

    // Generate summary
    const summary = generateSummary(data);

    // Generate clinic summary
    const clinicSummary = generateClinicSummary(data);

    return {
        alerts,
        riskPrediction,
        summary,
        clinicSummary
    };
}

// Calculate risk score
function calculateRiskScore(data, alerts) {
    // Get last 7 days of data
    const sortedData = data.sort((a, b) => a.date - b.date);
    const lastDate = sortedData[sortedData.length - 1].date;
    const sevenDaysAgo = new Date(lastDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const last7Days = sortedData.filter(d => d.date >= sevenDaysAgo);

    // Calculate metrics
    const totalFeverCough = last7Days.reduce((sum, d) => sum + d.fever_and_cough_cases, 0);
    const avgDailyCases = totalFeverCough / 7;
    const severeCases = last7Days.reduce((sum, d) => sum + d.severe_cases, 0);

    let riskScore = 0;

    // Factor 1: Case volume (0-40 points)
    if (avgDailyCases > 30) {
        riskScore += 40;
    } else if (avgDailyCases > 20) {
        riskScore += 25;
    } else if (avgDailyCases > 10) {
        riskScore += 10;
    }

    // Factor 2: Severe cases (0-30 points)
    if (severeCases > 10) {
        riskScore += 30;
    } else if (severeCases > 5) {
        riskScore += 15;
    }

    // Factor 3: Trend (0-30 points)
    const halfPoint = Math.floor(last7Days.length / 2);
    const firstHalf = last7Days.slice(0, halfPoint);
    const secondHalf = last7Days.slice(halfPoint);

    const firstSum = firstHalf.reduce((sum, d) => sum + d.fever_and_cough_cases, 0);
    const secondSum = secondHalf.reduce((sum, d) => sum + d.fever_and_cough_cases, 0);

    let trend = 'Stable/Decreasing';
    if (secondSum > firstSum * 1.5) {
        riskScore += 30;
        trend = 'Rapidly Increasing';
    } else if (secondSum > firstSum) {
        riskScore += 15;
        trend = 'Increasing';
    }

    // Determine risk level
    let riskLevel, riskClass, recommendation, emoji;

    if (riskScore >= 70) {
        riskLevel = 'CRITICAL';
        riskClass = 'critical';
        emoji = '🔴';
        recommendation = 'Immediate outbreak response required. Activate emergency protocols.';
    } else if (riskScore >= 50) {
        riskLevel = 'HIGH';
        riskClass = 'high';
        emoji = '🟠';
        recommendation = 'High outbreak risk detected. Increase monitoring and prepare response teams.';
    } else if (riskScore >= 30) {
        riskLevel = 'MEDIUM';
        riskClass = 'medium';
        emoji = '🟡';
        recommendation = 'Moderate risk detected. Continue enhanced surveillance.';
    } else {
        riskLevel = 'LOW';
        riskClass = 'low';
        emoji = '🟢';
        recommendation = 'Normal operations. Maintain routine monitoring.';
    }

    return {
        score: riskScore,
        level: riskLevel,
        class: riskClass,
        emoji: emoji,
        trend: trend,
        avgDailyCases: avgDailyCases.toFixed(1),
        severeCases: severeCases,
        recommendation: recommendation
    };
}

// Generate summary statistics
function generateSummary(data) {
    const sortedData = data.sort((a, b) => a.date - b.date);

    return {
        totalRecords: data.length,
        dateStart: sortedData[0].date.toISOString().split('T')[0],
        dateEnd: sortedData[sortedData.length - 1].date.toISOString().split('T')[0],
        clinics: [...new Set(data.map(d => d.clinic_name))],
        totalPatients: data.reduce((sum, d) => sum + d.total_patients, 0)
    };
}

// Generate clinic-level summary
function generateClinicSummary(data) {
    const clinicData = {};

    data.forEach(row => {
        if (!clinicData[row.clinic_name]) {
            clinicData[row.clinic_name] = {
                name: row.clinic_name,
                totalPatients: 0,
                feverCoughCases: 0,
                severeCases: 0
            };
        }

        clinicData[row.clinic_name].totalPatients += row.total_patients;
        clinicData[row.clinic_name].feverCoughCases += row.fever_and_cough_cases;
        clinicData[row.clinic_name].severeCases += row.severe_cases;
    });

    return Object.values(clinicData);
}

// Display analysis results
function displayAnalysisResults(analysis) {
    const resultsDiv = document.getElementById('csvResults');
    if (!resultsDiv) return;

    const highAlerts = analysis.alerts.filter(a => a.severity === 'high');
    const mediumAlerts = analysis.alerts.filter(a => a.severity === 'medium');

    let html = `
        <!-- Data Summary -->
        <div class="summary-card">
            <h3>✅ Data Loaded Successfully</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-label">Total Records</div>
                    <div class="stat-value">${analysis.summary.totalRecords}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Date Range</div>
                    <div class="stat-value" style="font-size: 1.3em;">${analysis.summary.dateStart}</div>
                    <div style="color: #94a3b8; margin-top: 5px; font-size: 0.9em;">to ${analysis.summary.dateEnd}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Clinics Monitored</div>
                    <div class="stat-value">${analysis.summary.clinics.length}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Total Patients</div>
                    <div class="stat-value">${analysis.summary.totalPatients}</div>
                </div>
            </div>
            <div style="margin-top: 20px; color: #94a3b8;">
                <strong>Clinics:</strong> ${analysis.summary.clinics.join(', ')}
            </div>
        </div>

        <!-- Risk Prediction Card -->
        <div class="risk-card ${analysis.riskPrediction.class}">
            <h3>🔮 Outbreak Risk Prediction</h3>
            <div class="risk-level">${analysis.riskPrediction.emoji} ${analysis.riskPrediction.level}</div>
            <div class="risk-score">${analysis.riskPrediction.score}<span style="font-size: 0.5em;">/100</span></div>

            <div class="stats-grid" style="margin-top: 30px;">
                <div class="stat-item">
                    <div class="stat-label">Trend Direction</div>
                    <div class="stat-value" style="font-size: 1.4em;">${analysis.riskPrediction.trend}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Avg Daily Cases (7d)</div>
                    <div class="stat-value" style="font-size: 1.4em;">${analysis.riskPrediction.avgDailyCases}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Severe Cases (7d)</div>
                    <div class="stat-value" style="font-size: 1.4em;">${analysis.riskPrediction.severeCases}</div>
                </div>
            </div>

            <div class="risk-recommendation">
                <strong>💡 Recommendation:</strong><br>
                ${analysis.riskPrediction.recommendation}
            </div>
        </div>

        <!-- Alerts Section -->
        <div class="summary-card">
            <h3>🚨 Outbreak Alerts Detected: ${analysis.alerts.length}</h3>
            <div class="stats-grid">
                <div class="stat-item" style="border-left-color: #ef4444;">
                    <div class="stat-label">HIGH Severity</div>
                    <div class="stat-value" style="color: #ef4444;">${highAlerts.length}</div>
                </div>
                <div class="stat-item" style="border-left-color: #eab308;">
                    <div class="stat-label">MEDIUM Severity</div>
                    <div class="stat-value" style="color: #eab308;">${mediumAlerts.length}</div>
                </div>
            </div>

            <div class="alerts-container">
    `;

    // HIGH alerts
    if (highAlerts.length > 0) {
        html += `<h4 style="color: #ef4444;">🔴 HIGH Severity Alerts (${highAlerts.length}):</h4>`;
        highAlerts.slice(0, 10).forEach(alert => {
            html += `
                <div class="alert-item high">
                    <div class="alert-header">
                        <div>
                            <strong>${alert.date}</strong> - ${alert.type}
                        </div>
                        <span class="alert-badge high">HIGH</span>
                    </div>
                    <div>${alert.description}</div>
                </div>
            `;
        });
        if (highAlerts.length > 10) {
            html += `<p style="color: #94a3b8; margin: 10px 0;">... and ${highAlerts.length - 10} more HIGH alerts</p>`;
        }
    }

    // MEDIUM alerts
    if (mediumAlerts.length > 0) {
        html += `<h4 style="color: #eab308; margin-top: 25px;">🟡 MEDIUM Severity Alerts (${mediumAlerts.length}):</h4>`;
        mediumAlerts.slice(0, 10).forEach(alert => {
            html += `
                <div class="alert-item medium">
                    <div class="alert-header">
                        <div>
                            <strong>${alert.date}</strong> - ${alert.type}
                        </div>
                        <span class="alert-badge medium">MEDIUM</span>
                    </div>
                    <div>${alert.description}</div>
                </div>
            `;
        });
        if (mediumAlerts.length > 10) {
            html += `<p style="color: #94a3b8; margin: 10px 0;">... and ${mediumAlerts.length - 10} more MEDIUM alerts</p>`;
        }
    }

    html += `
            </div>
        </div>

        <!-- Clinic Summary Table -->
        <div class="summary-card">
            <h3>📊 Clinic Summary</h3>
            <table class="clinic-table">
                <thead>
                    <tr>
                        <th>Clinic Name</th>
                        <th>Total Patients</th>
                        <th>Fever+Cough Cases</th>
                        <th>Severe Cases</th>
                    </tr>
                </thead>
                <tbody>
    `;

    analysis.clinicSummary.forEach(clinic => {
        html += `
            <tr>
                <td><strong>${clinic.name}</strong></td>
                <td>${clinic.totalPatients}</td>
                <td>${clinic.feverCoughCases}</td>
                <td>${clinic.severeCases}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    resultsDiv.innerHTML = html;
    resultsDiv.style.display = 'block';

    // Scroll to results
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Download CSV template
function downloadTemplate() {
    const template = `date,clinic_name,total_patients,fever_cases,cough_cases,fever_and_cough_cases,sore_throat_cases,body_ache_cases,headache_cases,severe_cases
2024-01-01,Clinic_A,8,2,1,1,1,0,1,0
2024-01-01,Clinic_B,10,2,2,1,0,1,2,0
2024-01-02,Clinic_A,12,3,2,2,1,1,1,0
2024-01-02,Clinic_B,15,5,4,4,2,1,2,0
2024-01-15,Clinic_A,12,3,2,2,1,1,1,0
2024-01-15,Clinic_B,25,12,10,11,2,1,3,2
2024-01-16,Clinic_A,10,2,2,1,0,1,1,0
2024-01-16,Clinic_B,28,14,12,13,1,2,2,2
2024-01-20,Clinic_A,14,4,3,3,2,1,2,0
2024-01-20,Clinic_B,30,15,14,14,2,1,3,3`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clinic_data_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    console.log('CSV template downloaded');
}
