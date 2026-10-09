"""
AI Ambulance Assistance System
File: ai/vitals_summary_engine.py

Rule-based live clinical summary producer.

Given the current vital signs (and optionally the previous readings), this
module produces a detailed, deterministic summary:
  1. Per-vital interpretation bands
  2. Derived haemodynamic indices (MAP, pulse pressure, shock indices, CaO2)
  3. Early-warning scores (NEWS2-style, qSOFA, SIRS - partial, vitals only)
  4. Syndrome / pattern recognition with evidence and actions
  5. Trend analysis over the recent history window
  6. Overall risk, triage colour, narrative, actions and an SBAR handoff

DEMO / DECISION SUPPORT ONLY - thresholds are illustrative adult values,
not a validated clinical protocol and not a confirmed diagnosis.
"""

from datetime import datetime
from typing import Any


RISK_LEVELS = ["Low", "Moderate", "High", "Critical"]

TRIAGE = {
    "Low": "Green",
    "Moderate": "Yellow",
    "High": "Orange",
    "Critical": "Red",
}

MONITORING_INTERVAL = {
    "Critical": "Continuous monitoring; repeat full vital set every 1-2 minutes",
    "High": "Continuous ECG/SpO2; repeat full vital set every 5 minutes",
    "Moderate": "Repeat full vital set every 15 minutes",
    "Low": "Repeat full vital set every 30 minutes",
}

# Vital-level severity -> contribution to overall risk.
SEVERITY_TO_RISK = {
    "normal": "Low",
    "mild": "Low",
    "moderate": "Moderate",
    "severe": "High",
    "critical": "Critical",
}

SEVERITY_ORDER = ["normal", "mild", "moderate", "severe", "critical"]

# Normal ranges used for trend direction (worsening = moving away from range).
NORMAL_RANGES = {
    "heart_rate": (60, 100),
    "spo2": (95, 100),
    "systolic_bp": (100, 139),
    "resp_rate": (12, 20),
    "temp": (96.8, 100.3),
    "hb": (12.0, 17.5),
}

# Smallest change considered clinically meaningful for trend reporting.
TREND_THRESHOLDS = {
    "heart_rate": 10,
    "spo2": 2,
    "systolic_bp": 10,
    "resp_rate": 3,
    "temp": 0.5,
    "hb": 0.5,
}

TREND_LABELS = {
    "heart_rate": ("Heart rate", "bpm"),
    "spo2": ("SpO2", "%"),
    "systolic_bp": ("Systolic BP", "mmHg"),
    "resp_rate": ("Respiratory rate", "/min"),
    "temp": ("Temperature", "°F"),
    "hb": ("Haemoglobin", "g/dL"),
}

TREND_WINDOW_SECONDS = 60


# --------------------------------------------------
# Helpers
# --------------------------------------------------

def _risk_max(*levels: str) -> str:
    return max(levels, key=RISK_LEVELS.index) if levels else "Low"


def _num(value: Any, default: float | None = None) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _fmt(value: float, decimals: int = 0) -> str:
    return f"{value:.{decimals}f}"


def _f_to_c(temp_f: float) -> float:
    return (temp_f - 32) * 5 / 9


def _dedupe(items: list[str]) -> list[str]:
    seen = set()
    result = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            result.append(item)
    return result


# --------------------------------------------------
# 1. Per-vital interpretation
# --------------------------------------------------

def _vital(key, label, display, band, severity, interpretation):
    return {
        "key": key,
        "label": label,
        "display": display,
        "band": band,
        "severity": severity,
        "abnormal": severity != "normal",
        "interpretation": interpretation,
    }


def _classify_heart_rate(hr: float) -> dict:
    d = f"{_fmt(hr)} bpm"
    if hr < 40:
        return _vital("heart_rate", "Heart rate", d, "Critical bradycardia", "critical",
                      f"Heart rate {d} is critically slow; risk of inadequate cardiac output and arrest.")
    if hr < 50:
        return _vital("heart_rate", "Heart rate", d, "Severe bradycardia", "severe",
                      f"Heart rate {d} is markedly slow; assess for heart block, drugs, hypothermia or raised intracranial pressure.")
    if hr < 60:
        return _vital("heart_rate", "Heart rate", d, "Mild bradycardia", "mild",
                      f"Heart rate {d} is mildly slow; often benign but correlate with perfusion and rhythm.")
    if hr <= 100:
        return _vital("heart_rate", "Heart rate", d, "Normal", "normal",
                      f"Heart rate {d} is within the normal adult range.")
    if hr <= 120:
        return _vital("heart_rate", "Heart rate", d, "Tachycardia", "moderate",
                      f"Heart rate {d} is elevated, consistent with pain, stress, fever, hypovolaemia or hypoxia.")
    if hr <= 140:
        return _vital("heart_rate", "Heart rate", d, "Marked tachycardia", "severe",
                      f"Heart rate {d} is markedly elevated; compensatory response to shock, sepsis or hypoxia must be excluded.")
    return _vital("heart_rate", "Heart rate", d, "Critical tachycardia", "critical",
                  f"Heart rate {d} is critically fast; diastolic filling and cardiac output may be compromised - consider tachyarrhythmia.")


def _classify_spo2(spo2: float) -> dict:
    d = f"{_fmt(spo2)}%"
    if spo2 >= 95:
        return _vital("spo2", "SpO2", d, "Normal", "normal",
                      f"Oxygen saturation {d} indicates adequate oxygenation.")
    if spo2 >= 92:
        return _vital("spo2", "SpO2", d, "Mild hypoxaemia", "mild",
                      f"Oxygen saturation {d} is mildly reduced; monitor closely and consider supplemental oxygen.")
    if spo2 >= 88:
        return _vital("spo2", "SpO2", d, "Moderate hypoxaemia", "moderate",
                      f"Oxygen saturation {d} indicates significant hypoxaemia requiring supplemental oxygen.")
    if spo2 >= 85:
        return _vital("spo2", "SpO2", d, "Severe hypoxaemia", "severe",
                      f"Oxygen saturation {d} is severely reduced; tissue hypoxia is likely.")
    return _vital("spo2", "SpO2", d, "Critical hypoxaemia", "critical",
                  f"Oxygen saturation {d} is critically low; immediate airway and ventilation support may be needed.")


