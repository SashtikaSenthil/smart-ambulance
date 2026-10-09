
"""
AI Ambulance Assistance System
File: ai/emergency_prediction_30.py

DEMO MODE ONLY:
- Generates simulated sensor readings.
- Produces rule-based vital-sign risk flags.
- Stores the selected demo scenario separately from the assessment.
- Does not provide a confirmed medical diagnosis.
"""

import random
from datetime import datetime
from typing import Any


# --------------------------------------------------
# 1. THIRTY DEMONSTRATION SCENARIOS
# --------------------------------------------------

DEMO_SCENARIOS = [
    {"id": 1, "name": "Cardiac Emergency", "profile": "cardiac"},
    {"id": 2, "name": "Heart Attack", "profile": "cardiac"},
    {"id": 3, "name": "Arrhythmia", "profile": "irregular"},
    {"id": 4, "name": "Bradycardia", "profile": "slow"},
    {"id": 5, "name": "Tachycardia", "profile": "fast"},
    {"id": 6, "name": "Stroke", "profile": "stroke"},
    {"id": 7, "name": "Hemorrhagic Stroke", "profile": "stroke"},
    {"id": 8, "name": "Ischemic Stroke", "profile": "stroke"},
    {"id": 9, "name": "Traumatic Injury", "profile": "trauma"},
    {"id": 10, "name": "Internal Bleeding", "profile": "bleeding"},
    {"id": 11, "name": "External Bleeding", "profile": "bleeding"},
    {"id": 12, "name": "Hemorrhagic Shock", "profile": "shock"},
    {"id": 13, "name": "Hypovolemic Shock", "profile": "shock"},
    {"id": 14, "name": "Respiratory Distress", "profile": "respiratory"},
    {"id": 15, "name": "Hypoxemia", "profile": "low_oxygen"},
    {"id": 16, "name": "Pneumonia", "profile": "infection"},
    {"id": 17, "name": "Severe Asthma Attack", "profile": "respiratory"},
    {"id": 18, "name": "COPD Exacerbation", "profile": "respiratory"},
    {"id": 19, "name": "Respiratory Failure", "profile": "low_oxygen"},
    {"id": 20, "name": "Sepsis", "profile": "infection"},
    {"id": 21, "name": "Septic Shock", "profile": "shock"},
    {"id": 22, "name": "Hypothermia", "profile": "cold"},
    {"id": 23, "name": "Hyperthermia", "profile": "hot"},
    {"id": 24, "name": "Fever / Suspected Infection", "profile": "fever"},
    {"id": 25, "name": "Anemia", "profile": "anemia"},
    {"id": 26, "name": "Severe Anemia", "profile": "severe_anemia"},
    {"id": 27, "name": "Hypertensive Crisis", "profile": "high_bp"},
    {"id": 28, "name": "Hypotension", "profile": "low_bp"},
    {"id": 29, "name": "Hypoglycemia", "profile": "unknown_glucose"},
    {"id": 30, "name": "Diabetic Emergency / DKA", "profile": "unknown_glucose"},
]


# --------------------------------------------------
# 2. SIMULATED SENSOR VALUE GENERATOR
# --------------------------------------------------

def generate_sensor_values(profile: str) -> dict[str, Any]:
    """
    Values are synthetic examples for software demonstration.
    Temperature is in Fahrenheit.
    ECG is represented as a simulated status, not a waveform.
    Hb is in g/dL.
    """

    values = {
        "heart_rate": random.randint(65, 95),
        "spo2": random.randint(96, 99),
        "hb": round(random.uniform(12.0, 15.0), 1),
        "temp": round(random.uniform(97.5, 99.0), 1),
        "resp_rate": random.randint(12, 18),
        "systolic_bp": random.randint(105, 125),
        "diastolic_bp": random.randint(65, 82),
        "ecg_status": "Simulated normal rhythm",
    }

    if profile == "cardiac":
        values.update(
            heart_rate=random.randint(105, 135),
            systolic_bp=random.randint(90, 110),
            ecg_status="Simulated cardiac abnormality",
        )

    elif profile == "irregular":
        values.update(
            heart_rate=random.randint(90, 140),
            ecg_status="Simulated irregular rhythm",
        )

    elif profile == "slow":
        values.update(
            heart_rate=random.randint(35, 55),
            ecg_status="Simulated slow rhythm",
        )

    elif profile == "fast":
        values.update(
            heart_rate=random.randint(115, 150),
            ecg_status="Simulated fast rhythm",
        )

    elif profile == "stroke":
        values.update(
            systolic_bp=random.randint(150, 185),
            diastolic_bp=random.randint(85, 105),
        )

    elif profile == "trauma":
        values.update(
            heart_rate=random.randint(100, 130),
            resp_rate=random.randint(20, 28),
        )

    elif profile == "bleeding":
        values.update(
            heart_rate=random.randint(105, 140),
            systolic_bp=random.randint(80, 100),
            hb=round(random.uniform(7.0, 10.0), 1),
        )

    elif profile == "shock":
        values.update(
            heart_rate=random.randint(115, 145),
            systolic_bp=random.randint(70, 89),
            resp_rate=random.randint(24, 32),
        )

    elif profile == "respiratory":
        values.update(
            spo2=random.randint(88, 94),
            resp_rate=random.randint(24, 34),
            heart_rate=random.randint(100, 125),
        )

    elif profile == "low_oxygen":
        values.update(
            spo2=random.randint(80, 90),
            resp_rate=random.randint(24, 34),
        )

    elif profile == "infection":
        values.update(
            temp=round(random.uniform(101.0, 104.0), 1),
            heart_rate=random.randint(100, 130),
            resp_rate=random.randint(22, 30),
        )

    elif profile == "cold":
        values.update(
            temp=round(random.uniform(90.0, 95.0), 1),
            heart_rate=random.randint(45, 65),
        )

    elif profile == "hot":
        values.update(
            temp=round(random.uniform(103.0, 106.0), 1),
            heart_rate=random.randint(105, 140),
        )

    elif profile == "fever":
        values["temp"] = round(random.uniform(100.5, 103.0), 1)

    elif profile == "anemia":
        values["hb"] = round(random.uniform(8.0, 10.5), 1)

    elif profile == "severe_anemia":
        values.update(
            hb=round(random.uniform(5.0, 7.0), 1),
            heart_rate=random.randint(105, 130),
        )

    elif profile == "high_bp":
        values.update(
            systolic_bp=random.randint(180, 210),
            diastolic_bp=random.randint(120, 140),
        )

    elif profile == "low_bp":
        values.update(
            systolic_bp=random.randint(75, 89),
            diastolic_bp=random.randint(45, 59),
        )

    elif profile == "unknown_glucose":
        # Blood glucose is not measured by the listed sensors.
        # Do not fabricate a glucose reading or infer this condition.
        values["ecg_status"] = "Glucose measurement unavailable"

    values["blood_pressure"] = (
        f'{values["systolic_bp"]}/{values["diastolic_bp"]}'
    )

    return values


