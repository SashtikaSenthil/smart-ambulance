"""JSON API - one endpoint per route of the original ambulance_system Flask app."""

from flask import Blueprint, Response, jsonify

from ai.combined_diagnosis import build_combined_diagnosis
from ai.rule_engine import evaluate_risk
from ai.vitals_summary_engine import build_vitals_summary
from ml.predict import predict_risk_ml
from services import camera_service
from services.camera_service import (
    IN_PROGRESS_CAMERA_SUMMARY,
    camera_analysis_lock,
    camera_available,
    live_camera_service,
    load_camera_report_or_pending,
)
from services.context import (
    build_ai_payload,
    build_page_payload,
    format_assessment_sensors,
    is_anonymous_mode_active,
    live_vitals_simulator,
    resolve_patient_context,
)
from services.database import (
    create_new_demo_assessment,
    fetch_all_patient_records,
    fetch_patient_history,
    get_or_create_latest_assessment,
)
from services.ecg_service import get_ecg_series

api = Blueprint("api", __name__, url_prefix="/api")


@api.route("/health")
def health():
    return jsonify({"status": "ok"})


# ----------------------------
# Page data (old: /, /analysis, /doctor-summary)
# ----------------------------
@api.route("/dashboard")
def dashboard_data():
    # Same as the old dashboard: every load creates a new demo assessment
    return jsonify(build_page_payload(create_new_demo_assessment()))


@api.route("/analysis")
def analysis_data():
    return jsonify(build_page_payload(get_or_create_latest_assessment()))


@api.route("/doctor-summary")
def doctor_summary_data():
    return jsonify(build_page_payload(get_or_create_latest_assessment(), full_ai=False))


# ----------------------------
# Patient records (old: /records, /records/<id>/history)
# ----------------------------
@api.route("/records")
def patient_records_data():
    patient_rows = fetch_all_patient_records()

    total_patients = len(patient_rows)
    avg_accuracy = sum(r["accuracy"] for r in patient_rows) / total_patients if total_patients > 0 else 0
    prediction_success = round(avg_accuracy)
    avg_response_time = sum(r["response_time"] for r in patient_rows) / total_patients if total_patients > 0 else 0

    return jsonify({
        "patient_records": patient_rows,
        "total_patients": total_patients,
        "prediction_success": prediction_success,
        "avg_accuracy": round(avg_accuracy),
        "avg_response_time": f"{avg_response_time:.1f}",
    })


@api.route("/records/<patient_id>/history")
def patient_full_history_data(patient_id):
    history = fetch_patient_history(patient_id)
    if history is None:
        return jsonify({"error": "Patient history not found", "patient_id": patient_id}), 404
    return jsonify(history)


# ----------------------------
# Camera
# ----------------------------
@api.route("/camera-feed")
def camera_feed():
    if not camera_available():
        return Response(
            "Camera service unavailable. Check OpenCV/Numpy environment and restart.",
            status=503,
            mimetype="text/plain"
        )

    def generate_frames():
        while True:
            frame_bytes = live_camera_service.get_frame(timeout=2.0)
            if not frame_bytes:
                continue

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )

    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )


@api.route("/camera-analysis")
def camera_analysis_data():
    return jsonify(load_camera_report_or_pending(IN_PROGRESS_CAMERA_SUMMARY))


@api.route("/camera-analysis-status")
def camera_analysis_status():
    engine = camera_service.camera_analysis_engine
    if engine is None:
        return jsonify({
            "phase": "unavailable",
            "remaining_seconds": 0,
            "bleeding_risk": "Pending",
            "movement_risk": "Pending",
            "posture_risk": "Pending",
            "message": "Camera dependencies not loaded",
            "error": camera_service.CAMERA_IMPORT_ERROR
        })

    with camera_analysis_lock:
        status = engine.get_runtime_status()
    return jsonify(status)


# ----------------------------
# Sensors / diagnosis
# ----------------------------
@api.route("/ecg-data")
def ecg_data():
    return jsonify(get_ecg_series())


@api.route("/combined-diagnosis")
def combined_diagnosis_data():
    assessment = get_or_create_latest_assessment()
    sensors = format_assessment_sensors(assessment)
    anonymous_mode = is_anonymous_mode_active()
    camera_report = load_camera_report_or_pending(IN_PROGRESS_CAMERA_SUMMARY)

    diagnosis = build_combined_diagnosis(camera_report, sensors, anonymous_mode=anonymous_mode)
    return jsonify({
        "diagnosis": diagnosis,
        "camera": {
            "bleeding_risk": camera_report.get("bleeding_risk", "Pending"),
            "movement_risk": camera_report.get("movement_risk", "Pending"),
            "posture_risk": camera_report.get("posture_risk", "Pending"),
            "overall_risk": camera_report.get("overall_risk", "Pending"),
            "summary": camera_report.get("summary", [])
        },
        "sensors": sensors,
        "demo_assessment": assessment
    })


@api.route("/live-vitals")
def live_vitals_data():
    patient, anonymous_mode = resolve_patient_context()
    assessment = get_or_create_latest_assessment()
    live_vitals_simulator.sync_with_assessment(assessment)
    live = live_vitals_simulator.advance()
    raw = live["raw"]
    sensors = format_assessment_sensors({"sensors": raw})

    ml_result = predict_risk_ml(sensors, patient, anonymous_mode=anonymous_mode)
    rule_result = evaluate_risk(sensors, patient, anonymous_mode=anonymous_mode)
    camera_report = load_camera_report_or_pending(IN_PROGRESS_CAMERA_SUMMARY)
    diagnosis = build_combined_diagnosis(camera_report, sensors, anonymous_mode=anonymous_mode)

    summary = build_vitals_summary(
        raw,
        previous=live["previous"],
        history=live["history"],
        patient=patient,
        anonymous_mode=anonymous_mode
    )

    return jsonify({
        "timestamp": summary["generated_at"],
        "sensors": sensors,
        "raw": raw,
        "summary": summary,
        "ai": build_ai_payload(ml_result, rule_result),
        "camera_overall_risk": camera_report.get("overall_risk", "Pending"),
        "diagnosis": diagnosis
    })