def _classify_blood_pressure(sbp: float, dbp: float) -> dict:
    d = f"{_fmt(sbp)}/{_fmt(dbp)} mmHg"
    if sbp < 70:
        return _vital("blood_pressure", "Blood pressure", d, "Critical hypotension", "critical",
                      f"Blood pressure {d} is critically low; vital organ perfusion is at immediate risk.")
    if sbp < 90:
        return _vital("blood_pressure", "Blood pressure", d, "Hypotension", "severe",
                      f"Blood pressure {d} is below 90 mmHg systolic, consistent with circulatory compromise.")
    if sbp >= 220 or dbp >= 130:
        return _vital("blood_pressure", "Blood pressure", d, "Hypertensive crisis (extreme)", "critical",
                      f"Blood pressure {d} is extremely high; high risk of acute end-organ damage.")
    if sbp >= 180 or dbp >= 120:
        return _vital("blood_pressure", "Blood pressure", d, "Hypertensive crisis", "severe",
                      f"Blood pressure {d} is in the hypertensive-crisis range; screen for stroke, ACS, aortic or renal emergency.")
    if sbp >= 160 or dbp >= 100:
        return _vital("blood_pressure", "Blood pressure", d, "Severe hypertension", "moderate",
                      f"Blood pressure {d} is severely elevated; may reflect pain/anxiety but requires neurological and cardiac screening.")
    if sbp >= 140 or dbp >= 90:
        return _vital("blood_pressure", "Blood pressure", d, "Hypertension", "mild",
                      f"Blood pressure {d} is elevated.")
    if sbp < 100:
        return _vital("blood_pressure", "Blood pressure", d, "Borderline low", "mild",
                      f"Systolic pressure in {d} is borderline low; watch for a downward trend.")
    return _vital("blood_pressure", "Blood pressure", d, "Normal", "normal",
                  f"Blood pressure {d} is within the normal range.")


def _classify_resp_rate(rr: float) -> dict:
    d = f"{_fmt(rr)} breaths/min"
    if rr < 8:
        return _vital("resp_rate", "Respiratory rate", d, "Critical bradypnoea", "critical",
                      f"Respiratory rate {d} is critically low; risk of hypoventilation and respiratory arrest.")
    if rr < 12:
        return _vital("resp_rate", "Respiratory rate", d, "Bradypnoea", "moderate",
                      f"Respiratory rate {d} is low; consider sedation/opioid effect, head injury or fatigue.")
    if rr <= 20:
        return _vital("resp_rate", "Respiratory rate", d, "Normal", "normal",
                      f"Respiratory rate {d} is within normal limits.")
    if rr <= 24:
        return _vital("resp_rate", "Respiratory rate", d, "Mild tachypnoea", "mild",
                      f"Respiratory rate {d} is mildly raised; early sign of physiological stress.")
    if rr < 30:
        return _vital("resp_rate", "Respiratory rate", d, "Tachypnoea", "moderate",
                      f"Respiratory rate {d} indicates increased work of breathing or metabolic compensation.")
    if rr < 40:
        return _vital("resp_rate", "Respiratory rate", d, "Severe tachypnoea", "severe",
                      f"Respiratory rate {d} is severely raised; impending respiratory fatigue is possible.")
    return _vital("resp_rate", "Respiratory rate", d, "Critical tachypnoea", "critical",
                  f"Respiratory rate {d} is critically high; ventilation is likely ineffective.")


def _classify_temperature(temp: float) -> dict:
    d = f"{_fmt(temp, 1)}°F ({_fmt(_f_to_c(temp), 1)}°C)"
    if temp < 90:
        return _vital("temp", "Temperature", d, "Severe hypothermia", "critical",
                      f"Temperature {d} indicates severe hypothermia; high risk of ventricular arrhythmia.")
    if temp < 95:
        return _vital("temp", "Temperature", d, "Hypothermia", "severe",
                      f"Temperature {d} indicates hypothermia; impairs coagulation and cardiac function.")
    if temp < 96.8:
        return _vital("temp", "Temperature", d, "Low temperature", "mild",
                      f"Temperature {d} is below normal; prevent further heat loss.")
    if temp < 100.4:
        return _vital("temp", "Temperature", d, "Normal", "normal",
                      f"Temperature {d} is within normal limits.")
    if temp < 102:
        return _vital("temp", "Temperature", d, "Fever", "mild",
                      f"Temperature {d} is in the fever range, suggesting an inflammatory or infective process.")
    if temp < 104:
        return _vital("temp", "Temperature", d, "High fever", "moderate",
                      f"Temperature {d} is a high fever; increases metabolic demand and heart rate.")
    if temp < 106:
        return _vital("temp", "Temperature", d, "Hyperpyrexia", "severe",
                      f"Temperature {d} is dangerously high; consider heat stroke, severe sepsis or drug toxicity.")
    return _vital("temp", "Temperature", d, "Critical hyperthermia", "critical",
                  f"Temperature {d} is life-threatening; risk of multi-organ failure.")


def _classify_hb(hb: float) -> dict:
    d = f"{_fmt(hb, 1)} g/dL"
    if hb < 6:
        return _vital("hb", "Haemoglobin", d, "Critical anaemia", "critical",
                      f"Haemoglobin {d} is critically low; oxygen-carrying capacity is severely reduced.")
    if hb < 7:
        return _vital("hb", "Haemoglobin", d, "Severe anaemia", "severe",
                      f"Haemoglobin {d} is below the usual transfusion threshold.")
    if hb < 10:
        return _vital("hb", "Haemoglobin", d, "Moderate anaemia", "moderate",
                      f"Haemoglobin {d} is moderately low; consider blood loss or chronic anaemia.")
    if hb < 12:
        return _vital("hb", "Haemoglobin", d, "Mild anaemia", "mild",
                      f"Haemoglobin {d} is mildly low.")
    if hb > 18:
        return _vital("hb", "Haemoglobin", d, "Raised haemoglobin", "mild",
                      f"Haemoglobin {d} is high; consider dehydration or polycythaemia.")
    return _vital("hb", "Haemoglobin", d, "Normal", "normal",
                  f"Haemoglobin {d} is within normal limits.")


