"""Static demo patient data and patient-history builder (moved from ambulance_system/app.py)."""

# ----------------------------
# Dummy Patient Records
# ----------------------------
PATIENT_RECORDS = [
    {
        "id": "GOV-8821-01",
        "name": "John Doe",
        "age": 45,
        "dob": "1981-05-14",
        "past_conditions": "Hypertension, Type 2 Diabetes",
        "allergies": "Penicillin, Peanuts",
        "recent_report": "Stable cardiac history; last checkup 3 months ago."
    }
]


# ----------------------------
# Historical Patient Records for Analytics
# ----------------------------
HISTORICAL_PATIENT_RECORDS = [
    {"patient_id": "PAT-001", "name": "Robert Johnson", "date": "2026-02-10", "condition": "Cardiac Arrest", "accuracy": 92, "response_time": 4, "status": "Recovered"},
    {"patient_id": "PAT-002", "name": "Sarah Williams", "date": "2026-02-12", "condition": "Stroke", "accuracy": 88, "response_time": 7, "status": "Recovered"},
    {"patient_id": "PAT-003", "name": "Michael Brown", "date": "2026-02-14", "condition": "Trauma", "accuracy": 85, "response_time": 5, "status": "Recovering"},
    {"patient_id": "PAT-004", "name": "Emily Davis", "date": "2026-02-15", "condition": "Respiratory", "accuracy": 90, "response_time": 3, "status": "Recovered"},
    {"patient_id": "PAT-005", "name": "James Wilson", "date": "2026-02-16", "condition": "Cardiac Arrest", "accuracy": 95, "response_time": 6, "status": "Recovered"},
    {"patient_id": "PAT-006", "name": "Lisa Anderson", "date": "2026-02-17", "condition": "Stroke", "accuracy": 87, "response_time": 8, "status": "Ongoing"},
    {"patient_id": "PAT-007", "name": "David Martinez", "date": "2026-02-18", "condition": "Trauma", "accuracy": 91, "response_time": 4, "status": "Recovered"},
    {"patient_id": "PAT-008", "name": "Jennifer Taylor", "date": "2026-02-19", "condition": "Respiratory", "accuracy": 89, "response_time": 5, "status": "Recovered"},
]


CONDITION_DETAILS = {
    "Undifferentiated Chest Pain/Tachycardia": {
        "diagnosis_detail": "Acute cardiocirculatory stress syndrome identified from live physiology without relying on historical comorbidity records.",
        "medications": [
            {"name": "Aspirin", "dosage": "300 mg", "frequency": "Once (if indicated)", "purpose": "Early antiplatelet support in suspected ACS pattern"},
            {"name": "Nitroglycerin", "dosage": "0.4 mg SL", "frequency": "Every 5 min x3 (if suitable)", "purpose": "Symptomatic relief for chest pain/hemodynamic strain"},
            {"name": "Metoprolol", "dosage": "25 mg", "frequency": "As directed", "purpose": "Rate control when tachyarrhythmia pattern persists"}
        ]
    },
    "Acute Neurological Deficit": {
        "diagnosis_detail": "Sudden neurological syndrome requiring rapid imaging and bedside neuro checks independent of prior diagnosis history.",
        "medications": [
            {"name": "Labetalol", "dosage": "10-20 mg IV", "frequency": "As directed", "purpose": "Blood pressure control in acute neuro presentations"},
            {"name": "Mannitol", "dosage": "0.5-1 g/kg", "frequency": "As directed", "purpose": "Intracranial pressure support when clinically indicated"},
            {"name": "Normal Saline", "dosage": "500 mL", "frequency": "As needed", "purpose": "Maintain perfusion pending definitive imaging"}
        ]
    },
    "Cardiac Arrest": {
        "diagnosis_detail": "Acute cardiac event with rhythm instability requiring immediate ACLS protocol.",
        "medications": [
            {"name": "Aspirin", "dosage": "75 mg", "frequency": "Once daily", "purpose": "Antiplatelet support"},
            {"name": "Atorvastatin", "dosage": "20 mg", "frequency": "Nightly", "purpose": "Lipid control"},
            {"name": "Metoprolol", "dosage": "25 mg", "frequency": "Twice daily", "purpose": "Rate and BP control"}
        ]
    },
    "Stroke": {
        "diagnosis_detail": "Suspected ischemic neurological event with motor and speech monitoring required.",
        "medications": [
            {"name": "Clopidogrel", "dosage": "75 mg", "frequency": "Once daily", "purpose": "Secondary stroke prevention"},
            {"name": "Rosuvastatin", "dosage": "10 mg", "frequency": "Nightly", "purpose": "Vascular risk reduction"},
            {"name": "Amlodipine", "dosage": "5 mg", "frequency": "Once daily", "purpose": "Blood pressure management"}
        ]
    },
    "Trauma": {
        "diagnosis_detail": "Multi-system trauma with pain, bleeding, and mobility risk under serial monitoring.",
        "medications": [
            {"name": "Paracetamol", "dosage": "650 mg", "frequency": "Every 8 hours", "purpose": "Pain and fever control"},
            {"name": "Ceftriaxone", "dosage": "1 g", "frequency": "Twice daily", "purpose": "Infection prophylaxis"},
            {"name": "Pantoprazole", "dosage": "40 mg", "frequency": "Once daily", "purpose": "Gastric protection"}
        ]
    },
    "Respiratory": {
        "diagnosis_detail": "Acute respiratory compromise with oxygenation support and airway observation.",
        "medications": [
            {"name": "Salbutamol Neb", "dosage": "2.5 mg", "frequency": "Every 6 hours", "purpose": "Bronchodilation"},
            {"name": "Budesonide Neb", "dosage": "0.5 mg", "frequency": "Twice daily", "purpose": "Airway inflammation control"},
            {"name": "Azithromycin", "dosage": "500 mg", "frequency": "Once daily", "purpose": "Infection coverage"}
        ]
    }
}


