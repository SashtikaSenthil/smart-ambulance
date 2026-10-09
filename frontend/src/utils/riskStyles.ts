// Colour / badge rules ported 1:1 from the original templates and static/live_summary.js.

export const DX_COLORS = ['danger', 'warning', 'info', 'success', 'secondary', 'primary', 'dark'] as const

export const RISK_COLOR: Record<string, string> = { Low: 'success', Moderate: 'warning', High: 'danger', Critical: 'danger' }
export const SEVERITY_COLOR: Record<string, string> = { normal: 'success', mild: 'info', moderate: 'warning', severe: 'danger', critical: 'danger' }
export const PATTERN_COLOR: Record<string, string> = { Low: 'info', Moderate: 'warning', High: 'danger', Critical: 'danger' }
export const TREND_STYLE: Record<string, { color: string; icon: string }> = {
  Deteriorating: { color: 'danger', icon: 'arrow-down-right' },
  'Slowly worsening': { color: 'warning', icon: 'arrow-down-right' },
  Improving: { color: 'success', icon: 'arrow-up-right' },
  'Slowly improving': { color: 'success', icon: 'arrow-up-right' },
  Stable: { color: 'secondary', icon: 'arrow-right' },
  'Establishing baseline': { color: 'secondary', icon: 'hourglass-split' },
}

/** Dashboard JS getRiskBadgeClass(): case-insensitive HIGH / MEDIUM / LOW. */
export function riskBadgeClass(value: unknown): string {
  const level = String(value ?? '').toUpperCase()
  if (level.includes('HIGH')) return 'bg-danger'
  if (level.includes('MEDIUM')) return 'bg-warning'
  if (level.includes('LOW')) return 'bg-success'
  return 'bg-secondary'
}

/** Analysis page Jinja: exact match on 'High' / 'Medium'. */
export function analysisCameraColor(value: string): string {
  return value === 'High' ? 'danger' : value === 'Medium' ? 'warning' : 'success'
}

/** Doctor summary Jinja: case-sensitive `'HIGH' in value` (title-cased risks therefore render green - original behaviour). */
export function doctorCameraColor(value: string): string {
  return value.includes('HIGH') ? 'danger' : value.includes('MEDIUM') ? 'warning' : 'success'
}

/** Doctor summary Jinja for Overall Risk: uses |upper and a secondary fallback. */
export function doctorOverallColor(value: string): string {
  const upper = value.toUpperCase()
  if (upper.includes('HIGH')) return 'danger'
  if (upper.includes('MEDIUM')) return 'warning'
  if (upper.includes('LOW')) return 'success'
  return 'secondary'
}

/** Records table / history summary status badge. */
export function statusBadgeClass(status: string): string {
  if (status === 'Recovered') return 'bg-success'
  if (status === 'Ongoing') return 'bg-warning'
  return 'bg-danger'
}

/** History "Treatment Flow" badge. */
export function eventBadgeClass(status: string): string {
  if (status === 'Completed' || status === 'Recovered') return 'bg-success'
  if (status === 'Ongoing') return 'bg-warning'
  return 'bg-danger'
}

/** Hospital preparation category header style (prepHeaderStyle in analysis.html). */
export function prepHeaderStyle(category: string): { bg: string; icon: string } {
  if (category === 'Teams') return { bg: 'danger', icon: 'people-fill' }
  if (category === 'Equipment') return { bg: 'primary', icon: 'tools' }
  if (category === 'Supplies') return { bg: 'success', icon: 'box-seam-fill' }
  return { bg: 'info', icon: 'door-open-fill' }
}

export function safeDxColor(color: unknown): string {
  return (DX_COLORS as readonly string[]).includes(String(color)) ? String(color) : 'secondary'
}