def _classify_ecg(ecg_status: str, hr: float) -> dict:
    text = str(ecg_status or "").lower()
    d = str(ecg_status or "Not available")
    if "glucose" in text:
        return _vital("ecg", "ECG / rhythm", d, "Rhythm not reported", "mild",
                      "No rhythm classification reported; blood glucose is not measured by the sensor set - obtain a capillary glucose.")
    if "abnormal" in text:
        return _vital("ecg", "ECG / rhythm", d, "Cardiac abnormality", "severe",
                      "Reported ECG abnormality; acute coronary syndrome or conduction disturbance must be excluded with a 12-lead ECG.")
    if "irregular" in text or "arrhythm" in text or "fibrillation" in text:
        return _vital("ecg", "ECG / rhythm", d, "Irregular rhythm", "moderate" if hr <= 120 else "severe",
                      "Irregular rhythm reported; possible atrial fibrillation or ectopy - correlate with pulse deficit and perfusion.")
    if "slow" in text or "brady" in text:
        return _vital("ecg", "ECG / rhythm", d, "Slow rhythm", "moderate" if hr >= 45 else "severe",
                      "Slow rhythm reported; assess for heart block, drug effect or vagal/raised-ICP cause.")
    if "fast" in text or "tachy" in text:
        return _vital("ecg", "ECG / rhythm", d, "Fast rhythm", "moderate" if hr <= 150 else "severe",
                      "Fast rhythm reported; distinguish sinus tachycardia from SVT/VT on a 12-lead ECG.")
    return _vital("ecg", "ECG / rhythm", d, "Normal rhythm", "normal",
                  "No rhythm abnormality reported.")


# --------------------------------------------------
# 2. Derived indices
# --------------------------------------------------

def _derived_indices(hr, sbp, dbp, spo2, hb) -> dict:
    map_value = (sbp + 2 * dbp) / 3
    pulse_pressure = sbp - dbp
    shock_index = hr / sbp if sbp > 0 else 0.0
    modified_shock_index = hr / map_value if map_value > 0 else 0.0
    oxygen_content = 1.34 * hb * (spo2 / 100)

    if map_value < 60:
        map_note = "Critically low - organ perfusion at risk"
    elif map_value < 65:
        map_note = "Below 65 mmHg perfusion target"
    elif map_value > 130:
        map_note = "Very high - risk of end-organ injury"
    else:
        map_note = "Adequate for organ perfusion"

    if pulse_pressure < 25:
        pp_note = "Narrow - suggests reduced stroke volume / vasoconstriction"
    elif pulse_pressure > 60:
        pp_note = "Wide - consider vasodilation, sepsis, aortic regurgitation or raised ICP"
    else:
        pp_note = "Normal"

    if shock_index >= 1.4:
        si_note = "Severely elevated - high likelihood of significant haemodynamic compromise"
    elif shock_index >= 1.0:
        si_note = "Elevated - consistent with shock physiology"
    elif shock_index > 0.9:
        si_note = "Borderline elevated - possible occult hypoperfusion"
    else:
        si_note = "Normal (0.5-0.9)"

    if modified_shock_index > 1.3:
        msi_note = "Elevated - poor perfusion relative to heart rate"
    elif modified_shock_index < 0.7:
        msi_note = "Low - may indicate hyperdynamic or hypertensive state"
    else:
        msi_note = "Normal (0.7-1.3)"

    if oxygen_content < 12:
        cao2_note = "Low estimated arterial O2 content"
    elif oxygen_content < 15:
        cao2_note = "Reduced estimated arterial O2 content"
    else:
        cao2_note = "Adequate estimated arterial O2 content"

    return {
        "map": {"value": round(map_value), "unit": "mmHg", "label": "Mean arterial pressure", "note": map_note},
        "pulse_pressure": {"value": round(pulse_pressure), "unit": "mmHg", "label": "Pulse pressure", "note": pp_note},
        "shock_index": {"value": round(shock_index, 2), "unit": "", "label": "Shock index (HR/SBP)", "note": si_note},
        "modified_shock_index": {"value": round(modified_shock_index, 2), "unit": "", "label": "Modified shock index (HR/MAP)", "note": msi_note},
        "oxygen_content": {"value": round(oxygen_content, 1), "unit": "mL O2/dL (est.)", "label": "Arterial O2 content", "note": cao2_note},
    }


# --------------------------------------------------
# 3. Early-warning scores
# --------------------------------------------------

def _news2_score(hr, spo2, sbp, rr, temp_f) -> dict:
    temp_c = _f_to_c(temp_f)
    parts = {}

    if rr <= 8:
        parts["Respiratory rate"] = 3
    elif rr <= 11:
        parts["Respiratory rate"] = 1
    elif rr <= 20:
        parts["Respiratory rate"] = 0
    elif rr <= 24:
        parts["Respiratory rate"] = 2
    else:
        parts["Respiratory rate"] = 3

    if spo2 <= 91:
        parts["SpO2"] = 3
    elif spo2 <= 93:
        parts["SpO2"] = 2
    elif spo2 <= 95:
        parts["SpO2"] = 1
    else:
        parts["SpO2"] = 0

    if sbp <= 90:
        parts["Systolic BP"] = 3
    elif sbp <= 100:
        parts["Systolic BP"] = 2
    elif sbp <= 110:
        parts["Systolic BP"] = 1
    elif sbp <= 219:
        parts["Systolic BP"] = 0
    else:
        parts["Systolic BP"] = 3

    if hr <= 40:
        parts["Heart rate"] = 3
    elif hr <= 50:
        parts["Heart rate"] = 1
    elif hr <= 90:
        parts["Heart rate"] = 0
    elif hr <= 110:
        parts["Heart rate"] = 1
    elif hr <= 130:
        parts["Heart rate"] = 2
    else:
        parts["Heart rate"] = 3

    if temp_c <= 35.0:
        parts["Temperature"] = 3
    elif temp_c <= 36.0:
        parts["Temperature"] = 1
    elif temp_c <= 38.0:
        parts["Temperature"] = 0
    elif temp_c <= 39.0:
        parts["Temperature"] = 1
    else:
        parts["Temperature"] = 2

    total = sum(parts.values())
    red_flag = any(points == 3 for points in parts.values())

    if total >= 7:
        band, risk = "High", "High"
    elif total >= 5:
        band, risk = "Medium", "Moderate"
    elif red_flag:
        band, risk = "Low-Medium (single parameter red flag)", "Moderate"
    else:
        band, risk = "Low", "Low"

    return {
        "score": total,
        "max_measured": 15,
        "band": band,
        "risk": risk,
        "components": parts,
        "red_flag": red_flag,
        "note": "Partial NEWS2: consciousness level and supplemental oxygen are not captured by the sensor set.",
    }


