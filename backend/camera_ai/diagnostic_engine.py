"""
Camera Diagnostic Intelligence Engine
--------------------------------------
Cross-references bleeding, movement, and posture signals from camera AI
to produce:
  1. Probable medical conditions (what might be wrong)
  2. Verification tests the hospital should perform
  3. Hospital preparation recommendations (teams, equipment, supplies)
"""


# ──────────────────────────────────────────────
#  CONDITION DATABASE
#  Each entry maps a signal pattern to a probable
#  diagnosis with verification steps and prep list.
# ──────────────────────────────────────────────

CONDITION_DATABASE = [
    # ── CRITICAL: Severe Trauma with Hemorrhage ──
    {
        "match": lambda b, m, p: b == "High" and m == "High" and p == "High",
        "condition": "Severe Trauma with Active Hemorrhage",
        "severity": "Critical",
        "description": (
            "Camera analysis detected significant external bleeding combined with complete "
            "loss of voluntary movement and a collapsed body posture. This pattern is highly "
            "consistent with severe multi-system trauma involving active blood loss and possible "
            "loss of consciousness."
        ),
        "probable_causes": [
            "High-impact blunt force trauma (vehicular accident, fall from height)",
            "Penetrating injury with vascular damage",
            "Multi-site traumatic injury with hemorrhagic shock"
        ],
        "verification_tests": [
            {"test": "FAST Ultrasound (Focused Assessment with Sonography for Trauma)", "purpose": "Detect internal bleeding in abdomen, pelvis, and chest cavities"},
            {"test": "Complete Blood Count (CBC) – STAT", "purpose": "Assess hemoglobin and hematocrit for blood loss severity"},
            {"test": "CT Scan (Head, Chest, Abdomen, Pelvis)", "purpose": "Identify fractures, organ lacerations, and internal hemorrhage"},
            {"test": "Type & Crossmatch – Blood Bank Alert", "purpose": "Prepare for emergency blood transfusion"},
            {"test": "Arterial Blood Gas (ABG)", "purpose": "Evaluate oxygenation, ventilation, and acid-base status"},
            {"test": "Coagulation Panel (PT, INR, PTT)", "purpose": "Check for coagulopathy from massive blood loss"}
        ],
        "hospital_preparation": [
            {"category": "Teams", "details": ["Trauma surgery team on standby", "Anesthesiology for emergency intubation", "Interventional radiology for embolization if needed"]},
            {"category": "Equipment", "details": ["Massive transfusion protocol cart", "Chest tube tray", "Rapid infuser / blood warmer", "Surgical airway kit"]},
            {"category": "Supplies", "details": ["O-negative packed RBCs (4+ units)", "Fresh frozen plasma", "Tranexamic acid (TXA) 1g IV ready", "Crystalloid fluids (warmed)"]},
            {"category": "Room Setup", "details": ["Trauma bay / Resuscitation room", "Portable X-ray at bedside", "Ventilator on standby"]}
        ]
    },

    # ── CRITICAL: Suspected Cardiac Arrest / Unresponsive ──
    {
        "match": lambda b, m, p: b == "Low" and m == "High" and p == "High",
        "condition": "Suspected Cardiac Arrest or Neurological Emergency",
        "severity": "Critical",
        "description": (
            "No visible bleeding was detected, but the patient shows no voluntary movement "
            "and has collapsed or slumped posture. This combination strongly suggests a sudden "
            "medical emergency such as cardiac arrest, stroke, or severe seizure rather than "
            "external trauma."
        ),
        "probable_causes": [
            "Sudden cardiac arrest (ventricular fibrillation / asystole)",
            "Acute ischemic or hemorrhagic stroke",
            "Severe hypoglycemic episode or diabetic emergency",
            "Seizure with prolonged post-ictal unresponsiveness",
            "Pulmonary embolism causing sudden collapse"
        ],
        "verification_tests": [
            {"test": "12-Lead ECG – Immediate", "purpose": "Identify cardiac rhythm abnormalities, STEMI, or arrhythmia"},
            {"test": "CT Head (Non-contrast) – STAT", "purpose": "Rule out hemorrhagic stroke or intracranial bleed"},
            {"test": "Blood Glucose – Point of Care", "purpose": "Identify hypoglycemia or diabetic ketoacidosis"},
            {"test": "Troponin I/T – STAT", "purpose": "Detect acute myocardial injury"},
            {"test": "CT Angiography (Pulmonary)", "purpose": "Rule out pulmonary embolism if suspected"},
            {"test": "Basic Metabolic Panel", "purpose": "Check electrolytes (potassium, sodium) for cardiac-cause clues"}
        ],
        "hospital_preparation": [
            {"category": "Teams", "details": ["Cardiac arrest / Code Blue team activated", "Neurology stroke team on alert", "Cardiology / Cath lab notification"]},
            {"category": "Equipment", "details": ["Defibrillator charged and ready", "Advanced airway management kit", "12-lead ECG machine at bedside", "Mechanical CPR device if available"]},
            {"category": "Supplies", "details": ["Epinephrine 1mg prefilled syringes", "Amiodarone 300mg IV ready", "tPA (alteplase) on standby for stroke", "Dextrose 50% for hypoglycemia"]},
            {"category": "Room Setup", "details": ["Resuscitation bay cleared", "CT scanner on priority standby", "Cath lab pre-alert if STEMI suspected"]}
        ]
    },

    # ── HIGH: Moderate Trauma with Bleeding ──
    {
        "match": lambda b, m, p: b == "High" and m in ("Low", "Medium") and p in ("Low", "Medium"),
        "condition": "Active External Bleeding – Likely Traumatic Wound",
        "severity": "High",
        "description": (
            "Significant external bleeding was detected on exposed skin, but the patient appears "
            "to retain some movement and is not in a collapsed posture. This suggests a localized "
            "traumatic wound (laceration, avulsion, or puncture) with the patient still conscious "
            "but at risk of progressive blood loss."
        ),
        "probable_causes": [
            "Deep laceration or avulsion injury",
            "Stab wound or puncture injury to limb or torso",
            "Compound fracture with external bleeding",
            "Scalp wound (high vascularity causing visible bleeding)"
        ],
        "verification_tests": [
            {"test": "Focused wound assessment and direct pressure check", "purpose": "Locate exact bleeding source and assess depth"},
            {"test": "Complete Blood Count (CBC)", "purpose": "Baseline hemoglobin to gauge blood loss"},
            {"test": "X-ray of affected region", "purpose": "Check for fractures or embedded foreign bodies"},
            {"test": "Wound exploration under local anesthesia", "purpose": "Assess damage to tendons, vessels, and nerves"},
            {"test": "Tetanus immunization status check", "purpose": "Determine if tetanus prophylaxis is needed"}
        ],
        "hospital_preparation": [
            {"category": "Teams", "details": ["Emergency medicine / trauma surgeon", "Orthopedics on standby (if fracture suspected)"]},
            {"category": "Equipment", "details": ["Wound closure kit (sutures, staples)", "Tourniquet and hemostatic dressings", "Portable ultrasound for vascular check"]},
            {"category": "Supplies", "details": ["Packed RBCs (2 units on standby)", "Local anesthetic (lidocaine)", "IV normal saline for volume replacement", "Antibiotics (cefazolin 1g IV)"]},
            {"category": "Room Setup", "details": ["Minor procedure room or trauma bay", "Good overhead lighting for wound exploration"]}
        ]
    },

    # ── HIGH: Unconscious Patient – No Bleeding ──
    {
        "match": lambda b, m, p: b == "Low" and m == "High" and p in ("Low", "Medium"),
        "condition": "Unresponsive Patient – Possible Metabolic or Toxicological Emergency",
        "severity": "High",
        "description": (
            "The patient shows no external bleeding and no significant movement, but posture "
            "is not fully collapsed. This may indicate a metabolic emergency, drug overdose, "
            "or early stages of a neurological event where the patient is unresponsive but has "
            "not yet fully collapsed."
        ),
        "probable_causes": [
            "Drug overdose or poisoning",
            "Severe hypoglycemia",
            "Hepatic or uremic encephalopathy",
            "Carbon monoxide or toxic exposure",
            "Transient ischemic attack (TIA) progressing to stroke"
        ],
        "verification_tests": [
            {"test": "Blood Glucose – Point of Care", "purpose": "Rapidly identify hypoglycemia"},
            {"test": "Urine Drug Screen (UDS)", "purpose": "Detect opioids, benzodiazepines, or other substances"},
            {"test": "Serum Toxicology Panel", "purpose": "Identify specific toxic agents or overdose levels"},
            {"test": "Liver and Renal Function Tests", "purpose": "Check for hepatic or uremic encephalopathy"},
            {"test": "CT Head (Non-contrast)", "purpose": "Rule out intracranial pathology"},
            {"test": "Carboxyhemoglobin level", "purpose": "If CO poisoning is suspected"}
        ],
        "hospital_preparation": [
            {"category": "Teams", "details": ["Emergency medicine physician", "Toxicology consult on standby", "Neurology if stroke suspected"]},
            {"category": "Equipment", "details": ["Naloxone (Narcan) ready for opioid reversal", "Gastric lavage equipment", "Activated charcoal if indicated", "Advanced airway kit"]},
            {"category": "Supplies", "details": ["Dextrose 50% IV push ready", "Flumazenil (benzo reversal) available", "IV normal saline", "Thiamine 100mg IV"]},
            {"category": "Room Setup", "details": ["Monitored bed with continuous pulse oximetry", "Suction at bedside", "Poison control hotline number accessible"]}
        ]
    },

    # ── MODERATE: Reduced Movement with Abnormal Posture ──
    {
        "match": lambda b, m, p: b == "Low" and m == "Medium" and p == "High",
        "condition": "Suspected Spinal Injury or Severe Pain Immobilization",
        "severity": "Moderate",
        "description": (
            "No bleeding detected, but the patient shows reduced movement combined with an "
            "abnormal collapsed or lying posture. This pattern suggests the patient may be "
            "immobilized by pain (possible spinal or pelvic injury) or experiencing severe "
            "abdominal distress."
        ),
        "probable_causes": [
            "Spinal cord injury with partial paralysis",
            "Pelvic fracture causing immobilization from pain",
            "Severe abdominal emergency (appendicitis rupture, aortic aneurysm)",
            "Acute back injury or disc herniation",
            "Severe musculoskeletal injury limiting mobility"
        ],
        "verification_tests": [
            {"test": "Spinal X-ray (Cervical, Thoracic, Lumbar)", "purpose": "Identify vertebral fractures or misalignment"},
            {"test": "CT Spine if X-ray inconclusive", "purpose": "Detailed imaging for occult spinal fractures"},
            {"test": "Pelvic X-ray", "purpose": "Rule out pelvic fracture"},
            {"test": "Abdominal Ultrasound", "purpose": "Check for free fluid or organ injury"},
            {"test": "Neurological examination (motor/sensory)", "purpose": "Assess for spinal cord deficit patterns"}
        ],
        "hospital_preparation": [
            {"category": "Teams", "details": ["Orthopedic / spinal surgery team on alert", "Emergency medicine for pain management", "Neurosurgery consult if cord injury suspected"]},
            {"category": "Equipment", "details": ["Spinal board and cervical collar maintained", "Pelvic binder ready", "Portable X-ray at bedside"]},
            {"category": "Supplies", "details": ["IV morphine or fentanyl for pain control", "IV fluids (warmed crystalloids)", "Foley catheter if spinal shock suspected"]},
            {"category": "Room Setup", "details": ["Trauma bay with spinal precautions", "MRI availability confirmed if needed"]}
        ]
    },

    # ── MODERATE: Bleeding with Reduced Movement ──
    {
        "match": lambda b, m, p: b == "Medium" and m == "Medium" and p in ("Medium", "High"),
        "condition": "Moderate Trauma – Possible Internal + External Injury",
        "severity": "Moderate",
        "description": (
            "Moderate external bleeding detected alongside reduced patient movement and abnormal "
            "posture. This combination suggests the patient has sustained trauma with both visible "
            "and potentially concealed injuries. The reduced movement may indicate pain, weakness "
            "from blood loss, or developing shock."
        ),
        "probable_causes": [
            "Blunt abdominal trauma with external soft tissue injury",
            "Rib fractures with surface contusions and possible pneumothorax",
            "Limb fracture with associated wound and blood loss",
            "Fall injury with multiple impact sites"
        ],
        "verification_tests": [
            {"test": "FAST Ultrasound", "purpose": "Screen for internal abdominal or thoracic bleeding"},
            {"test": "Chest X-ray", "purpose": "Identify rib fractures, pneumothorax, or hemothorax"},
            {"test": "Complete Blood Count + Coagulation", "purpose": "Assess blood loss and clotting function"},
            {"test": "Lactate Level", "purpose": "Detect occult tissue hypoperfusion (early shock marker)"},
            {"test": "CT Abdomen/Pelvis with contrast", "purpose": "Identify organ injury or active internal bleed"}
        ],
        "hospital_preparation": [
            {"category": "Teams", "details": ["Trauma team activation", "General surgery on standby", "Radiology for urgent imaging"]},
            {"category": "Equipment", "details": ["Chest tube tray available", "Rapid infuser on standby", "Portable ultrasound"]},
            {"category": "Supplies", "details": ["Packed RBCs (2 units ready)", "IV crystalloids (warmed)", "Tranexamic acid available", "Broad-spectrum antibiotics"]},
            {"category": "Room Setup", "details": ["Trauma bay reserved", "CT scanner cleared for priority use"]}
        ]
    },

    # ── MODERATE: Bleeding only, patient alert ──
    {
        "match": lambda b, m, p: b == "Medium" and m == "Low" and p == "Low",
        "condition": "Minor to Moderate External Wound – Patient Alert",
        "severity": "Moderate",
        "description": (
            "Moderate external bleeding is visible, but the patient maintains normal movement "
            "and upright posture. This suggests a non-life-threatening wound with the patient "
            "remaining conscious and mobile. However, wound assessment is still essential to "
            "rule out deeper structural damage."
        ),
        "probable_causes": [
            "Superficial laceration or abrasion",
            "Minor puncture wound",
            "Nosebleed (epistaxis) or scalp wound",
            "Post-fall skin tear or contusion with oozing"
        ],
        "verification_tests": [
            {"test": "Direct wound inspection", "purpose": "Assess wound depth, length, and involvement of deeper structures"},
            {"test": "Neurovascular check distal to wound", "purpose": "Ensure no nerve or vessel compromise"},
            {"test": "X-ray if bony tenderness present", "purpose": "Rule out underlying fracture"},
            {"test": "Tetanus status verification", "purpose": "Administer prophylaxis if needed"}
        ],
        "hospital_preparation": [
            {"category": "Teams", "details": ["Emergency physician for wound management"]},
            {"category": "Equipment", "details": ["Wound closure supplies (sutures, tissue adhesive)", "Local anesthetic kit"]},
            {"category": "Supplies", "details": ["Sterile wound irrigation solution", "Topical antibiotic ointment", "Tetanus toxoid if indicated"]},
            {"category": "Room Setup", "details": ["Minor procedure room with good lighting"]}
        ]
    },

    # ── LOW: Patient appears stable ──
    {
        "match": lambda b, m, p: b == "Low" and m == "Low" and p == "Low",
        "condition": "No Visible Emergency Detected – Standard Monitoring",
        "severity": "Low",
        "description": (
            "Camera analysis shows no external bleeding, normal voluntary movement, and "
            "a stable upright or seated posture. No acute visual emergency is identified. "
            "The patient appears to be conscious and physically responsive."
        ),
        "probable_causes": [
            "Non-traumatic medical complaint (chest pain, dizziness, weakness)",
            "Anxiety or panic episode",
            "Mild allergic reaction",
            "Post-event observation (patient stabilized before pickup)"
        ],
        "verification_tests": [
            {"test": "Complete vital signs assessment", "purpose": "Confirm hemodynamic stability"},
            {"test": "12-Lead ECG", "purpose": "Rule out silent cardiac event"},
            {"test": "Focused history and physical exam", "purpose": "Identify non-visual complaints"},
            {"test": "Blood glucose check", "purpose": "Rule out hypoglycemia or diabetic issue"}
        ],
        "hospital_preparation": [
            {"category": "Teams", "details": ["Emergency physician for standard triage"]},
            {"category": "Equipment", "details": ["Standard monitoring equipment", "ECG machine available"]},
            {"category": "Supplies", "details": ["IV access supplies", "Standard medication tray"]},
            {"category": "Room Setup", "details": ["Standard examination room"]}
        ]
    }
]


