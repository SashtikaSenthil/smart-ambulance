"""Camera report loading and the live camera analysis service (moved from ambulance_system/app.py)."""

import json
import os
import threading
import time

from camera_ai.diagnostic_engine import generate_diagnosis
from config import BASE_DIR

CAMERA_REPORT_PATH = os.path.join(BASE_DIR, "camera_ai", "camera_report.json")

cv2 = None
CameraAnalysisEngine = None
CAMERA_IMPORT_ERROR = None

PENDING_CAMERA_SUMMARY = "Camera analysis not yet completed."
IN_PROGRESS_CAMERA_SUMMARY = "Camera analysis in progress."


def initialize_camera_dependencies():
    global cv2, CameraAnalysisEngine, CAMERA_IMPORT_ERROR

    if cv2 is not None and CameraAnalysisEngine is not None:
        return True

    try:
        import cv2 as cv2_module
        from camera_ai.camera_core import CameraAnalysisEngine as engine_class

        cv2 = cv2_module
        CameraAnalysisEngine = engine_class
        CAMERA_IMPORT_ERROR = None
        return True
    except Exception as exc:
        CAMERA_IMPORT_ERROR = str(exc)
        return False


# ----------------------------
# Load Camera Report
# ----------------------------
def load_camera_report():
    path = CAMERA_REPORT_PATH
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                report = json.load(f)
        except (json.JSONDecodeError, OSError):
            return None

        bleeding_risk = str(report.get("bleeding_risk", "Pending")).title()
        movement_risk = str(report.get("movement_risk", "Pending")).title()
        posture_risk = str(report.get("posture_risk", "Pending")).title()

        risk_order = {"Pending": 0, "Low": 1, "Medium": 2, "High": 3}
        overall_risk = max(
            [bleeding_risk, movement_risk, posture_risk],
            key=lambda level: risk_order.get(level, 0)
        )

        summary = report.get("summary")
        if not summary:
            summary = [
                f"Visual analysis indicates {bleeding_risk.lower()} bleeding risk.",
                f"Movement pattern classified as {movement_risk.lower()} risk.",
                f"Body posture assessment shows {posture_risk.lower()} risk."
            ]

        # Load diagnosis from report or generate it fresh
        diagnosis = report.get("diagnosis")
        if not diagnosis:
            diagnosis = generate_diagnosis(bleeding_risk, movement_risk, posture_risk)

        return {
            "bleeding_risk": bleeding_risk,
            "movement_risk": movement_risk,
            "posture_risk": posture_risk,
            "overall_risk": overall_risk,
            "summary": summary,
            "diagnosis": diagnosis
        }
    return None


def pending_camera_report(summary_line=PENDING_CAMERA_SUMMARY):
    return {
        "bleeding_risk": "Pending",
        "movement_risk": "Pending",
        "posture_risk": "Pending",
        "overall_risk": "Pending",
        "summary": [summary_line]
    }


def load_camera_report_or_pending(summary_line=PENDING_CAMERA_SUMMARY):
    return load_camera_report() or pending_camera_report(summary_line)


# ----------------------------
# Live camera service
# ----------------------------
camera_analysis_lock = threading.Lock()
camera_analysis_engine = None

if initialize_camera_dependencies():
    camera_analysis_engine = CameraAnalysisEngine(
        report_path=CAMERA_REPORT_PATH,
        observation_time=60
    )


class LiveCameraService:
    def __init__(self, analysis_engine, analysis_lock, camera_index=0):
        self.analysis_engine = analysis_engine
        self.analysis_lock = analysis_lock
        self.camera_index = camera_index
        self.thread = None
        self.running = False
        self.latest_jpeg = None
        self.frame_ready = threading.Condition()
        self.thread_guard = threading.Lock()

    def start(self):
        if self.analysis_engine is None or cv2 is None:
            return

        with self.thread_guard:
            if self.running and self.thread and self.thread.is_alive():
                return

            self.running = True
            self.thread = threading.Thread(target=self._capture_loop, daemon=True)
            self.thread.start()

    def _capture_loop(self):
        camera = cv2.VideoCapture(self.camera_index)

        if not camera.isOpened():
            with self.frame_ready:
                self.latest_jpeg = None
                self.frame_ready.notify_all()
            self.running = False
            return

        try:
            while self.running:
                success, frame = camera.read()
                if not success:
                    time.sleep(0.02)
                    continue

                with self.analysis_lock:
                    analyzed_frame = self.analysis_engine.process_frame(frame)

                encoded, buffer = cv2.imencode('.jpg', analyzed_frame)
                if not encoded:
                    continue

                with self.frame_ready:
                    self.latest_jpeg = buffer.tobytes()
                    self.frame_ready.notify_all()
        finally:
            camera.release()
            self.running = False

    def get_frame(self, timeout=2.0):
        self.start()
        with self.frame_ready:
            if self.latest_jpeg is None:
                self.frame_ready.wait(timeout=timeout)
            return self.latest_jpeg


live_camera_service = LiveCameraService(
    analysis_engine=camera_analysis_engine,
    analysis_lock=camera_analysis_lock,
    camera_index=0
)


def camera_available():
    return live_camera_service.analysis_engine is not None and cv2 is not None
