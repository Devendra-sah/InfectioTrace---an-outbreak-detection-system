from mesa import Agent, Model
from mesa.time import RandomActivation
from mesa.space import MultiGrid
from mesa.datacollection import DataCollector
import random
import numpy as np
from datetime import datetime, timedelta


class ClinicAgent(Agent):
    """
    A clinic agent that monitors patient cases and generates alerts.
    """

    def __init__(self, unique_id, model, name, position):
        super().__init__(unique_id, model)
        self.name = name
        self.position = position  # (x, y) coordinates
        self.daily_cases = 0
        self.total_cases = 0
        self.fever_cough_cases = 0
        self.severe_cases = 0
        self.case_history = []  # Last 7 days
        self.status = "normal"  # normal, warning, alert
        self.alert_level = 0

    def generate_cases(self):
        """Generate daily case counts based on outbreak status"""
        # Base case generation (5-15 cases normally)
        base_cases = random.randint(5, 15)

        # Check if this clinic is affected by outbreak
        if self.model.outbreak_active and self.model.outbreak_epicenter:
            epicenter_pos = self.model.outbreak_epicenter.position
            # Calculate distance from epicenter
            distance = np.sqrt(
                (self.position[0] - epicenter_pos[0])**2 + 
                (self.position[1] - epicenter_pos[1])**2
            )

            # Closer to epicenter = more cases
            if distance <= 2:
                outbreak_cases = random.randint(20, 40)
            elif distance <= 4:
                outbreak_cases = random.randint(15, 30)
            else:
                outbreak_cases = random.randint(10, 20)

            self.daily_cases = outbreak_cases
        else:
            self.daily_cases = base_cases

        # 60-80% of cases are fever+cough
        self.fever_cough_cases = int(self.daily_cases * random.uniform(0.6, 0.8))

        # 5-15% are severe
        self.severe_cases = int(self.daily_cases * random.uniform(0.05, 0.15))

        self.total_cases += self.daily_cases

        # Update case history (keep last 7 days)
        self.case_history.append(self.fever_cough_cases)
        if len(self.case_history) > 7:
            self.case_history.pop(0)

    def check_alerts(self):
        """Check outbreak detection rules and update status"""
        alerts = []
        self.status = "normal"
        self.alert_level = 0

        # Rule 1: High fever+cough cases in 7-day window
        if len(self.case_history) >= 7:
            seven_day_total = sum(self.case_history)
            if seven_day_total > 50:
                alerts.append({
                    'type': 'high_cases',
                    'severity': 'high',
                    'clinic': self.name,
                    'cases': seven_day_total,
                    'message': f'7-day fever+cough cases exceed 50 ({seven_day_total} cases)'
                })
                self.status = "alert"
                self.alert_level = 2

        # Rule 2: Geographic clustering (single clinic >10 cases)
        if self.fever_cough_cases > 10:
            alerts.append({
                'type': 'geographic_cluster',
                'severity': 'medium',
                'clinic': self.name,
                'cases': self.fever_cough_cases,
                'message': f'Single clinic spike: {self.fever_cough_cases} fever+cough cases today'
            })
            if self.alert_level < 2:
                self.status = "alert"
                self.alert_level = 2

        # Rule 3: Rapid increase (double the 7-day average)
        if len(self.case_history) >= 7:
            seven_day_avg = sum(self.case_history) / 7
            if self.fever_cough_cases >= seven_day_avg * 2:
                alerts.append({
                    'type': 'rapid_increase',
                    'severity': 'high',
                    'clinic': self.name,
                    'cases': self.fever_cough_cases,
                    'avg': round(seven_day_avg, 1),
                    'message': f'Cases doubled: {self.fever_cough_cases} vs avg {round(seven_day_avg, 1)}'
                })
                if self.alert_level < 1:
                    self.status = "warning"
                    self.alert_level = 1

        return alerts

    def step(self):
        """Clinic's daily step: generate cases and check for alerts"""
        self.generate_cases()
        alerts = self.check_alerts()

        # Report alerts to model
        if alerts:
            self.model.active_alerts.extend(alerts)

        return alerts


