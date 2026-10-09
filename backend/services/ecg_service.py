"""External ECG feed polling (moved from ambulance_system/app.py)."""

import json
import re
import threading
from urllib.error import URLError
from urllib.request import urlopen

EXTERNAL_ECG_URL = "https://iotwebserver.in/ECG.php"
ECG_SERIES_LIMIT = 100

ecg_series_lock = threading.Lock()
ecg_series_history = []


def _to_float(value):
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _extract_numeric_from_payload(payload):
    if isinstance(payload, (int, float)):
        return float(payload)

    if isinstance(payload, list):
        for item in reversed(payload):
            candidate = _extract_numeric_from_payload(item)
            if candidate is not None:
                return candidate
        return None

    if isinstance(payload, dict):
        for key in ("ecg", "ecg_value", "value", "signal", "reading", "data"):
            if key in payload:
                candidate = _extract_numeric_from_payload(payload.get(key))
                if candidate is not None:
                    return candidate

        for value in payload.values():
            candidate = _extract_numeric_from_payload(value)
            if candidate is not None:
                return candidate
        return None

    if isinstance(payload, str):
        matches = re.findall(r"-?\d+(?:\.\d+)?", payload)
        if not matches:
            return None
        return _to_float(matches[-1])

    return None


def fetch_external_ecg_sample():
    try:
        with urlopen(EXTERNAL_ECG_URL, timeout=3) as response:
            body = response.read().decode("utf-8", errors="ignore").strip()
    except (URLError, TimeoutError, OSError):
        return None

    if not body:
        return None

    try:
        parsed = json.loads(body)
        value = _extract_numeric_from_payload(parsed)
        if value is not None:
            return value
    except json.JSONDecodeError:
        pass

    return _extract_numeric_from_payload(body)


def get_ecg_series():
    """Fetch one sample, append it to the rolling series and return the payload served by /ecg-data."""
    sample = fetch_external_ecg_sample()

    with ecg_series_lock:
        if sample is not None:
            ecg_series_history.append(sample)

        if not ecg_series_history:
            ecg_series_history.extend([0.0] * ECG_SERIES_LIMIT)

        if len(ecg_series_history) > ECG_SERIES_LIMIT:
            del ecg_series_history[:-ECG_SERIES_LIMIT]

        series_snapshot = list(ecg_series_history)

    labels = list(range(len(series_snapshot)))
    return {
        "source": EXTERNAL_ECG_URL,
        "value": sample,
        "labels": labels,
        "series": series_snapshot
    }
