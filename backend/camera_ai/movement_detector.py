import cv2
import time
import numpy as np
from collections import deque


class MovementDetector:
    def __init__(self):
        self.prev_gray = None
        self.still_start_time = None

        # Store recent motion values (smoothing)
        self.motion_history = deque(maxlen=10)

        # Motion threshold (tunable)
        self.MOTION_THRESHOLD = 800

    def detect_movement(self, frame):
        h, w, _ = frame.shape

        # 🔹 ROI: upper body area (ignore background)
        roi = frame[int(0.2 * h):int(0.7 * h), int(0.2 * w):int(0.8 * w)]

        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (7, 7), 0)

        if self.prev_gray is None:
            self.prev_gray = gray
            return self._result("Initializing", "Low")

        diff = cv2.absdiff(self.prev_gray, gray)
        _, thresh = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)

        motion_pixels = cv2.countNonZero(thresh)
        self.motion_history.append(motion_pixels)

        avg_motion = sum(self.motion_history) / len(self.motion_history)
        current_time = time.time()

        # 🔹 MOVEMENT LOGIC
        if avg_motion > self.MOTION_THRESHOLD:
            self.still_start_time = None
            status = "Movement Detected"
            risk = "Low"

        else:
            if self.still_start_time is None:
                self.still_start_time = current_time

            still_duration = current_time - self.still_start_time

            if still_duration < 5:
                status = "Minimal Movement"
                risk = "Low"
            elif still_duration < 10:
                status = "Still"
                risk = "Medium"
            else:
                status = "No Movement (Suspected Unconscious)"
                risk = "High"

        self.prev_gray = gray

        return self._result(status, risk)

    def _result(self, status, risk):
        return {
            "status": status,
            "risk_level": risk
        }
