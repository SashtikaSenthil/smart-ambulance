import re
from camera_ai.diagnostic_engine import generate_diagnosis


RISK_ORDER = ["Low", "Medium", "High"]


def _parse_first_number(value):
    matches = re.findall(r"-?\d+(?:\.\d+)?", str(value or ""))
    if not matches:
        return None
    return float(matches[0])


def _parse_bp(value):
    text = str(value or "")
    match = re.search(r"(\d+)\s*/\s*(\d+)", text)
    if not match:
        return None, None
    return int(match.group(1)), int(match.group(2))


def _normalize_risk(value):
    text = str(value or "Pending").strip().title()
    if text not in ("Low", "Medium", "High"):
        return "Low"
    return text


def _risk_max(*levels):
    highest = "Low"
    for level in levels:
        level = _normalize_risk(level)
        if RISK_ORDER.index(level) > RISK_ORDER.index(highest):
            highest = level
    return highest


def _risk_raise(level, steps=1):
    level = _normalize_risk(level)
    idx = min(RISK_ORDER.index(level) + max(steps, 0), len(RISK_ORDER) - 1)
    return RISK_ORDER[idx]


def _sensor_risk_level(metric_name, value):
    if value is None:
        return "Low"

    if metric_name == "heart_rate":
        if value < 45 or value > 140:
            return "High"
        if value < 55 or value > 120:
            return "Medium"
        return "Low"

    if metric_name == "spo2":
        if value < 90:
            return "High"
        if value < 94:
            return "Medium"
        return "Low"

    if metric_name == "resp_rate":
        if value < 10 or value > 30:
            return "High"
        if value < 12 or value > 24:
            return "Medium"
        return "Low"

    if metric_name == "temp_f":
        if value < 95 or value > 103:
            return "High"
        if value < 96.8 or value > 100.4:
            return "Medium"
        return "Low"

    if metric_name == "systolic_bp":
        if value < 90 or value > 180:
            return "High"
        if value < 100 or value > 160:
            return "Medium"
        return "Low"

    return "Low"


def _ecg_risk_level(ecg_text):
    text = str(ecg_text or "").lower()
    high_keywords = [
        "asystole",
        "vfib",
        "vtach",
        "ventricular",
        "fibrillation",
        "abnormal",
        "irregular",
        "possible_arrhythmia",
    ]
    medium_keywords = [
        "sinus tachycardia",
        "sinus bradycardia",
        "tachycardia",
        "bradycardia",
        "possible",
        "borderline",
        "monitor",
    ]

    if any(keyword in text for keyword in high_keywords):
        return "High"
    if any(keyword in text for keyword in medium_keywords):
        return "Medium"
    return "Low"


def _build_sensor_profile(sensors):
    heart_rate = _parse_first_number(sensors.get("heart_rate"))
    spo2 = _parse_first_number(sensors.get("spo2"))
    resp_rate = _parse_first_number(sensors.get("resp_rate"))
    temp_value = _parse_first_number(sensors.get("temp"))
    temp_f = None
    if temp_value is not None:
        if temp_value <= 45:
            temp_f = (temp_value * 9 / 5) + 32
        else:
            temp_f = temp_value
    systolic_bp, diastolic_bp = _parse_bp(sensors.get("blood_pressure"))

    profile = {
        "heart_rate": {"value": heart_rate, "risk": _sensor_risk_level("heart_rate", heart_rate)},
        "spo2": {"value": spo2, "risk": _sensor_risk_level("spo2", spo2)},
        "resp_rate": {"value": resp_rate, "risk": _sensor_risk_level("resp_rate", resp_rate)},
        "temp_f": {"value": temp_f, "risk": _sensor_risk_level("temp_f", temp_f)},
        "systolic_bp": {"value": systolic_bp, "risk": _sensor_risk_level("systolic_bp", systolic_bp)},
        "diastolic_bp": {"value": diastolic_bp, "risk": "Low"},
        "ecg": {"value": sensors.get("ecg_status"), "risk": _ecg_risk_level(sensors.get("ecg_status"))},
    }

    overall_sensor_risk = _risk_max(
        profile["heart_rate"]["risk"],
        profile["spo2"]["risk"],
        profile["resp_rate"]["risk"],
        profile["temp_f"]["risk"],
        profile["systolic_bp"]["risk"],
        profile["ecg"]["risk"],
    )

    return profile, overall_sensor_risk


def build_combined_diagnosis(camera_report, sensors, anonymous_mode=False):
    camera_report = camera_report or {}
    sensors = sensors or {}

    bleeding_risk = _normalize_risk(camera_report.get("bleeding_risk", "Low"))
    movement_risk = _normalize_risk(camera_report.get("movement_risk", "Low"))
    posture_risk = _normalize_risk(camera_report.get("posture_risk", "Low"))

    sensor_profile, overall_sensor_risk = _build_sensor_profile(sensors)

    hypoxia_or_resp = _risk_max(sensor_profile["spo2"]["risk"], sensor_profile["resp_rate"]["risk"])
    circulation_risk = _risk_max(sensor_profile["heart_rate"]["risk"], sensor_profile["systolic_bp"]["risk"], sensor_profile["ecg"]["risk"])

    fused_bleeding = bleeding_risk
    fused_movement = movement_risk
    fused_posture = posture_risk

    if movement_risk == "High" or posture_risk == "High":
        fused_posture = _risk_max(fused_posture, "High")
        fused_movement = _risk_max(fused_movement, "High")

    if hypoxia_or_resp == "High":
        fused_movement = _risk_max(fused_movement, "High")
    elif hypoxia_or_resp == "Medium":
        fused_movement = _risk_max(fused_movement, "Medium")

    if circulation_risk == "High":
        fused_posture = _risk_max(fused_posture, "High")
    elif circulation_risk == "Medium":
        fused_posture = _risk_max(fused_posture, "Medium")

    systolic = sensor_profile["systolic_bp"]["value"]
    heart_rate = sensor_profile["heart_rate"]["value"]
    possible_shock = (
        systolic is not None and heart_rate is not None and systolic < 100 and heart_rate > 110
    )
    if possible_shock:
        fused_bleeding = _risk_raise(fused_bleeding, steps=1)

    high_risk_count = sum(
        1 for metric in sensor_profile.values() if metric.get("risk") == "High"
    )
    if high_risk_count >= 2:
        fused_posture = _risk_max(fused_posture, "High")
    elif high_risk_count == 1 and overall_sensor_risk == "High":
        fused_posture = _risk_max(fused_posture, "Medium")

    diagnosis = generate_diagnosis(
        fused_bleeding,
        fused_movement,
        fused_posture,
        anonymous_mode=anonymous_mode,
    )

    diagnosis["fusion_inputs"] = {
        "camera": {
            "bleeding_risk": bleeding_risk,
            "movement_risk": movement_risk,
            "posture_risk": posture_risk,
        },
        "sensors": {
            "overall_sensor_risk": overall_sensor_risk,
            "profile": sensor_profile,
            "raw": sensors,
        },
        "fused_camera_risks": {
            "bleeding_risk": fused_bleeding,
            "movement_risk": fused_movement,
            "posture_risk": fused_posture,
        },
    }

    return diagnosis
