import re


def _first_number(value, default=0):
    match = re.search(r"-?\d+(?:\.\d+)?", str(value or ""))
    if not match:
        return default
    number = float(match.group(0))
    return int(round(number))


def _assign_label(hr, spo2, bp_sys, resp, ecg_tachy, history_risk, bp_change_last_5_min=0, shock_index=0.0):
    if shock_index > 1.0:
        return "Shock / Severe Critical Condition", 97
    if ecg_tachy == 1 and hr > 110 and bp_sys > 140:
        return "Undifferentiated Chest Pain/Tachycardia", 95
    if bp_sys > 170 and history_risk == 1:
        return "Acute Neurological Deficit", 93
    if bp_change_last_5_min <= -10 and hr > 105:
        return "Prepare for Shock", 94
    if spo2 < 92 and resp > 22:
        return "Respiratory Distress", 92
    if hr > 115 and bp_sys < 95:
        return "Shock / Severe Critical Condition", 96
    if bp_sys < 90 and hr > 105:
        return "Suspected Internal Bleeding", 91
    if hr > 100 and bp_sys > 100 and resp > 20:
        return "Trauma / Accident Severity", 88
    if history_risk == 1 and spo2 > 95 and hr < 95:
        return "Metabolic Emergency", 86
    if hr < 95 and spo2 > 96 and bp_sys > 110:
        return "Stable Condition", 90
    return "Suspected Fracture / Ligament Injury", 82


def predict_risk_ml(sensors, patient, anonymous_mode=False):
    hr = _first_number(sensors.get("heart_rate"), default=80)
    spo2 = _first_number(sensors.get("spo2"), default=97)
    bp_sys = _first_number(str(sensors.get("blood_pressure", "120/80")).split("/")[0], default=120)
    resp = _first_number(sensors.get("resp_rate"), default=16)

    ecg_tachy = 1 if "tachy" in str(sensors.get("ecg_status", "")).lower() else 0
    past_conditions_raw = str(patient.get("past_conditions", "") or "").strip()
    past_conditions = past_conditions_raw.lower()
    history_unknown = anonymous_mode or past_conditions in ("", "unknown", "none", "n/a")
    history_risk = 0 if history_unknown else 1 if ("hypertension" in past_conditions or "diabetes" in past_conditions) else 0

    bp_change_last_5_min = _first_number(sensors.get("bp_change_last_5_min"), default=0)
    shock_index = (hr / bp_sys) if bp_sys > 0 else 0.0

    label, confidence = _assign_label(
        hr,
        spo2,
        bp_sys,
        resp,
        ecg_tachy,
        history_risk,
        bp_change_last_5_min=bp_change_last_5_min,
        shock_index=shock_index,
    )

    vigilance_factor = 1.0
    if history_unknown:
        vigilance_factor += 0.15
    if shock_index > 0.9:
        vigilance_factor += 0.1
    if bp_change_last_5_min <= -10:
        vigilance_factor += 0.05
    adjusted_confidence = min(99.0, confidence * vigilance_factor)

    return {
        "ml_risk": label,
        "confidence": f"{adjusted_confidence:.2f}%",
        "vigilance_factor": round(vigilance_factor, 2),
        "history_unavailable": history_unknown,
        "shock_index": round(shock_index, 2)
    }