# ──────────────────────────────────────────────
#  FALLBACK (when no pattern matches exactly)
# ──────────────────────────────────────────────

FALLBACK_DIAGNOSIS = {
    "condition": "Unclassified Visual Pattern – Requires Clinical Correlation",
    "severity": "Moderate",
    "description": (
        "The combination of camera observations does not match a standard pattern. "
        "This may indicate an evolving situation or atypical presentation. Clinical "
        "correlation with sensor data and patient history is strongly recommended."
    ),
    "probable_causes": [
        "Atypical injury pattern",
        "Mixed medical and traumatic presentation",
        "Environmental or positional artifact in camera data"
    ],
    "verification_tests": [
        {"test": "Full trauma survey (primary + secondary)", "purpose": "Systematic head-to-toe examination"},
        {"test": "Complete blood panel (CBC, BMP, Coag)", "purpose": "Comprehensive baseline labs"},
        {"test": "CT Head + Chest + Abdomen/Pelvis", "purpose": "Pan-scan to identify occult injury"},
        {"test": "12-Lead ECG", "purpose": "Rule out cardiac etiology"},
        {"test": "Blood Glucose", "purpose": "Rule out metabolic emergency"}
    ],
    "hospital_preparation": [
        {"category": "Teams", "details": ["Emergency medicine team for full evaluation", "Trauma team on low-threshold standby"]},
        {"category": "Equipment", "details": ["Full monitoring setup", "Advanced airway equipment ready", "Portable ultrasound"]},
        {"category": "Supplies", "details": ["Blood products on low-threshold order", "IV fluids and standard emergency medications"]},
        {"category": "Room Setup", "details": ["Monitored bed in ED resuscitation area", "CT scanner availability confirmed"]}
    ]
}


