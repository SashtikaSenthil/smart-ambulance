from ai.hybrid_engine import hybrid_decision


sensors = {
    "heart_rate": "95 BPM",
    "spo2": "96%",
    "ecg_status": "Normal",
    "temp": "98.2°F",
    "resp_rate": "18 RR",
    "blood_pressure": "125/80 mmHg",
}

patient = {
    "past_conditions": "None",
}

camera_flags = {
    "possible_bleeding": True,
    "no_movement_detected": False,
}

result = hybrid_decision(sensors, patient, camera_flags)

print(result)
