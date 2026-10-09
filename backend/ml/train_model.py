import itertools
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import os

def assign_label(hr, spo2, bp_sys, resp, ecg_tachy, history_risk, bp_change_last_5_min=0):
    shock_index = hr / bp_sys if bp_sys else 0
    if shock_index > 1.0:
        return "Shock / Severe Critical Condition"
    if ecg_tachy == 1 and hr > 110 and bp_sys > 140:
        return "Undifferentiated Chest Pain/Tachycardia"
    if bp_sys > 170 and history_risk == 1:
        return "Acute Neurological Deficit"
    if bp_change_last_5_min <= -10 and hr > 105:
        return "Prepare for Shock"
    if spo2 < 92 and resp > 22:
        return "Respiratory Distress"
    if hr > 115 and bp_sys < 95:
        return "Shock / Severe Critical Condition"
    if bp_sys < 90 and hr > 105:
        return "Suspected Internal Bleeding"
    if hr > 100 and bp_sys > 100 and resp > 20:
        return "Trauma / Accident Severity"
    if history_risk == 1 and spo2 > 95 and hr < 95:
        return "Metabolic Emergency"
    if hr < 95 and spo2 > 96 and bp_sys > 110:
        return "Stable Condition"
    return "Suspected Fracture / Ligament Injury"


def generate_data():
    rows = []

    heart_rates = [45, 55, 65, 75, 85, 95, 105, 115, 125, 135, 145, 155]
    spo2_values = [85, 88, 90, 92, 94, 96, 97, 98, 99, 100]
    systolic_bp_values = [80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190]
    respiration_values = [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36]
    ecg_tachy_values = [0, 1]
    history_risk_values = [0, 1]
    bp_change_values = [-20, -15, -10, -5, 0, 5]

    for hr, spo2, bp_sys, resp, ecg_tachy, history_risk, bp_change_last_5_min in itertools.product(
        heart_rates,
        spo2_values,
        systolic_bp_values,
        respiration_values,
        ecg_tachy_values,
        history_risk_values,
        bp_change_values,
    ):
        label = assign_label(hr, spo2, bp_sys, resp, ecg_tachy, history_risk, bp_change_last_5_min)
        rows.append([hr, spo2, bp_sys, resp, ecg_tachy, history_risk, bp_change_last_5_min, label])

    critical_unknown_rows = []
    for hr in [118, 126, 134, 142]:
        for bp_sys in [78, 84, 90]:
            for spo2 in [86, 88, 90, 92]:
                for resp in [24, 28, 32]:
                    for ecg_tachy in [0, 1]:
                        bp_change_last_5_min = -15
                        history_risk = 0
                        label = assign_label(hr, spo2, bp_sys, resp, ecg_tachy, history_risk, bp_change_last_5_min)
                        critical_unknown_rows.append([
                            hr,
                            spo2,
                            bp_sys,
                            resp,
                            ecg_tachy,
                            history_risk,
                            bp_change_last_5_min,
                            label,
                        ])

    rows.extend(critical_unknown_rows)

    return pd.DataFrame(
        rows,
        columns=["hr", "spo2", "bp_sys", "resp", "ecg_tachy", "history_risk", "bp_change_last_5_min", "label"],
    )

# ----------------------------
# Generate dataset
# ----------------------------
df = generate_data()

X = df.drop("label", axis=1)
y = df["label"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=42
)

# ----------------------------
# Train model
# ----------------------------
model = RandomForestClassifier(n_estimators=300, random_state=42)

model.fit(X_train, y_train)

# ----------------------------
# Evaluate
# ----------------------------
preds = model.predict(X_test)
acc = accuracy_score(y_test, preds)
print(f"Expanded model accuracy: {acc*100:.2f}%")
print(f"Training samples: {len(df)}")

# ----------------------------
# Save model
# ----------------------------
os.makedirs("ml", exist_ok=True)
joblib.dump(model, "ml/risk_model.pkl")
print("Expanded model saved to ml/risk_model.pkl")