def _qsofa_score(rr, sbp) -> dict:
    criteria = []
    if rr >= 22:
        criteria.append(f"Respiratory rate ≥22 ({_fmt(rr)}/min)")
    if sbp <= 100:
        criteria.append(f"Systolic BP ≤100 ({_fmt(sbp)} mmHg)")
    return {
        "score": len(criteria),
        "max_measured": 2,
        "criteria": criteria,
        "note": "Partial qSOFA: altered mentation is not measured.",
    }


def _sirs_score(hr, rr, temp_f) -> dict:
    criteria = []
    if temp_f > 100.4 or temp_f < 96.8:
        criteria.append(f"Temperature {_fmt(temp_f, 1)}°F outside 96.8-100.4°F")
    if hr > 90:
        criteria.append(f"Heart rate >90 ({_fmt(hr)} bpm)")
    if rr > 20:
        criteria.append(f"Respiratory rate >20 ({_fmt(rr)}/min)")
    return {
        "score": len(criteria),
        "max_measured": 3,
        "criteria": criteria,
        "note": "Vital-sign SIRS criteria only (white cell count not available).",
    }


# --------------------------------------------------
# 4. Pattern recognition
# --------------------------------------------------

def _pattern(pid, title, severity, evidence, interpretation, actions, team=None):
    return {
        "id": pid,
        "title": title,
        "severity": severity,
        "evidence": evidence,
        "interpretation": interpretation,
        "actions": actions,
        "receiving_team": team,
    }


