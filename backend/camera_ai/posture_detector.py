import cv2
import numpy as np

class PostureDetector:
    def __init__(self):
        self.bg_subtractor = cv2.createBackgroundSubtractorMOG2()

    def detect_posture(self, frame):
        fg_mask = self.bg_subtractor.apply(frame)

        # Clean noise
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)

        contours, _ = cv2.findContours(
            fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        if not contours:
            return self._result("Unknown", "Low")

        # Largest contour assumed as body
        largest = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(largest)

        if area < 3000:
            return self._result("Unknown", "Low")

        x, y, w, h = cv2.boundingRect(largest) 
        aspect_ratio = w / float(h)

        # -----------------------------
        # Posture Logic
        # -----------------------------
        if aspect_ratio > 1.2:
            posture = "Lying / Horizontal"
            risk = "Medium"
        elif aspect_ratio < 0.7:
            posture = "Upright / Seated"
            risk = "Low"
        else:
            posture = "Collapsed / Slumped"
            risk = "High"

        return self._result(posture, risk)

    def _result(self, posture, risk):
        return {
            "posture": posture,
            "risk_level": risk
        }