def _risk_value(level):
    order = {"Low": 1, "Medium": 2, "High": 3}
    return order.get(str(level).strip().title(), 1)


def _visual_overall_risk(bleeding_risk, movement_risk, posture_risk):
    levels = [
        str(bleeding_risk).strip().title(),
        str(movement_risk).strip().title(),
        str(posture_risk).strip().title(),
    ]
    if "High" in levels:
        return "High"
    if "Medium" in levels:
        return "Medium"
    return "Low"


def _ensure_point_of_care_tests(verification_tests):
    required = [
        {"test": "Blood Glucose – Point of Care", "purpose": "Rapid metabolic screening without prior medical history"},
        {"test": "FAST Ultrasound (Focused Assessment with Sonography for Trauma)", "purpose": "Immediate bedside check for internal free fluid or bleeding"},
        {"test": "12-Lead ECG – Immediate", "purpose": "Rapid rhythm and ischemia screening at intake"},
    ]

    existing_names = {str(item.get("test", "")).strip().lower() for item in verification_tests}
    for item in required:
        if item["test"].strip().lower() not in existing_names:
            verification_tests.append(item)


def generate_diagnosis(bleeding_risk, movement_risk, posture_risk, anonymous_mode=False):
    """
    Given the three camera risk levels, return a comprehensive
    diagnostic assessment including probable condition, verification
    tests, and hospital preparation recommendations.
    """

    # Normalize inputs
    bleeding_risk = str(bleeding_risk).strip().title()
    movement_risk = str(movement_risk).strip().title()
    posture_risk = str(posture_risk).strip().title()

    # Find matching condition
    matched = None
    for entry in CONDITION_DATABASE:
        if entry["match"](bleeding_risk, movement_risk, posture_risk):
            matched = entry
            break

    if matched is None:
        matched = FALLBACK_DIAGNOSIS

    # Build severity badge color
    severity_colors = {
        "Critical": "danger",
        "High": "warning",
        "Moderate": "info",
        "Low": "success"
    }

    verification_tests = list(matched["verification_tests"])
    if anonymous_mode:
        _ensure_point_of_care_tests(verification_tests)

    overall_visual_risk = _visual_overall_risk(bleeding_risk, movement_risk, posture_risk)

    return {
        "condition": matched["condition"],
        "severity": matched["severity"],
        "severity_color": severity_colors.get(matched["severity"], "secondary"),
        "description": matched["description"],
        "probable_causes": matched["probable_causes"],
        "verification_tests": verification_tests,
        "hospital_preparation": matched["hospital_preparation"],
        "overall_risk": overall_visual_risk,
        "camera_inputs": {
            "bleeding_risk": bleeding_risk,
            "movement_risk": movement_risk,
            "posture_risk": posture_risk
        },
        "history_unavailable": bool(anonymous_mode)
    }
