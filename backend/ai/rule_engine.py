def evaluate_risk(sensors, patient, anonymous_mode=False):
    indicators = []
    explanations = []
    recommendations = []
    internal_summary = []
    external_summary = []

    # Extract numeric values
    hr = int(sensors["heart_rate"].split()[0])
    spo2 = int(sensors["spo2"].replace("%", ""))
    bp_sys = int(sensors["blood_pressure"].split("/")[0])
    resp = int(sensors["resp_rate"].split()[0])
    ecg = sensors["ecg_status"].lower()

    history_raw = str(patient.get("past_conditions", "") or "").strip()
    history = history_raw.lower()
    history_unavailable = anonymous_mode or history in ("", "unknown", "none", "n/a")
    shock_index = (hr / bp_sys) if bp_sys > 0 else 0

    # -------------------------
    # Indicator Detection
    # -------------------------

    if hr > 110:
        indicators.append("Elevated Heart Rate")
        explanations.append(
            f"The patient’s heart rate is {hr} BPM, which is above the normal range and indicates possible cardiac stress."
        )
        external_summary.append(
            f"Cardiac monitoring shows persistent tachycardia at {hr} BPM, which is an externally measurable sign of acute physiological strain that may worsen during transport."
        )
        internal_summary.append(
            "The elevated pulse likely reflects increased sympathetic drive and higher myocardial oxygen demand, which can precipitate ischemic stress if not stabilized early."
        )

    if bp_sys > 140:
        indicators.append("High Blood Pressure")
        explanations.append(
            f"Systolic blood pressure is {bp_sys} mmHg, suggesting hypertension that can strain the cardiovascular system."
        )
        external_summary.append(
            f"Repeated blood pressure measurements indicate systolic elevation at {bp_sys} mmHg, showing sustained hemodynamic stress rather than an isolated reading artifact."
        )
        internal_summary.append(
            "Sustained pressure elevation increases vascular wall stress and left ventricular workload, raising the probability of acute cardiac or cerebrovascular complications."
        )

    if "tachy" in ecg or "brady" in ecg or "arrhythmia" in ecg:
        rhythm_label = "tachycardia" if "tachy" in ecg else "bradycardia" if "brady" in ecg else "possible arrhythmia"
        indicators.append("Abnormal ECG Pattern")
        explanations.append(
            f"ECG analysis indicates {rhythm_label}, which may reflect abnormal electrical activity of the heart."
        )
        external_summary.append(
            f"ECG rhythm status is flagged as {sensors['ecg_status']}, providing objective waveform evidence of rhythm instability requiring close trend surveillance."
        )
        internal_summary.append(
            "Electrical rhythm disturbance suggests reduced cardiac efficiency and may compromise stroke volume, especially when combined with high heart rate and elevated afterload."
        )

    if spo2 < 92:
        indicators.append("Low Oxygen Saturation")
        explanations.append(
            f"Oxygen saturation is {spo2}%, which is below normal and may indicate respiratory or cardiac compromise."
        )
        external_summary.append(
            f"Pulse oximetry is reduced to {spo2}%, which is a visible deterioration in oxygenation status and may correlate with worsening perfusion or ventilation mismatch."
        )
        internal_summary.append(
            "Low oxygen delivery at the tissue level can accelerate anaerobic metabolism and organ dysfunction, particularly in myocardium and brain tissue during critical illness."
        )

    if resp > 20:
        indicators.append("Increased Respiratory Rate")
        explanations.append(
            f"The respiratory rate is {resp} breaths per minute, suggesting respiratory distress or metabolic stress."
        )
        external_summary.append(
            f"Respiratory pattern is elevated at {resp} breaths per minute, indicating increased work of breathing that is clinically observable and trend-relevant."
        )
        internal_summary.append(
            "Tachypnea in this context may represent compensatory physiology for hypoxemia, metabolic acidosis, or systemic stress response, all of which increase clinical risk."
        )

    if history_unavailable:
        indicators.append("Baseline Conservative Protocol")
        explanations.append(
            "Patient history is unavailable; a conservative emergency baseline is activated and risk is weighted toward real-time physiology."
        )
        external_summary.append(
            "Identity/history fields are unavailable at intake, so triage prioritizes immediate physiological stress indicators and serial monitoring."
        )
        internal_summary.append(
            "Unknown comorbidity burden reduces predictive certainty from records; vigilance is increased and hemodynamic instability thresholds are treated conservatively."
        )

    if "hypertension" in history or "diabetes" in history:
        indicators.append("Relevant Medical History")
        explanations.append(
            "The patient has a prior history of chronic conditions such as hypertension or diabetes, which increases overall emergency risk."
        )
        external_summary.append(
            "Known comorbid history (hypertension/diabetes) is documented in pre-arrival records, increasing baseline vulnerability even when single-point metrics appear temporarily stable."
        )
        internal_summary.append(
            "Chronic vascular and metabolic disease can reduce physiological reserve and delay compensation, making acute deterioration more likely under emergency transport conditions."
        )

    if shock_index > 0.9:
        indicators.append("High Shock Index")
        explanations.append(
            f"Shock Index is {shock_index:.2f} (HR/SBP), above 0.90, which is associated with hemodynamic instability risk."
        )
        external_summary.append(
            f"Computed Shock Index is elevated at {shock_index:.2f}, indicating disproportionate tachycardia relative to systolic pressure."
        )
        internal_summary.append(
            "A raised shock index suggests early circulatory compromise and reduced perfusion reserve even if single vital values are borderline."
        )

    # -------------------------
    # Risk Decision Logic
    # -------------------------

    if shock_index > 1.0:
        risk = "Shock / Severe Critical Condition"
        level = "High"
        recommendations.extend([
            "Activate shock protocol and repeat blood pressure at short intervals.",
            "Establish large-bore IV access and prepare fluid/blood resuscitation.",
            "Escalate priority handoff for possible hemodynamic collapse."
        ])

    elif "Abnormal ECG Pattern" in indicators and ("Elevated Heart Rate" in indicators or "tachy" in ecg or "brady" in ecg or "arrhythmia" in ecg):
        risk = "Acute Cardiac Distress"
        level = "High"
        recommendations.extend([
            "Initiate continuous ECG monitoring.",
            "Prepare cardiac emergency medications.",
            "Ensure rapid cardiology team alert."
        ])

    elif "Low Oxygen Saturation" in indicators:
        risk = "Respiratory Distress"
        level = "Moderate"
        recommendations.append("Administer supplemental oxygen and monitor SpO₂ closely.")

    elif len(indicators) >= 3:
        risk = "General Critical Condition"
        level = "High"
        recommendations.append("Initiate rapid hospital alert and prepare emergency response.")

    else:
        risk = "Stable Condition"
        level = "Low"
        recommendations.append("Continue monitoring and reassess vitals periodically.")

    if history_unavailable:
        recommendations.append("History unavailable: maintain high-vigilance reassessment using live vitals and camera cues.")

    if not external_summary:
        external_summary.append(
            "Current external monitoring does not show severe out-of-range values; however, continuous reassessment remains necessary because trend changes can occur rapidly in transit."
        )
    if not internal_summary:
        internal_summary.append(
            "No strong evidence of immediate decompensation is detected from current parameters, but latent pathophysiologic progression cannot be excluded without serial reassessment."
        )

    external_summary.append(
        f"Overall external risk classification is {level.upper()} for {risk}, based on the combined pattern of vital sign deviations and pre-hospital observations."
    )
    internal_summary.append(
        "Integrated interpretation suggests active stress across cardiopulmonary and hemodynamic systems; priority should be stabilization, trend tracking, and rapid handoff readiness."
    )

    return {
        "primary_risk": risk,
        "risk_level": level,
        "indicators": indicators,
        "explanations": explanations,
        "recommendations": recommendations,
        "external_summary": external_summary,
        "internal_summary": internal_summary
    }