COMMON_VISUALIZATION_TEMPLATE = {
    "timeline_labels": ["D-3", "D-2", "D-1", "D0", "D+1"],
    "breakdown_labels": ["Primary", "Secondary", "Observation"]
}


def build_patient_history(record):
    condition_data = CONDITION_DETAILS.get(record["condition"], {
        "diagnosis_detail": "Clinical diagnosis under active review.",
        "medications": []
    })

    baseline_response = max(record["response_time"] - 2, 1)
    timeline_days = COMMON_VISUALIZATION_TEMPLATE["timeline_labels"]
    response_timeline = [
        baseline_response + 2,
        baseline_response + 1,
        baseline_response + 1,
        record["response_time"],
        max(record["response_time"] - 1, 1)
    ]
    accuracy_timeline = [
        max(record["accuracy"] - 6, 70),
        max(record["accuracy"] - 4, 72),
        max(record["accuracy"] - 2, 74),
        record["accuracy"],
        min(record["accuracy"] + 1, 99)
    ]

    vitals = [
        {"time": "T-30 min", "heart_rate": 108, "spo2": 93, "blood_pressure": "148/92", "temperature": "99.1°F"},
        {"time": "T-20 min", "heart_rate": 102, "spo2": 94, "blood_pressure": "142/88", "temperature": "99.0°F"},
        {"time": "T-10 min", "heart_rate": 98, "spo2": 95, "blood_pressure": "136/84", "temperature": "98.8°F"},
        {"time": "Current", "heart_rate": 94, "spo2": 97, "blood_pressure": "130/82", "temperature": "98.6°F"}
    ]

    event_log = [
        {"event": "Emergency intake completed", "status": "Completed"},
        {"event": "AI triage and risk scoring", "status": "Completed"},
        {"event": "Primary intervention initiated", "status": "Completed"},
        {"event": "Medication protocol active", "status": "Ongoing" if record["status"] == "Ongoing" else "Completed"},
        {"event": "Recovery monitoring", "status": record["status"]}
    ]

    return {
        "patient_id": record["patient_id"],
        "name": record["name"],
        "date": record["date"],
        "condition": record["condition"],
        "status": record["status"],
        "prediction_accuracy": record["accuracy"],
        "response_time": record["response_time"],
        "patient_summary": {
            "age": 40 + (int(record["patient_id"].split("-")[-1]) % 16),
            "blood_group": ["A+", "B+", "O+", "AB+"][int(record["patient_id"].split("-")[-1]) % 4],
            "emergency_contact": "+1-555-010" + record["patient_id"].split("-")[-1],
            "attending_doctor": "Dr. Priya Menon",
            "ambulance_unit": "Unit-" + record["patient_id"].split("-")[-1],
            "diagnosis_detail": condition_data["diagnosis_detail"]
        },
        "medications": condition_data["medications"],
        "vitals": vitals,
        "event_log": event_log,
        "chart_data": {
            "labels": timeline_days,
            "response_timeline": response_timeline,
            "accuracy_timeline": accuracy_timeline,
            "condition_breakdown": {
                "labels": COMMON_VISUALIZATION_TEMPLATE["breakdown_labels"],
                "values": [60, 25, 15]
            }
        }
    }
