// Telemetry traces for the dashboard vital cards. The traces are simulated (as in the original
// app) around fixed baselines; styling follows the dataviz mark specs via chart tokens.
import type { ChartConfiguration, TooltipItem } from 'chart.js'
import { axes, withAlpha, type ChartTokens } from '../../components/charts/chartTheme'

export type SparklineKey = 'hr' | 'spo2' | 'bp' | 'rr' | 'temp' | 'ecg'

const POINTS = 121 // 10 minutes at 5-second resolution

function timeLabels(): string[] {
  const now = Date.now()
  return Array.from({ length: POINTS }, (_, i) =>
    new Date(now - (POINTS - 1 - i) * 5000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  )
}

const series = (fn: () => number) => Array.from({ length: POINTS }, fn)

export const generateHRData = () => series(() => 85 + Math.random() * 30 - 10)
export const generateSpO2Data = () => series(() => Math.min(100, Math.max(88, 96 + Math.random() * 6 - 3)))
export const generateBPData = () => ({ systolic: series(() => 120 + Math.random() * 40 - 10), diastolic: series(() => 75 + Math.random() * 20 - 5) })
export const generateRRData = () => series(() => 16 + Math.random() * 8 - 4)
// Same range as the original 36.5-38.0 °C trace, expressed in °F to match the displayed readings.
export const generateTempData = () => series(() => 97.7 + Math.random() * 2.7)

export function generateECGData(): number[] {
  const points: number[] = []
  for (let i = 0; i < 100; i++) {
    let value = 0
    const phase = i % 25
    if (phase < 3) value = Math.sin((phase * Math.PI) / 3) * 0.2
    else if (phase >= 8 && phase < 12) {
      if (phase === 9) value = -0.3
      else if (phase === 10) value = 1.2
      else if (phase === 11) value = -0.2
    } else if (phase >= 15 && phase < 20) value = Math.sin(((phase - 15) * Math.PI) / 5) * 0.4
    points.push(value + (Math.random() * 0.05 - 0.025))
  }
  return points
}

interface TraceSpec {
  unit: string
  decimals: number
  yMin: number
  yMax: number
  fill: boolean
  data: () => number[][]
  datasetLabels: string[]
}

const SPECS: Record<Exclude<SparklineKey, 'ecg'>, TraceSpec> = {
  hr: { unit: 'BPM', decimals: 0, yMin: 50, yMax: 150, fill: true, data: () => [generateHRData()], datasetLabels: ['Heart rate'] },
  spo2: { unit: '%', decimals: 1, yMin: 85, yMax: 100, fill: true, data: () => [generateSpO2Data()], datasetLabels: ['SpO₂'] },
  bp: {
    unit: 'mmHg',
    decimals: 0,
    yMin: 60,
    yMax: 160,
    fill: false,
    data: () => {
      const bp = generateBPData()
      return [bp.systolic, bp.diastolic]
    },
    datasetLabels: ['Systolic', 'Diastolic'],
  },
  rr: { unit: 'br/min', decimals: 0, yMin: 8, yMax: 30, fill: true, data: () => [generateRRData()], datasetLabels: ['Respiration'] },
  temp: { unit: '°F', decimals: 1, yMin: 96, yMax: 102, fill: true, data: () => [generateTempData()], datasetLabels: ['Temperature'] },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSparklineConfig(key: SparklineKey, t: ChartTokens, expanded: boolean): ChartConfiguration<'line', any, any> {
  if (key === 'ecg') {
    return {
      type: 'line',
      data: {
        labels: Array.from({ length: 100 }, (_, i) => i),
        datasets: [{ label: 'ECG', data: generateECGData(), borderColor: t.tint, borderWidth: 1.5, tension: 0, fill: false, pointRadius: 0 }],
      },
      options: {
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
      },
    }
  }

  const spec = SPECS[key]
  // One series = one colour (accent); BP's two series use the first two categorical slots.
  const colors = spec.datasetLabels.length > 1 ? [t.series[0], t.series[1]] : [t.tint]
  return {
    type: 'line',
    data: {
      labels: timeLabels(),
      datasets: spec.data().map((data, index) => ({
        label: spec.datasetLabels[index],
        data,
        borderColor: colors[index],
        backgroundColor: withAlpha(colors[index], 0.1),
        fill: spec.fill,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: colors[index],
      })),
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context: TooltipItem<'line'>) => ` ${context.dataset.label}: ${(context.parsed.y as number).toFixed(spec.decimals)} ${spec.unit}`,
          },
        },
      },
      scales: sparklineScales(t, spec, expanded),
    },
  }
}

/** Collapsed cards show a bare trace; expanded cards get recessive axes. */
function sparklineScales(t: ChartTokens, spec: TraceSpec, expanded: boolean) {
  const scales = axes(t, { yMin: spec.yMin, yMax: spec.yMax, showX: expanded })
  return { x: { ...scales.x, display: expanded }, y: { ...scales.y, display: expanded } }
}

/** Fresh simulated traces for the 2-second refresh. */
export function refreshSparklineData(key: Exclude<SparklineKey, 'ecg'>): number[][] {
  return SPECS[key].data()
}
