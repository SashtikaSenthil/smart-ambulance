// Chart.js theming from the CSS design tokens, following the dataviz mark specs:
// 2px lines, >=8px markers with a surface ring, <=24px bars with 4px rounded data-ends,
// 10% area washes, solid hairline grids, text in ink tokens (never the series colour).
import Chart from 'chart.js/auto'

export interface ChartTokens {
  ink: string
  ink2: string
  ink3: string
  surface: string
  grid: string
  axis: string
  line: string
  accent: string
  series: string[]
  ok: string
  warn: string
  serious: string
  crit: string
  font: string
}

export function readChartTokens(): ChartTokens {
  const style = getComputedStyle(document.documentElement)
  const v = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  return {
    ink: v('--ink', '#0f1d26'),
    ink2: v('--ink-2', '#44535e'),
    ink3: v('--ink-3', '#5f6e79'),
    surface: v('--surface', '#fcfdfd'),
    grid: v('--chart-grid', '#e2e8eb'),
    axis: v('--chart-axis', '#c5cfd4'),
    line: v('--line-strong', 'rgba(16,42,56,0.16)'),
    accent: v('--accent', '#0b7480'),
    series: [v('--series-1', '#2a78d6'), v('--series-2', '#eb6834'), v('--series-3', '#1baf7a'), v('--series-4', '#eda100'), v('--series-5', '#e87ba4')],
    ok: v('--ok', '#15964f'),
    warn: v('--warn', '#d98a06'),
    serious: v('--serious', '#e0703f'),
    crit: v('--crit', '#d03b3b'),
    font: '"Geist Variable", ui-sans-serif, system-ui, sans-serif',
  }
}

/** Hex/rgb colour at a given alpha (used for the ~10% area wash). */
export function withAlpha(color: string, alpha: number): string {
  const hex = color.trim()
  if (/^#([0-9a-f]{6})$/i.test(hex)) {
    const n = parseInt(hex.slice(1), 16)
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
  }
  return hex
}

/** Apply the global defaults for the current theme (called before every chart is created). */
export function applyChartDefaults(t: ChartTokens) {
  const d = Chart.defaults
  d.font.family = t.font
  d.font.size = 12
  d.color = t.ink3
  d.borderColor = t.grid
  d.animation = { duration: 700, easing: 'easeOutQuart' }
  d.interaction.mode = 'index'
  d.interaction.intersect = false

  d.elements.line.borderWidth = 2
  d.elements.line.borderCapStyle = 'round'
  d.elements.line.borderJoinStyle = 'round'
  d.elements.point.radius = 0
  d.elements.point.hoverRadius = 5
  d.elements.point.hoverBorderWidth = 2
  d.elements.point.borderColor = t.surface
  d.elements.bar.borderRadius = 4
  d.elements.arc.borderColor = t.surface
  d.elements.arc.borderWidth = 2

  d.plugins.legend.labels.color = t.ink2
  d.plugins.legend.labels.usePointStyle = true
  d.plugins.legend.labels.pointStyle = 'circle'
  d.plugins.legend.labels.boxWidth = 8
  d.plugins.legend.labels.boxHeight = 8
  d.plugins.legend.labels.padding = 16

  const tooltip = d.plugins.tooltip
  tooltip.backgroundColor = t.surface
  tooltip.titleColor = t.ink
  tooltip.bodyColor = t.ink2
  tooltip.borderColor = t.line
  tooltip.borderWidth = 1
  tooltip.padding = 10
  tooltip.cornerRadius = 10
  tooltip.boxPadding = 4
  tooltip.usePointStyle = true
  tooltip.titleFont = { family: t.font, weight: 600, size: 12 }
  tooltip.bodyFont = { family: t.font, size: 12 }
}

/** Recessive axes: solid hairline grid, no dashed rules, muted ticks. */
export function axes(t: ChartTokens, options: { yMin?: number; yMax?: number; beginAtZero?: boolean; yTick?: (value: number | string) => string; showX?: boolean; xGrid?: boolean } = {}) {
  return {
    x: {
      display: options.showX ?? true,
      grid: { display: options.xGrid ?? false, color: t.grid },
      border: { color: t.axis },
      ticks: { color: t.ink3, maxRotation: 0, autoSkipPadding: 12 },
    },
    y: {
      min: options.yMin,
      max: options.yMax,
      beginAtZero: options.beginAtZero ?? false,
      grid: { color: t.grid },
      border: { display: false },
      ticks: { color: t.ink3, padding: 8, callback: options.yTick },
    },
  }
}
