"""Virtual ESP32 / simulated sensor wiring (moved from ambulance_system/app.py).

Not used by any route at the moment (same as the original app), kept for the hardware integration.
"""

from hardware.esp32_firmware import VirtualESP32
from hardware.sensors import (
    HeartRateSensor,
    SpO2Sensor,
    TemperatureSensor,
    RespirationSensor,
    BloodPressureSensor,
    ECGSensor
)

esp32 = VirtualESP32()

# Initialize sensors ONCE (important)
hr_sensor = HeartRateSensor()
spo2_sensor = SpO2Sensor()
temp_sensor = TemperatureSensor()
resp_sensor = RespirationSensor()
bp_sensor = BloodPressureSensor()
ecg_sensor = ECGSensor()


def get_live_sensors():
    data = esp32.read_packet()

    return {
        "heart_rate": f"{data['heart_rate']} BPM",
        "spo2": f"{data['spo2']}%",
        "ecg_status": data["ecg_status"].replace("_", " ").title(),
        "temp": f"{data['temp']}°F",
        "resp_rate": f"{data['resp_rate']} RR",
        "blood_pressure": f"{data['blood_pressure']['sys']}/{data['blood_pressure']['dia']} mmHg"
    }
