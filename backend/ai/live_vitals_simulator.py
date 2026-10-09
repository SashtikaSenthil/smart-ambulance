"""
AI Ambulance Assistance System
File: ai/live_vitals_simulator.py

DEMO MODE ONLY:
- Turns the single stored demo assessment into a continuously changing
  stream of vital signs.
- Values drift smoothly around the current scenario and, every 1-2 minutes,
  gradually shift toward another scenario (deterioration or recovery).
- Output keys match assessment["sensors"] so the existing formatters and
  rule engines can consume it unchanged.
"""

import random
import threading
import time
from collections import deque
from typing import Any

from ai.emergency_prediction_30 import DEMO_SCENARIOS, generate_sensor_values


# Seconds of wall time represented by one simulation step.
TICK_SECONDS = 2.0

# Never simulate more than this many steps per call (e.g. after a long idle).
MAX_STEPS_PER_CALL = 5

# Fraction of the gap to the target closed on each step.
DRIFT_RATE = 0.08

# Steps after a scenario shift before the ECG status follows the new target
# (about 50% of the drift has happened by then).
ECG_SWITCH_STEPS = 8

# Probability that a scenario shift is a recovery toward normal values.
RECOVERY_PROBABILITY = 0.35

SHIFT_INTERVAL_SECONDS = (60, 120)

HISTORY_LENGTH = 150

NUMERIC_KEYS = (
    "heart_rate", "spo2", "hb", "temp",
    "resp_rate", "systolic_bp", "diastolic_bp",
)

NOISE_SIGMA = {
    "heart_rate": 1.5,
    "spo2": 0.4,
    "hb": 0.02,
    "temp": 0.05,
    "resp_rate": 0.6,
    "systolic_bp": 2.0,
    "diastolic_bp": 1.5,
}

PHYSIOLOGICAL_LIMITS = {
    "heart_rate": (25, 220),
    "spo2": (60, 100),
    "hb": (3.0, 20.0),
    "temp": (86.0, 108.0),
    "resp_rate": (4, 50),
    "systolic_bp": (50, 250),
    "diastolic_bp": (25, 160),
}

RECOVERY_SCENARIO = {"id": 0, "name": "Stabilising / Recovery", "profile": "stable"}


class LiveVitalsSimulator:
    """Thread-safe, time-based random-walk vital sign generator."""

    def __init__(self, clock=time.monotonic, rng=None):
        self._clock = clock
        self._rng = rng or random.Random()
        self._lock = threading.Lock()

        self._assessment_id = None
        self._scenario = None
        self._current = {}
        self._target = {}
        self._ecg_status = "Simulated normal rhythm"
        self._target_ecg_status = self._ecg_status
        self._steps_since_shift = 0
        self._last_tick = None
        self._next_shift_at = None
        self._previous = None
        self._history = deque(maxlen=HISTORY_LENGTH)
        self._wall_offset = time.time() - self._clock()

    # ----------------------------
    # Seeding
    # ----------------------------

    def sync_with_assessment(self, assessment: dict[str, Any]) -> None:
        """Seed from the stored assessment; re-seed only when it changes."""
        assessment_id = assessment.get("assessment_id")
        with self._lock:
            if self._assessment_id == assessment_id and self._current:
                return

            sensors = assessment.get("sensors", {})
            scenario = assessment.get("scenario", {}) or {}
            profile = next(
                (s["profile"] for s in DEMO_SCENARIOS if s["id"] == scenario.get("id")),
                "stable",
            )

            self._assessment_id = assessment_id
            self._scenario = {
                "id": scenario.get("id", 0),
                "name": scenario.get("name", "Unknown"),
                "profile": profile,
            }
            self._current = {
                key: float(sensors.get(key, 0) or 0) for key in NUMERIC_KEYS
            }
            self._clamp(self._current)
            self._target = dict(self._current)
            self._ecg_status = str(sensors.get("ecg_status", "Simulated normal rhythm"))
            self._target_ecg_status = self._ecg_status
            self._steps_since_shift = ECG_SWITCH_STEPS

            now = self._clock()
            self._last_tick = now
            self._schedule_next_shift(now)

            self._history.clear()
            self._previous = None
            self._history.append(self._snapshot(self._clock() + self._wall_offset))

    # ----------------------------
    # Simulation
    # ----------------------------

    def advance(self) -> dict[str, Any]:
        """
        Advance the simulation according to elapsed wall time and return
        {"raw", "previous", "history", "scenario"}.
        """
        with self._lock:
            if not self._current:
                raise RuntimeError("Simulator has not been seeded yet.")

            now = self._clock()
            elapsed = now - self._last_tick
            steps = min(int(elapsed // TICK_SECONDS), MAX_STEPS_PER_CALL)

            if steps > 0:
                self._last_tick = now if steps == MAX_STEPS_PER_CALL else self._last_tick + steps * TICK_SECONDS
                for _ in range(steps):
                    if now >= self._next_shift_at:
                        self._shift_scenario()
                        self._schedule_next_shift(now)
                    self._step()

                self._previous = self._history[-1] if self._history else None
                self._history.append(self._snapshot(self._clock() + self._wall_offset))

            return {
                "raw": dict(self._history[-1]),
                "previous": dict(self._previous) if self._previous else None,
                "history": [dict(entry) for entry in self._history],
                "scenario": dict(self._scenario),
            }

    def _step(self) -> None:
        for key in NUMERIC_KEYS:
            gap = self._target[key] - self._current[key]
            self._current[key] += gap * DRIFT_RATE + self._rng.gauss(0, NOISE_SIGMA[key])
        self._clamp(self._current)

        self._steps_since_shift += 1
        if self._steps_since_shift >= ECG_SWITCH_STEPS:
            self._ecg_status = self._target_ecg_status

    def _shift_scenario(self) -> None:
        if self._rng.random() < RECOVERY_PROBABILITY:
            scenario = RECOVERY_SCENARIO
        else:
            candidates = [s for s in DEMO_SCENARIOS if s["id"] != self._scenario.get("id")]
            scenario = self._rng.choice(candidates)

        target = generate_sensor_values(scenario["profile"])
        self._scenario = dict(scenario)
        self._target = {key: float(target[key]) for key in NUMERIC_KEYS}
        self._clamp(self._target)
        self._target_ecg_status = str(target["ecg_status"])
        self._steps_since_shift = 0

    def _schedule_next_shift(self, now: float) -> None:
        low, high = SHIFT_INTERVAL_SECONDS
        self._next_shift_at = now + self._rng.uniform(low, high)

    @staticmethod
    def _clamp(values: dict[str, float]) -> None:
        for key, (low, high) in PHYSIOLOGICAL_LIMITS.items():
            values[key] = max(low, min(high, values[key]))
        # Keep a physiological pulse pressure (diastolic below systolic).
        values["diastolic_bp"] = min(values["diastolic_bp"], values["systolic_bp"] - 15)

    def _snapshot(self, timestamp: float) -> dict[str, Any]:
        systolic = int(round(self._current["systolic_bp"]))
        diastolic = int(round(self._current["diastolic_bp"]))
        return {
            "timestamp": round(timestamp, 3),
            "heart_rate": int(round(self._current["heart_rate"])),
            "spo2": int(round(self._current["spo2"])),
            "hb": round(self._current["hb"], 1),
            "temp": round(self._current["temp"], 1),
            "resp_rate": int(round(self._current["resp_rate"])),
            "systolic_bp": systolic,
            "diastolic_bp": diastolic,
            "ecg_status": self._ecg_status,
            "blood_pressure": f"{systolic}/{diastolic}",
        }
