import random

# -------------------------
# Individual Sensor Classes
# -------------------------

class HeartRateSensor:
    def read(self):
        return random.randint(60, 130)


class SpO2Sensor:
    def read(self):
        return random.choice([98, 97, 96, 95, 94, 92, 90])


class TemperatureSensor:
    def read(self):
        return round(random.uniform(36.5, 39.5), 1)


class RespirationSensor:
    def read(self):
        return random.randint(12, 30)


class BloodPressureSensor:
    def read(self):
        return {
            "sys": random.randint(100, 160),
            "dia": random.randint(60, 100)
        }


class ECGSensor:
    def read(self, heart_rate):
        if heart_rate >= 115:
            return random.choices(
                ["sinus_tachycardia", "possible_arrhythmia"],
                weights=[75, 25],
                k=1
            )[0]

        if heart_rate <= 55:
            return random.choices(
                ["sinus_bradycardia", "possible_arrhythmia"],
                weights=[80, 20],
                k=1
            )[0]

        # Mid-range HR can still occasionally show rhythm irregularity
        if random.random() < 0.12:
            return "possible_arrhythmia"

        return "normal_sinus_rhythm"
