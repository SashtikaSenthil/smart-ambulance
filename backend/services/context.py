"""Request-level helpers shared by the API routes (moved from ambulance_system/app.py)."""

from flask import request

from ai.combined_diagnosis import build_combined_diagnosis
from ai.live_vitals_simulator import LiveVitalsSimulator
from ai.rule_engine import evaluate_risk
from ml.predict import predict_risk_ml
from services.camera_service import load_camera_report_or_pending
from services.patient_data import PATIENT_RECORDS

# Continuously changing demo vitals for the live pages
live_vitals_simulator = LiveVitalsSimulator()


def format_assessment_sensors(assessment):
    raw = assessment["sensors"]
    return {
        "heart_rate": f'{raw["heart_rate"]} BPM',
        "spo2": f'{raw["spo2"]}%',
        "hb": f'{raw["hb"]} g/dL',
        "temp": f'{raw["temp"]}°F',
        "resp_rate": f'{raw["resp_rate"]} RR',
        "blood_pressure": f'{raw["systolic_bp"]}/{raw["diastolic_bp"]} mmHg',
        "ecg_status": str(raw["ecg_status"]).replace("_", " ").title(),
        "systolic_bp": raw["systolic_bp"],
        "diastolic_bp": raw["diastolic_bp"],
    }


def is_anonymous_mode_active():
    toggle_value = str(request.args.get("anonymous", "0")).strip().lower()
    return toggle_value in ("1", "true", "yes", "on")


def resolve_patient_context():
    anonymous_mode = is_anonymous_mode_active()
    patient = dict(PATIENT_RECORDS[0])
    if anonymous_mode:
        patient.update({
            "id": "UNKNOWN",
            "name": "Unknown Patient",
            "dob": "Unknown",
            "age": "Unknown",
            "past_conditions": "Unknown",
            "allergies": "Unknown"
        })
    return patient, anonymous_mode


def build_ai_payload(ml_result, rule_result):
    return {
        "primary_risk": ml_result["ml_risk"],
        "risk_level": rule_result["risk_level"],
        "confidence": ml_result["confidence"],
        "indicators": rule_result["indicators"],
        "explanations": rule_result["explanations"],
        "recommendations": rule_result["recommendations"],
        "external_summary": rule_result["external_summary"],
        "internal_summary": rule_result["internal_summary"]
    }


def build_page_payload(assessment, full_ai=True):
    """Same context the old Jinja pages (dashboard / analysis / doctor summary) were rendered with."""
    patient, anonymous_mode = resolve_patient_context()
    sensors = format_assessment_sensors(assessment)

    # ML decides WHAT, rules decide WHY + ACTIONS
    ml_result = predict_risk_ml(sensors, patient, anonymous_mode=anonymous_mode)
    rule_result = evaluate_risk(sensors, patient, anonymous_mode=anonymous_mode)

    camera_report = load_camera_report_or_pending()
    camera_report["diagnosis"] = build_combined_diagnosis(camera_report, sensors, anonymous_mode=anonymous_mode)

    ai = build_ai_payload(ml_result, rule_result)
    if not full_ai:
        ai = {key: ai[key] for key in ("explanations", "recommendations", "external_summary", "internal_summary")}

    return {
        "patient": patient,
        "anonymous_mode": anonymous_mode,
        "sensors": sensors,
        "ai": ai,
        "camera": camera_report,
        "demo_assessment": assessment,
    }