def _detect_patterns(v: dict, idx: dict, scores: dict, ecg_vital: dict, history_text: str) -> list[dict]:
    hr, spo2, sbp, dbp = v["heart_rate"], v["spo2"], v["systolic_bp"], v["diastolic_bp"]
    rr, temp, hb = v["resp_rate"], v["temp"], v["hb"]
    map_value = idx["map"]["value"]
    si = idx["shock_index"]["value"]
    sirs = scores["sirs"]["score"]
    qsofa = scores["qsofa"]["score"]
    ecg_band = ecg_vital["band"]
    ecg_abnormal = ecg_vital["severity"] in ("moderate", "severe", "critical")
    temp_abnormal = temp > 100.4 or temp < 96.8

    patterns = []

    # 1-2. Shock
    haemorrhagic = hb < 10
    septic = sirs >= 2 and temp_abnormal
    cardiogenic = ecg_abnormal or hr < 50
    subtypes = []
    if haemorrhagic:
        subtypes.append(f"haemorrhagic / hypovolaemic (Hb {_fmt(hb, 1)} g/dL)")
    if septic:
        subtypes.append(f"septic / distributive (SIRS {sirs}/3, temperature {_fmt(temp, 1)}°F)")
    if cardiogenic:
        subtypes.append(f"cardiogenic / arrhythmic ({ecg_band})")
    if not subtypes:
        subtypes.append("hypovolaemic or distributive - mechanism to be clarified")

    shock_actions = ["Two large-bore IV/IO cannulae"]
    if cardiogenic and not (haemorrhagic or septic):
        shock_actions.append("Cautious small fluid boluses only - auscultate for pulmonary oedema after each")
    else:
        shock_actions.append("Fluid bolus per protocol and reassess after each bolus")
    if haemorrhagic or not (septic or cardiogenic):
        shock_actions.append("Control any external haemorrhage; consider tranexamic acid per trauma protocol")
    if septic:
        shock_actions.append("Septic picture - pre-alert sepsis pathway (cultures, lactate, early antibiotics)")
    if cardiogenic:
        shock_actions.append("12-lead ECG; treat rhythm disturbance per ACLS")

    decompensated = sbp < 90 or map_value < 65
    if decompensated:
        evidence = [f"Systolic BP {_fmt(sbp)} mmHg", f"MAP {map_value} mmHg", f"Shock index {si}", f"Heart rate {_fmt(hr)} bpm"]
        severity = "Critical" if hr > 100 or si >= 1.4 or map_value < 60 or sbp < 80 else "High"
        patterns.append(_pattern(
            "shock", "Circulatory shock (decompensated)", severity, evidence,
            "Blood pressure has fallen below perfusion thresholds, indicating inadequate tissue perfusion. "
            "Most likely mechanism: " + "; ".join(subtypes) + ".",
            [
                "Lay patient flat with legs raised if not breathless and no contraindication",
                *shock_actions,
                "Repeat BP every 2-3 minutes; aim for SBP ≥90 mmHg / MAP ≥65 mmHg (permissive targets in trauma per protocol)",
                "Pre-alert resuscitation bay; request blood products if haemorrhage suspected",
            ],
            team="Resuscitation / trauma team",
        ))
    elif si > 0.9 and hr > 100:
        patterns.append(_pattern(
            "compensated_shock", "Compensated shock / occult hypoperfusion", "High" if si >= 1.0 else "Moderate",
            [f"Shock index {si}", f"Heart rate {_fmt(hr)} bpm", f"Systolic BP {_fmt(sbp)} mmHg (still maintained)"],
            "Blood pressure is still maintained but the heart rate is disproportionately high; compensatory "
            "mechanisms may fail suddenly. Possible mechanism: " + "; ".join(subtypes) + ".",
            [
                *shock_actions,
                "Repeat BP and heart rate every 5 minutes and watch for a falling trend",
            ],
            team="Emergency department - resuscitation area",
        ))

    # 3. Respiratory
    if spo2 < 90 and rr > 24:
        patterns.append(_pattern(
            "resp_failure", "Hypoxaemic respiratory failure", "Critical" if spo2 < 85 or rr >= 35 else "High",
            [f"SpO2 {_fmt(spo2)}%", f"Respiratory rate {_fmt(rr)}/min"],
            "Low oxygen saturation despite a high respiratory rate indicates failing gas exchange.",
            [
                "High-flow oxygen; titrate to SpO2 94-98% (88-92% if known COPD / hypercapnic risk)",
                "Sit patient upright; assess work of breathing, chest expansion and breath sounds",
                "Prepare bag-valve-mask and airway adjuncts; consider assisted ventilation if tiring",
                "Use waveform capnography if available",
            ],
            team="Emergency physician / airway team",
        ))
    elif spo2 < 94 or rr > 24:
        evidence = []
        if spo2 < 94:
            evidence.append(f"SpO2 {_fmt(spo2)}%")
        if rr > 24:
            evidence.append(f"Respiratory rate {_fmt(rr)}/min")
        patterns.append(_pattern(
            "resp_distress", "Respiratory distress / impaired oxygenation",
            "High" if spo2 < 90 or rr >= 30 else "Moderate", evidence,
            "Oxygenation or ventilation is impaired; causes include asthma/COPD, pneumonia, pulmonary oedema, "
            "pulmonary embolism or chest injury.",
            [
                "Supplemental oxygen titrated to SpO2 94-98%",
                "Position upright; auscultate for wheeze, crackles or absent breath sounds",
                "Consider nebulised bronchodilator if wheeze is present (per protocol)",
            ],
            team="Emergency department - respiratory",
        ))

    # 4. Hypoventilation
    if rr < 10:
        patterns.append(_pattern(
            "hypoventilation", "Hypoventilation", "Critical" if rr < 8 or spo2 < 90 else "High",
            [f"Respiratory rate {_fmt(rr)}/min", f"SpO2 {_fmt(spo2)}%"],
            "Inadequate breathing effort; consider opioid/sedative toxicity, head injury, exhaustion or hypothermia.",
            [
                "Open and protect the airway; assist ventilation with bag-valve-mask if needed",
                "Consider naloxone if opioid toxicity is suspected (per protocol)",
                "Check capillary blood glucose and pupils",
            ],
            team="Emergency physician / airway team",
        ))

    # 5. Sepsis screen
    if sirs >= 2 and temp_abnormal:
        severity = "High" if qsofa >= 2 or decompensated else "Moderate"
        actions = [
            "Activate sepsis pathway pre-alert",
            "Look for infection source (chest, urine, skin, abdomen)",
            "At hospital: blood cultures, lactate and early antibiotics within 1 hour",
            "Give IV fluids if hypotensive (per protocol)",
        ]
        if "penicillin" in history_text:
            actions.append("Known penicillin allergy - flag for antibiotic selection")
        patterns.append(_pattern(
            "sepsis", "Possible sepsis (screen positive)", severity,
            scores["sirs"]["criteria"] + scores["qsofa"]["criteria"],
            f"{sirs}/3 vital SIRS criteria and {qsofa}/2 measurable qSOFA criteria are met; an infective cause "
            "with systemic response is possible.",
            actions,
            team="Sepsis team / emergency physician",
        ))

    # 6. Hypertensive emergency / Cushing pattern
    if sbp >= 180 or dbp >= 120:
        cushing = hr < 60 and sbp >= 160
        if cushing:
            patterns.append(_pattern(
                "cushing", "Cushing-pattern warning (hypertension + bradycardia)", "Critical",
                [f"Blood pressure {_fmt(sbp)}/{_fmt(dbp)} mmHg", f"Heart rate {_fmt(hr)} bpm", f"Respiratory rate {_fmt(rr)}/min"],
                "Severe hypertension with bradycardia can indicate raised intracranial pressure (e.g. intracranial "
                "haemorrhage, major stroke or head injury).",
                [
                    "Perform rapid neurological assessment (GCS, pupils, FAST/BE-FAST stroke screen)",
                    "Elevate head of stretcher to 30°; protect airway",
                    "Pre-alert stroke / neurosurgical team for immediate CT head",
                    "Avoid hypoxia and hypercapnia; check capillary glucose",
                ],
                team="Stroke / neurosurgical team",
            ))
        else:
            known_htn = "hypertension" in history_text
            patterns.append(_pattern(
                "hypertensive_emergency", "Hypertensive crisis", "Critical" if sbp >= 220 or dbp >= 130 else "High",
                [f"Blood pressure {_fmt(sbp)}/{_fmt(dbp)} mmHg", f"MAP {map_value} mmHg"],
                "Blood pressure is in the crisis range; screen for end-organ damage (stroke, ACS, aortic dissection, "
                "pulmonary oedema)."
                + (" Known hypertension history, but crisis-level values still require action." if known_htn else ""),
                [
                    "Neurological screen (BE-FAST) and ask about chest/back pain, headache, visual change",
                    "12-lead ECG",
                    "Avoid aggressive pre-hospital BP lowering unless directed by medical control",
                    "Recheck BP on both arms",
                ],
                team="Emergency physician / stroke or cardiology team",
            ))
    elif sbp >= 160 or dbp >= 100:
        patterns.append(_pattern(
            "severe_hypertension", "Severe hypertension", "Moderate",
            [f"Blood pressure {_fmt(sbp)}/{_fmt(dbp)} mmHg"],
            "Severely raised blood pressure; may be pain/anxiety related but warrants neurological and cardiac screening.",
            ["Recheck BP after pain/anxiety control", "Perform BE-FAST stroke screen"],
            team="Emergency department",
        ))

    # 7. Rhythm disorders
    if hr > 150 or (ecg_vital["band"] in ("Fast rhythm", "Irregular rhythm") and hr > 100):
        patterns.append(_pattern(
            "tachyarrhythmia", "Tachyarrhythmia", "Critical" if hr > 150 and sbp < 90 else "High",
            [f"Heart rate {_fmt(hr)} bpm", f"ECG: {ecg_vital['display']}"],
            "Rapid or irregular rhythm; differentiate sinus tachycardia (compensatory) from SVT, atrial "
            "fibrillation with rapid ventricular response or VT.",
            [
                "Obtain 12-lead ECG and continuous cardiac monitoring",
                "Assess for adverse features: hypotension, chest pain, altered consciousness, heart failure",
                "Apply defibrillation pads if any adverse feature is present",
            ],
            team="Cardiology",
        ))
    if hr < 50:
        patterns.append(_pattern(
            "bradyarrhythmia", "Bradyarrhythmia", "Critical" if hr < 40 and sbp < 90 else "High" if hr < 40 or sbp < 90 else "Moderate",
            [f"Heart rate {_fmt(hr)} bpm", f"Systolic BP {_fmt(sbp)} mmHg", f"ECG: {ecg_vital['display']}"],
            "Slow heart rate; consider heart block, beta-blocker/digoxin effect, hypothermia, hyperkalaemia or raised ICP.",
            [
                "12-lead ECG and continuous monitoring",
                "If hypotensive or symptomatic: atropine / pacing per ACLS protocol",
                "Apply pacing/defibrillation pads",
            ],
            team="Cardiology",
        ))
    if ecg_vital["band"] == "Cardiac abnormality":
        actions = [
            "12-lead ECG within 10 minutes and transmit to receiving hospital",
            "Aspirin if acute coronary syndrome suspected and no contraindication (per protocol)",
            "Pre-alert cath lab if ST-elevation is confirmed",
        ]
        if "diabetes" in history_text:
            actions.append("Diabetic history - atypical/silent ischaemia is more likely")
        patterns.append(_pattern(
            "cardiac_abnormality", "Possible acute cardiac event", "High",
            [f"ECG: {ecg_vital['display']}", f"Heart rate {_fmt(hr)} bpm", f"Blood pressure {_fmt(sbp)}/{_fmt(dbp)} mmHg"],
            "The reported ECG abnormality may represent ischaemia or a conduction disturbance.",
            actions,
            team="Cardiology / cath lab",
        ))

    # 8. Haemorrhage / anaemia
    if hb < 7:
        patterns.append(_pattern(
            "severe_anaemia", "Severe anaemia / major blood loss", "Critical" if hr > 100 or sbp < 90 else "High",
            [f"Hb {_fmt(hb, 1)} g/dL", f"Heart rate {_fmt(hr)} bpm"],
            "Haemoglobin is below the transfusion threshold; oxygen delivery is significantly reduced.",
            [
                "Search for and control bleeding source",
                "Pre-alert blood bank: crossmatch / emergency O-negative units",
                "High-flow oxygen; minimise exertion",
            ],
            team="Trauma / haematology",
        ))
    elif hb < 10 and hr > 100:
        patterns.append(_pattern(
            "blood_loss", "Possible active blood loss", "High",
            [f"Hb {_fmt(hb, 1)} g/dL", f"Heart rate {_fmt(hr)} bpm"],
            "Low haemoglobin with tachycardia suggests ongoing haemorrhage (external or internal).",
            [
                "Inspect for external bleeding; consider internal (abdominal, pelvic, GI) bleeding",
                "Two large-bore IV lines; request group & crossmatch on arrival",
                "Serial haemoglobin and blood pressure monitoring",
            ],
            team="Trauma / surgical team",
        ))
    elif hb < 10:
        patterns.append(_pattern(
            "anaemia", "Moderate anaemia", "Moderate",
            [f"Hb {_fmt(hb, 1)} g/dL"],
            "Moderately low haemoglobin reduces physiological reserve.",
            ["Repeat haemoglobin on arrival; ask about bleeding history or chronic anaemia"],
        ))

    # 9. Thermal
    if temp < 95:
        patterns.append(_pattern(
            "hypothermia", "Hypothermia", "Critical" if temp < 90 else "High",
            [f"Temperature {_fmt(temp, 1)}°F", f"Heart rate {_fmt(hr)} bpm"],
            "Core cooling impairs cardiac conduction, coagulation and drug metabolism.",
            [
                "Remove wet clothing; passive and active external rewarming",
                "Use warmed IV fluids",
                "Handle gently - risk of ventricular fibrillation; continuous ECG",
            ],
            team="Emergency department",
        ))
    elif temp >= 104:
        patterns.append(_pattern(
            "hyperthermia", "Hyperthermia / possible heat stroke", "Critical" if temp >= 106 or hr > 130 else "High",
            [f"Temperature {_fmt(temp, 1)}°F", f"Heart rate {_fmt(hr)} bpm"],
            "Dangerously high temperature; heat stroke, severe sepsis or drug toxicity (e.g. sympathomimetics) must be considered.",
            [
                "Start active cooling (remove clothing, evaporative cooling, cold packs to groin/axillae)",
                "IV fluids per protocol",
                "Monitor neurological status and blood glucose",
            ],
            team="Emergency department / critical care",
        ))
    elif temp >= 100.4 and not any(p["id"] == "sepsis" for p in patterns):
        patterns.append(_pattern(
            "fever", "Fever", "Moderate" if temp >= 102 else "Low",
            [f"Temperature {_fmt(temp, 1)}°F"],
            "Raised temperature suggests infection or inflammation; systemic criteria are not yet met.",
            ["Screen for infection source; antipyretic and fluids per protocol", "Re-screen for sepsis at each set of observations"],
        ))

    # 10. Reduced oxygen delivery
    if hb < 10 and spo2 < 94:
        patterns.append(_pattern(
            "low_do2", "Critically reduced oxygen delivery", "High",
            [f"Hb {_fmt(hb, 1)} g/dL", f"SpO2 {_fmt(spo2)}%", f"Estimated CaO2 {idx['oxygen_content']['value']} mL/dL"],
            "Anaemia combined with hypoxaemia multiplies the reduction in oxygen delivery to tissues.",
            ["Maximise oxygenation", "Prioritise transfusion readiness on arrival"],
        ))

    patterns.sort(key=lambda p: RISK_LEVELS.index(p["severity"]), reverse=True)
    return patterns


