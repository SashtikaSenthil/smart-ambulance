from sensors import (
    HeartRateSensor,
    SpO2Sensor,
    TemperatureSensor,
    RespirationSensor,
    BloodPressureSensor,
    ECGSensor
)

hr_sensor = HeartRateSensor()
spo2_sensor = SpO2Sensor()
temp_sensor = TemperatureSensor()
resp_sensor = RespirationSensor()
bp_sensor = BloodPressureSensor()
ecg_sensor = ECGSensor()

hr = hr_sensor.read()

print("Heart Rate:", hr)
print("SpO2:", spo2_sensor.read())
print("Temperature:", temp_sensor.read())
print("Respiration:", resp_sensor.read())
print("Blood Pressure:", bp_sensor.read())
print("ECG:", ecg_sensor.read(hr))
