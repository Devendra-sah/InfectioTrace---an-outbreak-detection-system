from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import json
import threading
import time
from outbreak_model import OutbreakModel

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Global simulation state
simulation = None
simulation_lock = threading.Lock()
auto_running = False
simulation_thread = None


@app.route('/')
def index():
    """Serve the main HTML page"""
    return render_template('index.html')


@app.route('/api/simulation/init', methods=['POST'])
def init_simulation():
    """Initialize a new simulation"""
    global simulation

    data = request.json
    num_clinics = data.get('num_clinics', 12)
    outbreak_probability = data.get('outbreak_probability', 30)

    with simulation_lock:
        simulation = OutbreakModel(
            num_clinics=num_clinics,
            outbreak_probability=outbreak_probability
        )

    return jsonify({
        'status': 'success',
        'message': 'Simulation initialized',
        'state': simulation.get_state()
    })


@app.route('/api/simulation/step', methods=['POST'])
def step_simulation():
    """Advance simulation by one day"""
    global simulation

    if simulation is None:
        return jsonify({'status': 'error', 'message': 'Simulation not initialized'}), 400

    with simulation_lock:
        simulation.step()
        state = simulation.get_state()

    return jsonify({
        'status': 'success',
        'state': state
    })


@app.route('/api/simulation/state', methods=['GET'])
def get_state():
    """Get current simulation state"""
    global simulation

    if simulation is None:
        return jsonify({'status': 'error', 'message': 'Simulation not initialized'}), 400

    with simulation_lock:
        state = simulation.get_state()

    return jsonify({
        'status': 'success',
        'state': state
    })


@app.route('/api/simulation/start', methods=['POST'])
def start_simulation():
    """Start auto-running simulation"""
    global auto_running, simulation_thread

    if simulation is None:
        return jsonify({'status': 'error', 'message': 'Simulation not initialized'}), 400

    data = request.json
    speed = data.get('speed', 1)  # Steps per second

    auto_running = True

    def run_simulation():
        global auto_running
        while auto_running:
            with simulation_lock:
                if simulation:
                    simulation.step()
            time.sleep(1.0 / speed)

    simulation_thread = threading.Thread(target=run_simulation, daemon=True)
    simulation_thread.start()

    return jsonify({
        'status': 'success',
        'message': 'Simulation started'
    })


@app.route('/api/simulation/pause', methods=['POST'])
def pause_simulation():
    """Pause auto-running simulation"""
    global auto_running

    auto_running = False

    return jsonify({
        'status': 'success',
        'message': 'Simulation paused'
    })


@app.route('/api/simulation/reset', methods=['POST'])
def reset_simulation():
    """Reset simulation to initial state"""
    global simulation, auto_running

    auto_running = False

    data = request.json
    num_clinics = data.get('num_clinics', 12)
    outbreak_probability = data.get('outbreak_probability', 30)

    with simulation_lock:
        simulation = OutbreakModel(
            num_clinics=num_clinics,
            outbreak_probability=outbreak_probability
        )

    return jsonify({
        'status': 'success',
        'message': 'Simulation reset',
        'state': simulation.get_state()
    })


@app.route('/api/simulation/outbreak', methods=['POST'])
def trigger_outbreak():
    """Manually trigger an outbreak"""
    global simulation

    if simulation is None:
        return jsonify({'status': 'error', 'message': 'Simulation not initialized'}), 400

    with simulation_lock:
        triggered = simulation.trigger_outbreak()

    return jsonify({
        'status': 'success',
        'triggered': triggered,
        'message': 'Outbreak triggered' if triggered else 'Outbreak already active'
    })


@app.route('/api/csv/analyze', methods=['POST'])
def analyze_csv():
    """Analyze uploaded CSV data (keep existing JavaScript logic)"""
    # This endpoint can be kept minimal since CSV analysis 
    # is already handled well in the frontend JavaScript
    return jsonify({
        'status': 'success',
        'message': 'CSV analysis handled by frontend'
    })


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)