# --------------------------------------------------
# 5. Trend analysis
# --------------------------------------------------

def _deviation(key: str, value: float) -> float:
    low, high = NORMAL_RANGES[key]
    if value < low:
        return low - value
    if value > high:
        return value - high
    return 0.0


def _baseline_reading(previous, history, now_ts):
    if history:
        window_start = (now_ts or 0) - TREND_WINDOW_SECONDS
        candidates = [h for h in history[:-1] if h.get("timestamp", 0) >= window_start]
        if candidates:
            return candidates[0]
        if len(history) >= 2:
            return history[-2]
    return previous


def _analyse_trend(current: dict, previous: dict | None, history: list | None, current_news: int) -> dict:
    baseline = _baseline_reading(previous, history, current.get("timestamp"))
    if not baseline:
        return {
            "direction": "Establishing baseline",
            "window_seconds": 0,
            "changes": [],
            "per_vital": {},
            "news_delta": 0,
            "summary": "Trend analysis will be available after further readings.",
        }

    window = max(0, round((current.get("timestamp") or 0) - (baseline.get("timestamp") or 0)))
    changes = []
    per_vital = {}
    worsening = improving = 0

    for key, threshold in TREND_THRESHOLDS.items():
        now_v = _num(current.get(key))
        then_v = _num(baseline.get(key))
        if now_v is None or then_v is None:
            continue
        delta = now_v - then_v
        short_prev = _num((previous or {}).get(key), now_v)
        per_vital[key] = {
            "current": now_v,
            "baseline": then_v,
            "delta": round(delta, 1),
            "direction": "up" if now_v - short_prev > 0 else "down" if now_v - short_prev < 0 else "flat",
        }
        if abs(delta) < threshold:
            continue

        label, unit = TREND_LABELS[key]
        dev_then, dev_now = _deviation(key, then_v), _deviation(key, now_v)
        if dev_now > dev_then:
            status = "worsening"
            worsening += 1
        elif dev_now < dev_then:
            status = "improving"
            improving += 1
        else:
            status = "change within normal range"
        verb = "rising" if delta > 0 else "falling"
        decimals = 1 if key in ("temp", "hb") else 0
        changes.append({
            "vital": key,
            "status": status,
            "text": f"{label} {verb} {_fmt(then_v, decimals)} → {_fmt(now_v, decimals)} {unit} over the last {window} s ({status})",
        })

    news_then = _news2_score(
        _num(baseline.get("heart_rate"), 80), _num(baseline.get("spo2"), 97),
        _num(baseline.get("systolic_bp"), 120), _num(baseline.get("resp_rate"), 16),
        _num(baseline.get("temp"), 98.6),
    )["score"]
    news_delta = current_news - news_then

    if news_delta >= 2 or (worsening >= 2 and worsening > improving):
        direction = "Deteriorating"
    elif news_delta <= -2 or (improving >= 2 and improving > worsening):
        direction = "Improving"
    elif worsening > improving:
        direction = "Slowly worsening"
    elif improving > worsening:
        direction = "Slowly improving"
    else:
        direction = "Stable"

    if changes:
        summary = f"{direction}: " + "; ".join(c["text"] for c in changes[:3]) + "."
    else:
        summary = f"{direction}: no clinically significant change in the last {window} s."
    if news_delta:
        summary += f" NEWS2-style score {'+' if news_delta > 0 else ''}{news_delta} over this window."

    return {
        "direction": direction,
        "window_seconds": window,
        "changes": changes,
        "per_vital": per_vital,
        "news_delta": news_delta,
        "summary": summary,
    }