class OutbreakModel(Model):
    """
    Mesa model for disease outbreak simulation across clinic network.
    """

    def __init__(self, num_clinics=12, grid_width=10, grid_height=10, outbreak_probability=30):
        super().__init__()
        self.num_clinics = num_clinics
        self.grid_width = grid_width
        self.grid_height = grid_height
        self.outbreak_probability = outbreak_probability / 100.0

        self.schedule = RandomActivation(self)
        self.grid = MultiGrid(grid_width, grid_height, torus=False)

        self.current_day = 0
        self.total_cases = 0
        self.daily_cases = 0
        self.outbreak_active = False
        self.outbreak_epicenter = None
        self.active_alerts = []

        # Historical data
        self.daily_cases_history = []
        self.alerts_history = []

        # Create clinic agents
        self.create_clinics()

        # Data collector
        self.datacollector = DataCollector(
            model_reporters={
                "Total Cases": lambda m: m.total_cases,
                "Daily Cases": lambda m: m.daily_cases,
                "Active Alerts": lambda m: len(m.active_alerts),
                "Outbreak Active": lambda m: m.outbreak_active
            },
            agent_reporters={
                "Daily Cases": "daily_cases",
                "Status": "status"
            }
        )

    def create_clinics(self):
        """Create and place clinic agents on the grid"""
        clinic_names = [
            "City General Hospital",
            "Riverside Clinic",
            "Downtown Health Center",
            "Northside Medical",
            "Eastwood Clinic",
            "Westfield Hospital",
            "Central Care Center",
            "Southside Clinic",
            "Highland Medical",
            "Parkview Health",
            "Lakeside Hospital",
            "Metro Health Center"
        ]

        # Place clinics randomly on grid
        placed_positions = set()

        for i in range(min(self.num_clinics, len(clinic_names))):
            # Find unique random position
            while True:
                x = random.randint(0, self.grid_width - 1)
                y = random.randint(0, self.grid_height - 1)
                if (x, y) not in placed_positions:
                    placed_positions.add((x, y))
                    break

            clinic = ClinicAgent(i, self, clinic_names[i], (x, y))
            self.schedule.add(clinic)
            self.grid.place_agent(clinic, (x, y))

    def trigger_outbreak(self):
        """Randomly trigger an outbreak with configured probability"""
        if random.random() < self.outbreak_probability:
            self.outbreak_active = True
            # Select random clinic as epicenter
            all_clinics = list(self.schedule.agents)
            self.outbreak_epicenter = random.choice(all_clinics)
            return True
        return False

    def step(self):
        """Advance the model by one day"""
        self.current_day += 1
        self.active_alerts = []
        self.daily_cases = 0

        # Randomly trigger outbreak
        if not self.outbreak_active and random.random() < 0.1:  # 10% chance per day
            self.trigger_outbreak()

        # If outbreak is active, it lasts 7-14 days
        if self.outbreak_active:
            if random.random() < 0.15:  # 15% chance to end each day
                self.outbreak_active = False
                self.outbreak_epicenter = None

        # All clinics take their daily step
        self.schedule.step()

        # Collect daily statistics
        for agent in self.schedule.agents:
            self.daily_cases += agent.daily_cases

        self.total_cases += self.daily_cases

        # Store history
        self.daily_cases_history.append(self.daily_cases)
        self.alerts_history.append(len(self.active_alerts))

        # Collect data
        self.datacollector.collect(self)

    def get_state(self):
        """Get current model state for frontend"""
        clinics_data = []

        for agent in self.schedule.agents:
            clinics_data.append({
                'id': agent.unique_id,
                'name': agent.name,
                'position': agent.position,
                'daily_cases': agent.daily_cases,
                'total_cases': agent.total_cases,
                'fever_cough_cases': agent.fever_cough_cases,
                'severe_cases': agent.severe_cases,
                'status': agent.status,
                'alert_level': agent.alert_level
            })

        return {
            'day': self.current_day,
            'total_cases': self.total_cases,
            'daily_cases': self.daily_cases,
            'active_alerts': self.active_alerts,
            'outbreak_active': self.outbreak_active,
            'outbreak_epicenter': self.outbreak_epicenter.unique_id if self.outbreak_epicenter else None,
            'clinics': clinics_data,
            'daily_cases_history': self.daily_cases_history,
            'alerts_history': self.alerts_history
        }