import json
from camera_ai.diagnostic_engine import generate_diagnosis


def generate_camera_report(bleeding_risk, movement_risk, posture_risk):
    report = {}

    # 🩸 Bleeding summary
    if bleeding_risk == "High":
        report["bleeding_summary"] = (
            "Camera analysis indicates a high probability of external bleeding near exposed skin areas. "
            "Immediate medical attention is advised to control potential blood loss."
        )
    elif bleeding_risk == "Medium":
        report["bleeding_summary"] = (
            "Camera analysis suggests possible minor external bleeding. "
            "Continuous monitoring and visual inspection are recommended."
        )
    else:
        report["bleeding_summary"] = (
            "No visible signs of external bleeding were detected from camera analysis."
        )

    # 🏃 Movement summary
    if movement_risk == "High":
        report["movement_summary"] = (
            "Minimal or no body movement was observed for a prolonged duration, "
            "suggesting possible unconsciousness or severe distress."
        )
    elif movement_risk == "Medium":
        report["movement_summary"] = (
            "Reduced movement activity was observed. The patient may be weak or semi-responsive."
        )
    else:
        report["movement_summary"] = (
            "Normal body movement was observed, indicating responsiveness."
        )

    # 🛌 Posture summary
    if posture_risk == "High":
        report["posture_summary"] = (
            "Patient posture indicates a lying or collapsed position, "
            "which may suggest unconsciousness or serious injury."
        )
    elif posture_risk == "Medium":
        report["posture_summary"] = (
            "Patient posture appears abnormal and may require further assessment."
        )
    else:
        report["posture_summary"] = (
            "Patient posture appears normal with no critical abnormalities detected."
        )

    # 🧠 Diagnostic intelligence – probable condition + hospital prep
    diagnosis = generate_diagnosis(bleeding_risk, movement_risk, posture_risk)
    report["diagnosis"] = diagnosis

    return report
