// Main Application - Mode Switching Logic

function switchMode(mode) {
    // Update tabs
    const simulationTab = document.getElementById('simulationTab');
    const csvTab = document.getElementById('csvTab');

    // Update content
    const simulationMode = document.getElementById('simulation-mode');
    const csvMode = document.getElementById('csv-mode');

    if (mode === 'simulation') {
        // Activate simulation mode
        simulationTab.classList.add('active');
        csvTab.classList.remove('active');
        simulationMode.classList.add('active');
        csvMode.classList.remove('active');

        console.log('Switched to Simulation Mode');
    } else if (mode === 'csv') {
        // Activate CSV mode
        csvTab.classList.add('active');
        simulationTab.classList.remove('active');
        csvMode.classList.add('active');
        simulationMode.classList.remove('active');

        console.log('Switched to CSV Analysis Mode');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('InfectioTrace Dashboard Loaded');

    // Simulation is initialized by simulation_app.js now

    // Initialize CSV upload
    if (typeof initializeCSVUpload === 'function') {
        initializeCSVUpload();
    }
});
