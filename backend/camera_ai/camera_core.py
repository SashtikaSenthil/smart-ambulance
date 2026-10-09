import cv2
import json
import os
import time

try:
    from ai.camera_engine import analyze_frame
    from camera_ai.diagnostic_engine import generate_diagnosis
except ImportError:
    from ai.camera_engine import analyze_frame
    from camera_ai.diagnostic_engine import generate_diagnosis


class CameraAnalysisEngine:
    def __init__(self, report_path=None, observation_time=60):
        self.report_path = report_path or os.path.join("camera_ai", "camera_report.json")
        self.observation_time = observation_time
        self.calibration_mode = str(os.getenv("BLEEDING_CALIBRATION_MODE", "0")).strip().lower() in (
            "1",
            "true",
            "yes",
            "on",
        )
        self.calibration_interval_sec = max(float(os.getenv("BLEEDING_CALIBRATION_INTERVAL", "1.0")), 0.2)
        self.last_calibration_log_ts = 0.0
        self.reset()

    def reset(self):
        self.latest_flags = {
            "possible_bleeding": False,
            "no_movement_detected": False,
            "abnormal_posture": False,
        }
        self.start_time = time.time()

    def _flags_to_risks(self, flags):
        bleeding_risk = str(flags.get("bleeding_risk", "")).title()
        if bleeding_risk not in ("Low", "Medium", "High"):
            bleeding_risk = "High" if flags.get("possible_bleeding") else "Low"

        movement_risk = str(flags.get("movement_risk", "")).title()
        if movement_risk not in ("Low", "Medium", "High"):
            movement_risk = "High" if flags.get("no_movement_detected") else "Low"

        posture_risk = str(flags.get("posture_risk", "")).title()
        if posture_risk not in ("Low", "Medium", "High"):
            posture_risk = "Medium" if flags.get("abnormal_posture") else "Low"

        return {
            "bleeding_risk": bleeding_risk,
            "movement_risk": movement_risk,
            "posture_risk": posture_risk,
        }

    def _build_report(self, bleeding_risk, movement_risk, posture_risk):
        diagnosis = generate_diagnosis(bleeding_risk, movement_risk, posture_risk)
        return {
            "bleeding_risk": bleeding_risk,
            "movement_risk": movement_risk,
            "posture_risk": posture_risk,
            "summary": [
                f"Visual analysis indicates {bleeding_risk.lower()} bleeding risk.",
                f"Movement pattern classified as {movement_risk.lower()} risk.",
                f"Body posture assessment shows {posture_risk.lower()} risk."
            ],
            "diagnosis": diagnosis
        }

    def _write_report(self, report):
        report_dir = os.path.dirname(self.report_path)
        if report_dir:
            os.makedirs(report_dir, exist_ok=True)
        with open(self.report_path, "w", encoding="utf-8") as report_file:
            json.dump(report, report_file, indent=4)

    def process_frame(self, frame):
        flags = analyze_frame(frame)
        self.latest_flags = flags

        risks = self._flags_to_risks(flags)
        report = self._build_report(
            risks["bleeding_risk"],
            risks["movement_risk"],
            risks["posture_risk"],
        )
        self._write_report(report)

        cv2.putText(
            frame,
            f"Bleeding: {risks['bleeding_risk']}",
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 0, 255) if flags.get("possible_bleeding") else (0, 200, 0),
            2,
        )
        cv2.putText(
            frame,
            f"Movement: {risks['movement_risk']}",
            (20, 80),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 0, 255) if flags.get("no_movement_detected") else (0, 200, 0),
            2,
        )
        cv2.putText(
            frame,
            f"Posture: {risks['posture_risk']}",
            (20, 120),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 165, 255) if flags.get("abnormal_posture") else (0, 200, 0),
            2,
        )

        if self.calibration_mode:
            now = time.time()
            if (now - self.last_calibration_log_ts) >= self.calibration_interval_sec:
                self.last_calibration_log_ts = now
                print(
                    (
                        "[BLEEDING_CAL] "
                        f"risk={risks['bleeding_risk']} "
                        f"confidence={float(flags.get('bleeding_confidence', 0.0)):.2f} "
                        f"skin_coverage={float(flags.get('skin_coverage', 0.0)):.4f} "
                        f"skin_pixels={int(flags.get('skin_pixels', 0))} "
                        f"skin_red_pixels={int(flags.get('skin_red_pixels', 0))} "
                        f"red_pixels={int(flags.get('red_pixels', 0))} "
                        f"thr_low={float(flags.get('bleeding_low_threshold', 0.0)):.2f} "
                        f"thr_high={float(flags.get('bleeding_high_threshold', 0.0)):.2f} "
                        f"brightness={float(flags.get('avg_brightness', 0.0)):.2f}"
                    )
                )

        return frame

    def get_runtime_status(self):
        risks = self._flags_to_risks(self.latest_flags)
        elapsed = time.time() - self.start_time
        remaining = max(int(self.observation_time - elapsed), 0)
        phase = "completed" if remaining == 0 else "running"
        return {
            "phase": phase,
            "remaining_seconds": remaining,
            "bleeding_risk": risks["bleeding_risk"],
            "movement_risk": risks["movement_risk"],
            "posture_risk": risks["posture_risk"],
        }


def run_camera_core():
    engine = CameraAnalysisEngine()
    if os.name == "nt":
        camera = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    else:
        camera = cv2.VideoCapture(0)

    if not camera.isOpened():
        camera.release()
        raise RuntimeError(
            "Unable to open camera device 0. Close other apps using the camera and try again."
        )

    try:
        while True:
            success, frame = camera.read()
            if not success:
                break

            analyzed_frame = engine.process_frame(frame)
            cv2.imshow("Ambulance Camera Feed", analyzed_frame)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    except KeyboardInterrupt:
        print("Camera capture interrupted by user.")
    finally:
        camera.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    run_camera_core()
