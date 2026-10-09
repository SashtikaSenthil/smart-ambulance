import time
import re
import urllib.request

from hardware.sensors import (
    HeartRateSensor,
    SpO2Sensor,
    TemperatureSensor,
    RespirationSensor,
    BloodPressureSensor,
    ECGSensor
)

class VirtualESP32:
    """
    Simulates ESP32 firmware:
    - owns sensors
    - polls them synchronously
    - outputs unified telemetry
    """

    def __init__(
        self,
        device_id="AMB_SIM_01",
        iot_table_url="https://iotwebserver.in/table.php?id=gg21dtjn",
        iot_timeout_seconds=5
    ):
        self.device_id = device_id
        self.iot_table_url = iot_table_url
        self.iot_timeout_seconds = iot_timeout_seconds

        # Sensor wiring (conceptual)
        self.hr_sensor = HeartRateSensor()
        self.spo2_sensor = SpO2Sensor()
        self.temp_sensor = TemperatureSensor()
        self.resp_sensor = RespirationSensor()
        self.bp_sensor = BloodPressureSensor()
        self.ecg_sensor = ECGSensor()

    def _extract_latest_iot_values(self):
        try:
            with urllib.request.urlopen(self.iot_table_url, timeout=self.iot_timeout_seconds) as response:
                html = response.read().decode("utf-8", errors="ignore")
        except Exception:
            return None

        rows = re.findall(r"<tr[^>]*>(.*?)</tr>", html, flags=re.IGNORECASE | re.DOTALL)
        if not rows:
            return None

        for row in reversed(rows):
            cells = re.findall(r"<td[^>]*>(.*?)</td>", row, flags=re.IGNORECASE | re.DOTALL)
            if len(cells) < 4:
                continue

            def to_number(value):
                text = re.sub(r"<[^>]+>", "", value).replace("&nbsp;", " ").strip()
                if text == "":
                    return None
                match = re.search(r"-?\d+(?:\.\d+)?", text)
                if not match:
                    return None
                raw = match.group(0)
                return float(raw) if "." in raw else int(raw)

            heartbeat = to_number(cells[1])
            temperature = to_number(cells[2])
            spo2 = to_number(cells[3])

            if heartbeat is None and temperature is None and spo2 is None:
                continue

            return {
                "heart_rate": int(heartbeat) if heartbeat is not None else None,
                "temp": float(temperature) if temperature is not None else None,
                "spo2": int(spo2) if spo2 is not None else None,
            }

        return None

    def read_packet(self):
        """
        Read all sensors and return a single ESP32-style packet
        """
        heart_rate = self.hr_sensor.read()
        spo2 = self.spo2_sensor.read()
        temp = self.temp_sensor.read()
        blood_pressure = self.bp_sensor.read()
        resp_rate = self.resp_sensor.read()

        iot_values = self._extract_latest_iot_values()
        if iot_values:
            if iot_values.get("heart_rate") is not None:
                heart_rate = iot_values["heart_rate"]
            if iot_values.get("spo2") is not None:
                spo2 = iot_values["spo2"]
            if iot_values.get("temp") is not None:
                temp = iot_values["temp"]

        packet = {
            "device_id": self.device_id,
            "timestamp": time.time(),

            # Raw sensor outputs
            "heart_rate": heart_rate,
            "spo2": spo2,
            "temp": temp,
            "resp_rate": resp_rate,
            "blood_pressure": blood_pressure,
            "ecg_status": self.ecg_sensor.read(heart_rate)
        }

        return packet
