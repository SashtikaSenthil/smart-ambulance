// Payload types for the Flask API (backend/api/routes.py).

export type RiskText = string // "Low" | "Medium" | "High" | "Pending" (free text from the backend)

export interface Patient {
  id: string
  name: string
  age: number | string
  dob: string
  past_conditions: string
  allergies: string
  recent_report?: string
}

export interface Sensors {
  heart_rate: string
  spo2: string
  hb: string
  temp: string
  resp_rate: string
  blood_pressure: string
  ecg_status: string
  systolic_bp: number
  diastolic_bp: number
}

export type LiveSensorKey = 'heart_rate' | 'spo2' | 'blood_pressure' | 'temp' | 'resp_rate' | 'ecg_status'

export interface AiPayload {
  primary_risk: string
  risk_level: string
  confidence: string
  indicators: string[]
  explanations: string[]
  recommendations: string[]
  external_summary: string[]
  internal_summary: string[]
}

export type DoctorAiPayload = Pick<AiPayload, 'explanations' | 'recommendations' | 'external_summary' | 'internal_summary'>

export interface VerificationTest {
  test: string
  purpose: string
}

export interface HospitalPreparation {
  category: string
  details: string[]
}

export interface Diagnosis {
  condition: string
  severity: string
  severity_color: string
  description: string
  probable_causes: string[]
  verification_tests: VerificationTest[]
  hospital_preparation: HospitalPreparation[]
  [key: string]: unknown
}

export interface CameraReport {
  bleeding_risk: RiskText
  movement_risk: RiskText
  posture_risk: RiskText
  overall_risk: RiskText
  summary: string[]
  diagnosis?: Diagnosis
}

export interface DemoAssessment {
  assessment_id: string
  timestamp: string
  mode: string
  scenario: { id: number; name: string }
  sensors: Record<string, unknown>
  analysis: Record<string, unknown>
  prediction: Record<string, unknown>
}

export interface PagePayload<TAi = AiPayload> {
  patient: Patient
  anonymous_mode: boolean
  sensors: Sensors
  ai: TAi
  camera: CameraReport
  demo_assessment: DemoAssessment
}

export type DashboardPayload = PagePayload<AiPayload>
export type AnalysisPayload = PagePayload<AiPayload>
export type DoctorSummaryPayload = PagePayload<DoctorAiPayload>

// ----------------------------
// Live vitals (/api/live-vitals)
// ----------------------------
export interface RawVitals {
  timestamp: number
  heart_rate: number
  spo2: number
  hb: number
  temp: number
  resp_rate: number
  systolic_bp: number
  diastolic_bp: number
  ecg_status: string
  blood_pressure: string
}

export interface VitalInterpretation {
  key: string
  label: string
  display: string
  band: string
  severity: 'normal' | 'mild' | 'moderate' | 'severe' | 'critical'
  abnormal: boolean
  interpretation: string
}

export interface DerivedIndex {
  value: number
  unit: string
  label: string
  note: string
}

export interface ScoreBlock {
  score: number
  max_measured: number
  note: string
  criteria?: string[]
  band?: string
  risk?: string
  components?: Record<string, number>
  red_flag?: boolean
}

export interface SummaryPattern {
  id: string
  title: string
  severity: 'Low' | 'Moderate' | 'High' | 'Critical'
  evidence: string[]
  interpretation: string
  actions: string[]
  receiving_team: string | null
}

export interface TrendChange {
  vital: string
  status: string
  text: string
}

export interface TrendBlock {
  direction: string
  window_seconds: number
  changes: TrendChange[]
  per_vital: Record<string, { current: number; baseline: number; delta: number; direction: 'up' | 'down' | 'flat' }>
  news_delta: number
  summary: string
}

export interface Sbar {
  situation: string
  background: string
  assessment: string
  recommendation: string
}

export interface VitalsSummary {
  risk_level: 'Low' | 'Moderate' | 'High' | 'Critical'
  triage: string
  headline: string
  narrative: string
  key_findings: string[]
  alerts: string[]
  vital_interpretations: VitalInterpretation[]
  derived_indices: Record<string, DerivedIndex>
  scores: { news2: ScoreBlock; qsofa: ScoreBlock; sirs: ScoreBlock }
  patterns: SummaryPattern[]
  trend: TrendBlock
  recommended_actions: string[]
  monitoring_interval: string
  sbar: Sbar
  abnormal_count: number
  generated_at: string
  disclaimer: string
}

export interface LiveVitalsResponse {
  timestamp: string
  sensors: Sensors
  raw: RawVitals
  summary: VitalsSummary
  ai: AiPayload
  camera_overall_risk: string
  diagnosis: Diagnosis
}

// ----------------------------
// Camera / ECG
// ----------------------------
export interface CameraRuntimeStatus {
  phase: string
  remaining_seconds: number
  bleeding_risk: RiskText
  movement_risk: RiskText
  posture_risk: RiskText
  message?: string
  error?: string | null
}

export interface EcgData {
  source: string
  value: number | null
  labels: number[]
  series: number[]
}

// ----------------------------
// Records
// ----------------------------
export interface PatientRecordRow {
  patient_id: string
  name: string
  date: string
  condition: string
  accuracy: number
  response_time: number
  status: string
}

export interface RecordsPayload {
  patient_records: PatientRecordRow[]
  total_patients: number
  prediction_success: number
  avg_accuracy: number
  avg_response_time: string
}

export interface PatientHistory {
  patient_id: string
  name: string
  date: string
  condition: string
  status: string
  prediction_accuracy: number
  response_time: number
  patient_summary: {
    age: number
    blood_group: string
    emergency_contact: string
    attending_doctor: string
    ambulance_unit: string
    diagnosis_detail: string
  }
  medications: { name: string; dosage: string; frequency: string; purpose: string }[]
  vitals: { time: string; heart_rate: number; spo2: number; blood_pressure: string; temperature: string }[]
  event_log: { event: string; status: string }[]
  chart_data: {
    labels: string[]
    response_timeline: number[]
    accuracy_timeline: number[]
    condition_breakdown: { labels: string[]; values: number[] }
  }
}
