from collections import deque

try:
    from camera_ai.bleeding_detector import detect_bleeding
    from camera_ai.movement_detector import MovementDetector
    from camera_ai.posture_detector import PostureDetector
except ImportError:
    from bleeding_detector import detect_bleeding
    from movement_detector import MovementDetector
    from posture_detector import PostureDetector

_posture_detector = PostureDetector()
_movement_detector = MovementDetector()

_bleeding_window = deque(maxlen=5)
_movement_window = deque(maxlen=5)
_posture_window = deque(maxlen=5)
_RISK_ORDER = {"Low": 1, "Medium": 2, "High": 3}


def _sanitize_risk(value, default="Low"):
    normalized = str(value).title()
    return normalized if normalized in _RISK_ORDER else default


def _smoothed_risk(window, current_risk, min_votes=3):
    normalized_risk = _sanitize_risk(current_risk)
    window.append(normalized_risk)

    counts = {
        "Low": window.count("Low"),
        "Medium": window.count("Medium"),
        "High": window.count("High"),
    }

    for risk in ("High", "Medium", "Low"):
        if counts[risk] >= min_votes:
            return risk

    return max(("Low", "Medium", "High"), key=lambda risk: (counts[risk], _RISK_ORDER[risk]))


def analyze_frame(frame):
    flags = {
        "possible_bleeding": False,
        "no_movement_detected": False,
        "abnormal_posture": False,
        "bleeding_risk": "Low",
        "movement_risk": "Low",
        "posture_risk": "Low",
        "bleeding_confidence": 0.0,
        "skin_coverage": 0.0,
        "skin_pixels": 0,
        "skin_red_pixels": 0,
        "red_pixels": 0,
        "bleeding_low_threshold": 0.0,
        "bleeding_high_threshold": 0.0,
        "avg_brightness": 0.0,
    }

    bleeding_result = detect_bleeding(frame)
    bleeding_risk = _sanitize_risk(bleeding_result.get("risk_level", "Low"))
    flags["bleeding_confidence"] = float(bleeding_result.get("confidence", 0.0) or 0.0)
    flags["skin_coverage"] = float(bleeding_result.get("skin_coverage", 0.0) or 0.0)
    flags["skin_pixels"] = int(bleeding_result.get("skin_pixels", 0) or 0)
    flags["skin_red_pixels"] = int(bleeding_result.get("skin_red_pixels", 0) or 0)
    flags["red_pixels"] = int(bleeding_result.get("red_pixels", 0) or 0)
    flags["bleeding_low_threshold"] = float(bleeding_result.get("low_threshold", 0.0) or 0.0)
    flags["bleeding_high_threshold"] = float(bleeding_result.get("high_threshold", 0.0) or 0.0)
    flags["avg_brightness"] = float(bleeding_result.get("avg_brightness", 0.0) or 0.0)

    movement_result = _movement_detector.detect_movement(frame)
    movement_risk = _sanitize_risk(movement_result.get("risk_level", "Low"))

    posture_result = _posture_detector.detect_posture(frame)
    posture_risk = _sanitize_risk(posture_result.get("risk_level", "Low"))

    smoothed_bleeding_risk = _smoothed_risk(_bleeding_window, bleeding_risk)
    smoothed_movement_risk = _smoothed_risk(_movement_window, movement_risk)
    smoothed_posture_risk = _smoothed_risk(_posture_window, posture_risk)

    flags["bleeding_risk"] = smoothed_bleeding_risk
    flags["movement_risk"] = smoothed_movement_risk
    flags["posture_risk"] = smoothed_posture_risk

    flags["possible_bleeding"] = smoothed_bleeding_risk in ("Medium", "High")
    flags["no_movement_detected"] = smoothed_movement_risk == "High"
    flags["abnormal_posture"] = smoothed_posture_risk in ("Medium", "High")

    return flags
