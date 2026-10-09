// Telemetry sparkline charts - ported 1:1 from templates/dashboard.html
// (the original simulates the chart traces with random data around fixed baselines).
import type { ChartConfiguration } from 'chart.js'

export type SparklineKey = 'hr' | 'spo2' | 'bp' | 'rr' | 'temp' | 'ecg'

function generateTimeData(minutes = 10): Date[] {
  const data: Date[] = []
  const now = new Date()
  for (let i = minutes * 60; i >= 0; i -= 5) {
    data.push(new Date(now.getTime() - i * 1000))
  }
  return data
}

export function generateHRData(): number[] {
  const baselineHR = 85
  return generateTimeData().map(() => baselineHR + Math.random() * 30 - 10)
}

export function generateSpO2Data(): number[] {
  const baselineSpo2 = 96
  return generateTimeData().map(() => Math.min(100, Math.max(88, baselineSpo2 + Math.random() * 6 - 3)))
}

export function generateBPData(): { systolic: number[]; diastolic: number[] } {
  return {
    systolic: generateTimeData().map(() => 120 + Math.random() * 40 - 10),
    diastolic: generateTimeData().map(() => 75 + Math.random() * 20 - 5),
  }
}

export function generateRRData(): number[] {
  const baselineRR = 16
  return generateTimeData().map(() => baselineRR + Math.random() * 8 - 4)
}

export function generateTempData(): number[] {
  const baselineTemp = 37.0
  return generateTimeData().map(() => baselineTemp + Math.random() * 1.5 - 0.5)
}

export function generateECGData(): number[] {
  const ecgPoints: number[] = []
  for (let i = 0; i < 100; i++) {
    let value = 0
    const phase = i % 25

    // P wave
    if (phase < 3) value = Math.sin((phase * Math.PI) / 3) * 0.2
    // QRS complex
    else if (phase >= 8 && phase < 12) {
      if (phase === 9) value = -0.3
      else if (phase === 10) value = 1.2
      else if (phase === 11) value = -0.2
    }
    // T wave
    else if (phase >= 15 && phase < 20) value = Math.sin(((phase - 15) * Math.PI) / 5) * 0.4

    ecgPoints.push(value + (Math.random() * 0.05 - 0.025))
  }
  return ecgPoints
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSparklineConfig(chartType: SparklineKey): ChartConfiguration<'line', any, any> {
  const timeLabels = generateTimeData().map(d =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  )

  switch (chartType) {
    case 'spo2':
      return {
        type: 'line',
        data: {
          labels: timeLabels,
          datasets: [
            {
              label: 'SpO₂ (%)',
              data: generateSpO2Data(),
              borderColor: '#3498db',
              backgroundColor: 'rgba(52, 152, 219, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointRadius: 0,
              pointHoverRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          // The original also declared an "annotation" danger zone, but the annotation plugin was never loaded.
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: context => `${(context.parsed.y as number).toFixed(1)}%` } },
          },
          scales: {
            y: { beginAtZero: false, min: 85, max: 100, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: value => value + '%' } },
            x: { display: false },
          },
        },
      }

    case 'bp':
      return {
        type: 'line',
        data: {
          labels: timeLabels,
          datasets: [
            {
              label: 'Systolic',
              data: generateBPData().systolic,
              borderColor: '#e74c3c',
              backgroundColor: 'rgba(231, 76, 60, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: false,
              pointRadius: 0,
              pointHoverRadius: 4,
            },
            {
              label: 'Diastolic',
              data: generateBPData().diastolic,
              borderColor: '#3498db',
              backgroundColor: 'rgba(52, 152, 219, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: false,
              pointRadius: 0,
              pointHoverRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: context => `${context.dataset.label}: ${(context.parsed.y as number).toFixed(0)} mmHg` } },
          },
          scales: {
            y: { beginAtZero: false, min: 60, max: 160, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: value => value + ' mmHg' } },
            x: { display: false },
          },
        },
      }

    case 'rr':
      return {
        type: 'line',
        data: {
          labels: timeLabels,
          datasets: [
            {
              label: 'Respiration Rate',
              data: generateRRData(),
              borderColor: '#9b59b6',
              backgroundColor: 'rgba(155, 89, 182, 0.2)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointRadius: 0,
              pointHoverRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: context => `${(context.parsed.y as number).toFixed(1)} breaths/min` } },
          },
          scales: {
            y: { beginAtZero: false, min: 8, max: 30, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: value => value + ' br/min' } },
            x: { display: false },
          },
        },
      }

    case 'temp':
      return {
        type: 'line',
        data: {
          labels: timeLabels,
          datasets: [
            {
              label: 'Temperature',
              data: generateTempData(),
              borderColor: '#e67e22',
              backgroundColor: 'rgba(230, 126, 34, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointRadius: 0,
              pointHoverRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: context => `${(context.parsed.y as number).toFixed(1)}°C` } },
          },
          scales: {
            y: { beginAtZero: false, min: 35, max: 40, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: value => value + '°C' } },
            x: { display: false },
          },
        },
      }

    case 'ecg':
      return {
        type: 'line',
        data: {
          labels: Array.from({ length: 100 }, (_, i) => i),
          datasets: [
            {
              label: 'ECG',
              data: generateECGData(),
              borderColor: '#16a085',
              backgroundColor: 'rgba(22, 160, 133, 0.1)',
              borderWidth: 1.5,
              tension: 0,
              fill: false,
              pointRadius: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { display: false }, x: { display: false } },
          animation: false,
        },
      }

    case 'hr':
    default:
      return {
        type: 'line',
        data: {
          labels: timeLabels,
          datasets: [
            {
              label: 'Heart Rate (BPM)',
              data: generateHRData(),
              borderColor: '#27ae60',
              backgroundColor: 'rgba(39, 174, 96, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointRadius: 0,
              pointHoverRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: context => `${(context.parsed.y as number).toFixed(0)} BPM` } },
          },
          scales: {
            y: { beginAtZero: false, min: 50, max: 150, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: value => value + ' BPM' } },
            x: { display: false },
          },
        },
      }
  }
}

/** Fresh random data for the 2-second refresh (updateCharts() in the original). */
export function refreshSparklineData(chartType: Exclude<SparklineKey, 'ecg'>): number[][] {
  switch (chartType) {
    case 'hr':
      return [generateHRData()]
    case 'spo2':
      return [generateSpO2Data()]
    case 'bp': {
      const bp = generateBPData()
      return [bp.systolic, bp.diastolic]
    }
    case 'rr':
      return [generateRRData()]
    case 'temp':
      return [generateTempData()]
  }
}
