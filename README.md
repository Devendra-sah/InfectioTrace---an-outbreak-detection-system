# 🦠 InfectioTrace - AI-Powered Outbreak Detection System

<div align="center">

![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-2.0+-green.svg)
![Mesa](https://img.shields.io/badge/Mesa-Agent--Based-orange.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

**An intelligent, logic-based early warning system for public health outbreak detection**

[Features](#-features) • [Demo](#-demo) • [Installation](#-installation) • [Usage](#-usage) • [API](#-api-endpoints) • [Contributing](#-contributing)

</div>

---

## 📋 Overview

**InfectioTrace** is an AI-powered outbreak detection system designed to monitor healthcare facility networks and identify potential disease outbreaks in real-time. Built using Agent-Based Modeling (ABM) with the Mesa framework, it simulates clinic networks and applies rule-based detection algorithms to generate early warning alerts.

The system provides two operational modes:
- **🎮 Simulation Mode**: Real-time outbreak simulation with configurable parameters
- **📊 CSV Analysis Mode**: Upload and analyze real clinic data for outbreak risk assessment

---

## ✨ Features

### 🔬 Agent-Based Modeling
- **Multi-Agent Simulation**: Each clinic operates as an independent agent monitoring patient cases
- **Spatial Awareness**: Clinics are positioned on a grid with distance-based outbreak spread
- **Dynamic Outbreak Generation**: Probabilistic outbreak triggering with configurable epicenters

### 🚨 Detection Rules Engine
| Rule | Description | Severity |
|------|-------------|----------|
| **High Cases Alert** | Triggers when fever+cough cases exceed 50 in a 7-day window | 🔴 HIGH |
| **Geographic Clustering** | Detects when a single clinic reports >10 fever+cough cases | 🟡 MEDIUM |
| **Rapid Increase** | Triggers when daily cases double compared to 7-day average | 🔴 HIGH |

### 📊 Real-Time Visualization
- Interactive clinic network grid visualization
- Live metrics dashboard (daily cases, total cases, active alerts)
- Dynamic charts for case trends and alert history
- Color-coded clinic status indicators (Normal/Warning/Alert)

### 📈 Performance Metrics
- Detection Accuracy tracking
- Average Detection Time measurement
- False Positive Rate monitoring
- System uptime status

---

## 🖥️ Demo

### Simulation Mode
The simulation mode allows you to:
- Configure number of clinics (6-20)
- Set outbreak probability (10-100%)
- Control simulation speed (1x-10x)
- View real-time outbreak spread across the clinic network

### CSV Analysis Mode
Upload your clinic data in CSV format to:
- Calculate outbreak risk scores
- Identify high-risk clinics
- Generate automated alerts based on detection rules
- View data summaries and trends

---

## 🚀 Installation

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/Devendra-sah/InfectioTrace---an-outbreak-detection-system.git
cd InfectioTrace---an-outbreak-detection-system
```

2. **Create a virtual environment** (recommended)
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. **Install dependencies**
```bash
pip install flask flask-cors mesa numpy
```

4. **Run the application**
```bash
python app.py
```

5. **Open your browser**
```
http://localhost:5000
```

---

## 📖 Usage

### Simulation Mode

1. Click on **🎮 SIMULATION MODE** tab
2. Configure simulation parameters:
   - **Number of Clinics**: Adjust the slider (6-20 clinics)
   - **Outbreak Probability**: Set the likelihood of outbreak occurrence
   - **Simulation Speed**: Control how fast the simulation runs
3. Click **▶️ Start Simulation** to begin
4. Monitor the clinic grid for status changes:
   - 🟢 **Green**: Normal operation
   - 🟡 **Yellow**: Warning - elevated cases
   - 🔴 **Red**: Alert - outbreak detected
5. View real-time metrics and charts
6. Use **⏸️ Pause** to freeze or **🔄 Reset** to restart

### CSV Analysis Mode

1. Click on **📊 CSV ANALYSIS MODE** tab
2. Upload your clinic data CSV file
3. Required CSV columns:
   - `date` (YYYY-MM-DD format)
   - `clinic_name`
   - `total_patients`
   - `fever_cases`, `cough_cases`, `fever_and_cough_cases`
   - `sore_throat_cases`, `body_ache_cases`, `headache_cases`
   - `severe_cases`
4. View the outbreak risk assessment and detected alerts

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Serve the main application page |
| `/api/simulation/init` | POST | Initialize a new simulation |
| `/api/simulation/step` | POST | Advance simulation by one day |
| `/api/simulation/state` | GET | Get current simulation state |
| `/api/simulation/start` | POST | Start auto-running simulation |
| `/api/simulation/pause` | POST | Pause the simulation |
| `/api/simulation/reset` | POST | Reset simulation to initial state |
| `/api/simulation/outbreak` | POST | Manually trigger an outbreak |
| `/api/csv/analyze` | POST | Analyze uploaded CSV data |

### Example API Usage

```python
import requests

# Initialize simulation
response = requests.post('http://localhost:5000/api/simulation/init', json={
    'num_clinics': 12,
    'outbreak_probability': 30
})

# Get current state
state = requests.get('http://localhost:5000/api/simulation/state').json()
print(f"Day: {state['state']['day']}, Cases: {state['state']['total_cases']}")
```

---

## 🏗️ Project Structure

```
InfectioTrace/
├── app.py                    # Flask application & API endpoints
├── outbreak_model.py         # Mesa agent-based model
├── clinic_data_template.csv  # Sample CSV template
├── templates/
│   └── index.html           # Main HTML template
├── static/
│   ├── style.css            # Main styles
│   ├── simulation_style.css # Simulation mode styles
│   ├── csv_style.css        # CSV mode styles
│   ├── app.js               # Core JavaScript
│   ├── simulation_app.js    # Simulation mode logic
│   └── csv_app.js           # CSV analysis logic
└── README.md
```

---

## 🛠️ Technologies Used

- **Backend**: Python, Flask, Flask-CORS
- **Agent-Based Modeling**: Mesa (ABM framework)
- **Data Processing**: NumPy
- **Frontend**: HTML5, CSS3, JavaScript
- **Visualization**: Chart.js

---

## 🎯 Detection Algorithm

The system uses a multi-rule detection engine:

```
IF fever_cough_cases(7_day_total) > 50 THEN
    TRIGGER high_severity_alert
    
IF single_clinic_fever_cough > 10 THEN
    TRIGGER geographic_cluster_alert
    
IF daily_cases >= (7_day_average * 2) THEN
    TRIGGER rapid_increase_alert
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Authors

- **Devendra Sah** - [GitHub](https://github.com/Devendra-sah)

---

## 🙏 Acknowledgments

- Mesa Framework for Agent-Based Modeling
- Chart.js for data visualization
- Flask for the web framework

---

<div align="center">

**⭐ Star this repository if you find it helpful!**

Made with ❤️ for Public Health

</div>
