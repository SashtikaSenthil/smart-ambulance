from ai.combined_diagnosis import build_combined_diagnosis
from ai.rule_engine import evaluate_risk


def _camera_flags_to_report(camera_flags):
    return {
        "bleeding_risk": "High" if camera_flags.get("possible_bleeding") else "Low",
        "movement_risk": "High" if camera_flags.get("no_movement_detected") else "Low",
        "posture_risk": "Medium" if camera_flags.get("abnormal_posture") else "Low",
    }


def hybrid_decision(sensors, patient, camera_flags):
    rule_result = evaluate_risk(sensors, patient)
    camera_report = _camera_flags_to_report(camera_flags or {})
    diagnosis = build_combined_diagnosis(camera_report, sensors)

    return {
        "rule_result": rule_result,
        "camera_report": camera_report,
        "combined_diagnosis": diagnosis,
    }
