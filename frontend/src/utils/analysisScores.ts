// Analysis page scoring formulas, ported 1:1 from templates/analysis.html.

export function parseMetricNumber(text: unknown): number {
  const numeric = parseFloat(String(text ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(numeric) ? numeric : 0
}

export function mapRiskToScore(riskText: unknown): number {
  const value = String(riskText ?? '').toUpperCase()
  if (value.includes('HIGH')) return 90
  if (value.includes('MEDIUM')) return 60
  if (value.includes('LOW')) return 30
  return 10
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export interface AnalysisScoreInput {
  indicatorCount: number
  riskLevel: string
  confidence: string
  bleedingRisk: string
  movementRisk: string
  postureRisk: string
  heartRate: string
  spo2: string
  temp: string
  respRate: string
  bloodPressure: string
}

export function computeAnalysisScores(input: AnalysisScoreInput) {
  const riskLevelText = String(input.riskLevel || 'LOW').toUpperCase()
  const confidenceValue = parseMetricNumber(input.confidence)
  const cameraScores = [mapRiskToScore(input.bleedingRisk), mapRiskToScore(input.movementRisk), mapRiskToScore(input.postureRisk)]
  const heartRate = parseMetricNumber(input.heartRate)
  const spo2 = parseMetricNumber(input.spo2)
  const temperature = parseMetricNumber(input.temp)
  const respiration = parseMetricNumber(input.respRate)
  const systolicBP = parseMetricNumber(String(input.bloodPressure || '0').split('/')[0])
  const indicatorCount = input.indicatorCount

  const cameraSeverityAvg = clampScore((cameraScores[0] + cameraScores[1] + cameraScores[2]) / 3)
  const aiSignalScore = clampScore(indicatorCount * 12 + confidenceValue * 0.35)

  const hrInstability = clampScore(Math.abs(heartRate - 88) * 2.2)
  const spo2Instability = clampScore((96 - spo2) * 10)
  const tempInstability = clampScore(Math.abs(temperature - 98.6) * 22)
  const respInstability = clampScore(Math.abs(respiration - 16) * 4.5)
  const bpInstability = clampScore(Math.abs(systolicBP - 120) * 1.2)
  const physiologySeverity = clampScore(
    hrInstability * 0.2 + spo2Instability * 0.35 + tempInstability * 0.15 + respInstability * 0.15 + bpInstability * 0.15,
  )

  const riskLevelBoost = riskLevelText.includes('HIGH') ? 12 : riskLevelText.includes('MEDIUM') ? 6 : 0

  const airwayPriority = clampScore(spo2Instability * 0.55 + cameraScores[2] * 0.2 + respInstability * 0.25 + riskLevelBoost)
  const circulationPriority = clampScore(hrInstability * 0.35 + bpInstability * 0.25 + cameraScores[0] * 0.3 + indicatorCount * 3)
  const neuroTraumaPriority = clampScore(cameraScores[1] * 0.4 + cameraScores[2] * 0.3 + indicatorCount * 4 + confidenceValue * 0.12)
  const medicationPriority = clampScore(aiSignalScore * 0.4 + physiologySeverity * 0.35 + cameraSeverityAvg * 0.25)

  const overallEmergencyScore = clampScore(physiologySeverity * 0.4 + aiSignalScore * 0.3 + cameraSeverityAvg * 0.3)

  return {
    physiologySeverity,
    aiSignalScore,
    cameraSeverityAvg,
    airwayPriority,
    circulationPriority,
    neuroTraumaPriority,
    medicationPriority,
    overallEmergencyScore,
  }
}

/** CSS custom property from :root (style.css), with the same fallbacks as the original scripts. */
export function cssToken(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}