# --------------------------------------------------
# 6. Main entry point
# --------------------------------------------------

def build_vitals_summary(
    raw: dict[str, Any],
    previous: dict[str, Any] | None = None,
    history: list[dict[str, Any]] | None = None,
    patient: dict[str, Any] | None = None,
    anonymous_mode: bool = False,
) -> dict[str, Any]:
    """Produce a detailed rule-based clinical summary from live vitals."""

    patient = patient or {}
    v = {
        "heart_rate": _num(raw.get("heart_rate"), 80),
        "spo2": _num(raw.get("spo2"), 97),
        "systolic_bp": _num(raw.get("systolic_bp"), 120),
        "diastolic_bp": _num(raw.get("diastolic_bp"), 80),
        "resp_rate": _num(raw.get("resp_rate"), 16),
        "temp": _num(raw.get("temp"), 98.6),
        "hb": _num(raw.get("hb"), 13.5),
    }
    ecg_status = str(raw.get("ecg_status", "Not available"))

    history_raw = str(patient.get("past_conditions", "") or "").strip()
    history_unavailable = anonymous_mode or history_raw.lower() in ("", "unknown", "none", "n/a")
    history_text = "" if history_unavailable else history_raw.lower()
    allergies = str(patient.get("allergies", "") or "").strip()
    if not history_unavailable and allergies:
        history_text += " " + allergies.lower()

    # 1. Vital interpretations
    ecg_vital = _classify_ecg(ecg_status, v["heart_rate"])
    vitals = [
        _classify_heart_rate(v["heart_rate"]),
        _classify_spo2(v["spo2"]),
        _classify_blood_pressure(v["systolic_bp"], v["diastolic_bp"]),
        _classify_resp_rate(v["resp_rate"]),
        _classify_temperature(v["temp"]),
        _classify_hb(v["hb"]),
        ecg_vital,
    ]

    # 2-3. Indices and scores
    indices = _derived_indices(v["heart_rate"], v["systolic_bp"], v["diastolic_bp"], v["spo2"], v["hb"])
    scores = {
        "news2": _news2_score(v["heart_rate"], v["spo2"], v["systolic_bp"], v["resp_rate"], v["temp"]),
        "qsofa": _qsofa_score(v["resp_rate"], v["systolic_bp"]),
        "sirs": _sirs_score(v["heart_rate"], v["resp_rate"], v["temp"]),
    }

    # 4. Patterns
    patterns = _detect_patterns(v, indices, scores, ecg_vital, history_text)

    # 5. Trend
    trend = _analyse_trend(raw, previous, history, scores["news2"]["score"])

    # Overall risk
    vital_risk = _risk_max(*(SEVERITY_TO_RISK[item["severity"]] for item in vitals))
    pattern_risk = _risk_max(*(p["severity"] for p in patterns)) if patterns else "Low"
    risk_level = _risk_max(scores["news2"]["risk"], vital_risk, pattern_risk)
    if trend["direction"] == "Deteriorating" and risk_level == "Moderate":
        risk_level = "High"

    abnormal = sorted(
        (item for item in vitals if item["abnormal"]),
        key=lambda item: SEVERITY_ORDER.index(item["severity"]),
        reverse=True,
    )

    # Headline
    if patterns:
        headline = f"{risk_level} risk - {patterns[0]['title']}"
        if len(patterns) > 1:
            headline += f" (+{len(patterns) - 1} more finding{'s' if len(patterns) > 2 else ''})"
    elif abnormal:
        headline = f"{risk_level} risk - {abnormal[0]['band'].lower()} without a combined syndrome pattern"
    else:
        headline = "Low risk - vital signs within expected limits"
    if trend["direction"] not in ("Stable", "Establishing baseline"):
        headline += f"; trend {trend['direction'].lower()}"

    # Key findings and alerts
    key_findings = [f"{item['label']}: {item['band']} - {item['interpretation']}" for item in abnormal]
    for key in ("shock_index", "map", "pulse_pressure"):
        index = indices[key]
        if not index["note"].startswith(("Normal", "Adequate")):
            key_findings.append(f"{index['label']} {index['value']}{(' ' + index['unit']) if index['unit'] else ''}: {index['note']}")
    if not key_findings:
        key_findings.append("All measured vital signs are within normal limits.")

    alerts = [f"CRITICAL: {item['label']} {item['display']} - {item['band']}" for item in vitals if item["severity"] == "critical"]
    alerts += [f"CRITICAL PATTERN: {p['title']}" for p in patterns if p["severity"] == "Critical"]
    if scores["news2"]["score"] >= 7:
        alerts.append(f"NEWS2-style score {scores['news2']['score']} - emergency response threshold")

    # Recommended actions
    actions = []
    for p in patterns:
        actions.extend(p["actions"])
    if ecg_vital["band"] == "Rhythm not reported" or "diabetes" in history_text:
        actions.append("Check capillary blood glucose (not measured by the sensor set)")
    if risk_level in ("High", "Critical"):
        teams = _dedupe([p["receiving_team"] for p in patterns if p.get("receiving_team")])
        actions.append("Pre-alert receiving hospital" + (f" ({', '.join(teams[:3])})" if teams else ""))
    if history_unavailable:
        actions.append("History unavailable - treat conservatively; check for medical ID, medication list or allergy band")
    if not patterns:
        actions.append("Continue routine monitoring and reassess if symptoms change")
    actions.append(MONITORING_INTERVAL[risk_level])
    actions = _dedupe(actions)

    # Narrative
    narrative = _build_narrative(v, ecg_status, vitals, abnormal, indices, scores, patterns, trend, risk_level, history_unavailable)

    # SBAR
    sbar = _build_sbar(patient, anonymous_mode, history_unavailable, v, ecg_status, indices, scores, patterns, trend, risk_level, actions, headline)

    return {
        "risk_level": risk_level,
        "triage": TRIAGE[risk_level],
        "headline": headline,
        "narrative": narrative,
        "key_findings": key_findings,
        "alerts": alerts,
        "vital_interpretations": vitals,
        "derived_indices": indices,
        "scores": scores,
        "patterns": patterns,
        "trend": trend,
        "recommended_actions": actions,
        "monitoring_interval": MONITORING_INTERVAL[risk_level],
        "sbar": sbar,
        "abnormal_count": len(abnormal),
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "disclaimer": (
            "Decision support generated from simulated live vitals. "
            "Not a confirmed diagnosis - clinical judgement and local protocols take precedence."
        ),
    }


