import os

import cv2
import numpy as np


def _get_env_float(name, default):
    raw_value = os.getenv(name)
    if raw_value is None:
        return float(default)
    try:
        return float(raw_value)
    except ValueError:
        return float(default)


def _clamp(value, minimum, maximum):
    return max(minimum, min(value, maximum))


# -------------------------------
# Skin Detection
# -------------------------------
def detect_skin(frame):
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    ycrcb = cv2.cvtColor(frame, cv2.COLOR_BGR2YCrCb)

    hsv_lower_skin = np.array([0, 35, 60], dtype=np.uint8)
    hsv_upper_skin = np.array([25, 185, 255], dtype=np.uint8)

    ycrcb_lower_skin = np.array([0, 133, 77], dtype=np.uint8)
    ycrcb_upper_skin = np.array([255, 173, 127], dtype=np.uint8)

    hsv_mask = cv2.inRange(hsv, hsv_lower_skin, hsv_upper_skin)
    ycrcb_mask = cv2.inRange(ycrcb, ycrcb_lower_skin, ycrcb_upper_skin)

    mask = cv2.bitwise_and(hsv_mask, ycrcb_mask)
    kernel = np.ones((3, 3), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.GaussianBlur(mask, (5, 5), 0)

    return mask


def _extract_exposed_skin_roi(skin_mask, frame_pixels):
    contours, _ = cv2.findContours(skin_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    min_skin_area = max(int(frame_pixels * 0.004), 500)

    exposed_skin_mask = np.zeros_like(skin_mask)
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < min_skin_area:
            continue
        cv2.drawContours(exposed_skin_mask, [contour], -1, 255, thickness=cv2.FILLED)

    erosion_kernel = np.ones((5, 5), np.uint8)
    exposed_skin_mask = cv2.erode(exposed_skin_mask, erosion_kernel, iterations=1)
    exposed_skin_mask = cv2.GaussianBlur(exposed_skin_mask, (3, 3), 0)
    _, exposed_skin_mask = cv2.threshold(exposed_skin_mask, 100, 255, cv2.THRESH_BINARY)

    return exposed_skin_mask


# -------------------------------
# Bleeding Detection (ROBUST + CALIBRATED)
# -------------------------------
def detect_bleeding(frame):
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    frame_height, frame_width = frame.shape[:2]
    frame_pixels = max(frame_height * frame_width, 1)

    calibration_sensitivity = _clamp(_get_env_float("BLEEDING_SENSITIVITY", 1.0), 0.6, 1.8)
    threshold_scale = _clamp(_get_env_float("BLEEDING_THRESHOLD_SCALE", 1.0), 0.6, 1.8)
    base_low_threshold = _clamp(_get_env_float("BLEEDING_LOW_THRESHOLD", 1.8), 0.4, 8.0)
    base_high_threshold = _clamp(_get_env_float("BLEEDING_HIGH_THRESHOLD", 5.0), 1.0, 20.0)

    avg_brightness = float(np.mean(hsv[:, :, 2]))
    sat_floor = int(_clamp(125 - ((avg_brightness - 100.0) * 0.18), 95, 145))
    val_floor = int(_clamp(60 - ((avg_brightness - 100.0) * 0.10), 45, 85))

    # Red color ranges (adaptive to brightness)
    lower_red1 = np.array([0, sat_floor, val_floor])
    upper_red1 = np.array([10, 255, 255])
    lower_red2 = np.array([170, sat_floor, val_floor])
    upper_red2 = np.array([180, 255, 255])

    red_mask = (
        cv2.inRange(hsv, lower_red1, upper_red1)
        + cv2.inRange(hsv, lower_red2, upper_red2)
    )

    # Additional red-dominance gate in BGR space to suppress skin-tone false positives
    b_channel, g_channel, r_channel = cv2.split(frame)
    b_channel = b_channel.astype(np.float32)
    g_channel = g_channel.astype(np.float32)
    r_channel = r_channel.astype(np.float32)

    red_dominance = (
        (r_channel > g_channel * 1.18)
        & (r_channel > b_channel * 1.18)
        & ((r_channel - g_channel) > 22)
        & ((r_channel - b_channel) > 22)
    )
    red_dominance_mask = (red_dominance.astype(np.uint8)) * 255
    red_mask = cv2.bitwise_and(red_mask, red_dominance_mask)

    kernel = np.ones((3, 3), np.uint8)
    red_mask = cv2.morphologyEx(red_mask, cv2.MORPH_OPEN, kernel)
    red_mask = cv2.morphologyEx(red_mask, cv2.MORPH_CLOSE, kernel)

    skin_mask = detect_skin(frame)
    exposed_skin_mask = _extract_exposed_skin_roi(skin_mask, frame_pixels)

    # Only red on skin
    bleeding_mask = cv2.bitwise_and(red_mask, exposed_skin_mask)

    contours, _ = cv2.findContours(
        bleeding_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    valid_bleed_area = 0
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < 120:
            continue
        valid_bleed_area += area

    skin_pixels = cv2.countNonZero(exposed_skin_mask)
    skin_red_pixels = cv2.countNonZero(bleeding_mask)
    red_pixels = cv2.countNonZero(red_mask)

    skin_confidence = 0.0
    if skin_pixels > 0:
        skin_confidence = (skin_red_pixels / skin_pixels) * 100

    global_confidence = (red_pixels / frame_pixels) * 100
    contour_confidence = (valid_bleed_area / frame_pixels) * 100

    skin_coverage = skin_pixels / frame_pixels
    if skin_coverage < 0.08:
        confidence = (0.35 * skin_confidence) + (0.50 * global_confidence) + (0.15 * contour_confidence)
    else:
        confidence = (0.55 * skin_confidence) + (0.35 * global_confidence) + (0.10 * contour_confidence)

    # Adaptive compensation
    low_light_boost = _clamp(95.0 / max(avg_brightness, 45.0), 1.0, 1.18)
    distance_boost = _clamp(0.10 / max(skin_coverage, 0.10), 1.0, 1.10)
    confidence = confidence * low_light_boost * distance_boost * calibration_sensitivity

    low_threshold = base_low_threshold * threshold_scale
    high_threshold = base_high_threshold * threshold_scale
    high_threshold = max(high_threshold, low_threshold + 0.4)

    # Guard for tiny red speckles / sensor noise
    if red_pixels < 180 and skin_red_pixels < 120:
        confidence = 0.0

    # Final decision
    if confidence < low_threshold:
        bleeding = False
        risk = "Low"
    elif confidence < high_threshold:
        bleeding = True
        risk = "Medium"
    else:
        bleeding = True
        risk = "High" if (skin_confidence >= 2.2 or contour_confidence >= 0.65) else "Medium"

    return {
        "bleeding_detected": bleeding,
        "risk_level": risk,
        "confidence": round(confidence, 2),
        "skin_coverage": round(skin_coverage, 4),
        "skin_pixels": int(skin_pixels),
        "skin_red_pixels": int(skin_red_pixels),
        "red_pixels": int(red_pixels),
        "low_threshold": round(low_threshold, 2),
        "high_threshold": round(high_threshold, 2),
        "avg_brightness": round(avg_brightness, 2),
        "suspected_condition": (
            "Possible external bleeding on exposed skin"
            if bleeding
            else "No visible external bleeding"
        ),
    }