# --------------------------------------------------
# 3. RULE-BASED VITAL SIGN RISK FLAGS
# --------------------------------------------------

def analyze_vitals(sensors: dict[str, Any]) -> dict[str, Any]:
    """
    Flags unusual readings for demonstration.
    These thresholds are illustrative, not a clinical protocol.
    """

    flags = []

    hr = sensors["heart_rate"]
    spo2 = sensors["spo2"]
    hb = sensors["hb"]
    temp = sensors["temp"]
    rr = sensors["resp_rate"]
    sbp = sensors["systolic_bp"]
    dbp = sensors["diastolic_bp"]
    ecg = sensors["ecg_status"].lower()

    if spo2 < 90:
        flags.append("Very low SpO2 reading")
    elif spo2 < 95:
        flags.append("Low SpO2 reading")

    if hr < 50:
        flags.append("Slow heart rate")
    elif hr > 120:
        flags.append("Very fast heart rate")
    elif hr > 100:
        flags.append("Fast heart rate")

    if sbp < 90:
        flags.append("Low systolic blood pressure")

    if sbp >= 180 or dbp >= 120:
        flags.append("Severely elevated blood pressure")

    if rr < 10:
        flags.append("Low respiration rate")
    elif rr > 24:
        flags.append("High respiration rate")

    if temp < 95:
        flags.append("Low body temperature")
    elif temp >= 103:
        flags.append("Very high body temperature")
    elif temp >= 100.4:
        flags.append("Fever-range temperature")

    if hb < 7:
        flags.append("Very low hemoglobin reading")
    elif hb < 10:
        flags.append("Low hemoglobin reading")

    if "irregular" in ecg or "abnormality" in ecg:
        flags.append("Simulated ECG abnormality requires review")

    if not flags:
        flags.append("No threshold flags detected in the simulated readings")

    # Risk score is a simple demonstration score, not a validated
    # clinical score or a probability of disease.
    critical_flags = sum(
        1 for flag in flags
        if any(word in flag.lower() for word in (
            "very low spo2",
            "low systolic",
            "severely elevated",
            "very high body",
            "very low hemoglobin",
        ))
    )

    if critical_flags >= 1:
        risk_level = "HIGH"
    elif len(flags) >= 2:
        risk_level = "MODERATE"
    else:
        risk_level = "LOW"

    return {
        "risk_level": risk_level,
        "indicators": flags,
        "flag_count": len(flags),
        "assessment_note": (
            "Rule-based demonstration assessment only. "
            "This is not a confirmed diagnosis."
        ),
    }


# --------------------------------------------------
# 4. GENERATE ONE COMPLETE ASSESSMENT
# --------------------------------------------------

def generate_assessment(
    scenario_id: int | None = None,
) -> dict[str, Any]:
    """
    Generate one consistent assessment for the dashboard and reports.

    Pass scenario_id to demonstrate a specific scenario.
    Leave it as None to select a random scenario.
    """

    if scenario_id is None:
        scenario = random.choice(DEMO_SCENARIOS)
    else:
        scenario = next(
            (
                item for item in DEMO_SCENARIOS
                if item["id"] == scenario_id
            ),
            None,
        )

        if scenario is None:
            raise ValueError(
                f"Invalid scenario_id: {scenario_id}. "
                "Choose a number from 1 to 30."
            )

    sensors = generate_sensor_values(scenario["profile"])
    analysis = analyze_vitals(sensors)

    return {
        "assessment_id": (
            datetime.now().strftime("%Y%m%d%H%M%S%f")
        ),
        "timestamp": datetime.now().astimezone().isoformat(
            timespec="seconds"
        ),
        "mode": "DEMO",
        "scenario": {
            "id": scenario["id"],
            "name": scenario["name"],
        },
        "sensors": sensors,
        "analysis": analysis,
        "prediction": {
            # This is the selected demo scenario, not a disease
            # independently diagnosed from the sensor readings.
            "demo_scenario": scenario["name"],
            "risk_level": analysis["risk_level"],
            "indicators": analysis["indicators"],
            "diagnosis_confirmed": False,
        },
    }


# --------------------------------------------------
# 5. OPTIONAL COMMAND-LINE TEST
# --------------------------------------------------

if __name__ == "__main__":
    import json

    result = generate_assessment()
    print(json.dumps(result, indent=4))