def _build_narrative(v, ecg_status, vitals, abnormal, indices, scores, patterns, trend, risk_level, history_unavailable) -> str:
    sentences = []

    who = "The unidentified patient" if history_unavailable else "The patient"
    if abnormal:
        sentences.append(
            f"{who} currently shows {len(abnormal)} abnormal parameter{'s' if len(abnormal) != 1 else ''} "
            f"and is classified as {risk_level.upper()} risk."
        )
    else:
        sentences.append(f"{who} currently has all measured vital signs within normal limits ({risk_level.upper()} risk).")

    by_key = {item["key"]: item for item in vitals}
    sentences.append(
        f"Heart rate is {_fmt(v['heart_rate'])} bpm ({by_key['heart_rate']['band'].lower()}), "
        f"SpO2 {_fmt(v['spo2'])}% ({by_key['spo2']['band'].lower()}), "
        f"blood pressure {_fmt(v['systolic_bp'])}/{_fmt(v['diastolic_bp'])} mmHg with MAP {indices['map']['value']} mmHg "
        f"({by_key['blood_pressure']['band'].lower()}), "
        f"respiratory rate {_fmt(v['resp_rate'])}/min ({by_key['resp_rate']['band'].lower()}), "
        f"temperature {_fmt(v['temp'], 1)}°F ({by_key['temp']['band'].lower()}) and "
        f"haemoglobin {_fmt(v['hb'], 1)} g/dL ({by_key['hb']['band'].lower()}); ECG status: {ecg_status}."
    )

    if patterns:
        titles = [p["title"] for p in patterns[:3]]
        joined = titles[0] if len(titles) == 1 else ", ".join(titles[:-1]) + " and " + titles[-1]
        sentences.append(f"The combined pattern is most consistent with {joined}. {patterns[0]['interpretation']}")
    else:
        sentences.append("No combined syndrome pattern is detected.")

    si = indices["shock_index"]
    sentences.append(f"Shock index is {si['value']} ({si['note'].lower()}).")

    news = scores["news2"]
    sentences.append(
        f"The NEWS2-style score is {news['score']} ({news['band'].lower()}), qSOFA {scores['qsofa']['score']}/2 measurable "
        f"criteria and SIRS {scores['sirs']['score']}/3 vital criteria."
    )

    if trend["direction"] != "Establishing baseline":
        sentences.append(f"Trend: {trend['summary']}")

    sentences.append(f"Recommended monitoring: {MONITORING_INTERVAL[risk_level].lower()}.")
    return " ".join(sentences)


def _build_sbar(patient, anonymous_mode, history_unavailable, v, ecg_status, indices, scores, patterns, trend, risk_level, actions, headline) -> dict:
    if anonymous_mode:
        identity = "Unidentified patient (anonymous intake)"
    else:
        name = patient.get("name", "Patient")
        age = patient.get("age")
        identity = f"{name}, {age} years" if age not in (None, "", "Unknown") else str(name)

    situation = (
        f"{identity}. Live monitoring: {headline}. Triage {TRIAGE[risk_level]}, "
        f"NEWS2-style score {scores['news2']['score']}."
    )

    if history_unavailable:
        background = "Identity, past medical history and allergies are unavailable; assessment relies on real-time physiology only."
    else:
        background = (
            f"Known history: {patient.get('past_conditions', 'not recorded')}. "
            f"Allergies: {patient.get('allergies', 'not recorded')}."
        )
    background += " Vitals are simulated demo telemetry."

    assessment = (
        f"HR {_fmt(v['heart_rate'])} bpm, SpO2 {_fmt(v['spo2'])}%, BP {_fmt(v['systolic_bp'])}/{_fmt(v['diastolic_bp'])} mmHg "
        f"(MAP {indices['map']['value']}, SI {indices['shock_index']['value']}), RR {_fmt(v['resp_rate'])}/min, "
        f"Temp {_fmt(v['temp'], 1)}°F, Hb {_fmt(v['hb'], 1)} g/dL, ECG: {ecg_status}. "
    )
    if patterns:
        assessment += "Concerns: " + "; ".join(f"{p['title']} ({p['severity']})" for p in patterns[:4]) + ". "
    else:
        assessment += "No syndrome pattern detected. "
    assessment += f"Trend: {trend['direction'].lower()}."

    recommendation = "; ".join(actions[:4]) + "."

    return {
        "situation": situation,
        "background": background,
        "assessment": assessment,
        "recommendation": recommendation,
    }
