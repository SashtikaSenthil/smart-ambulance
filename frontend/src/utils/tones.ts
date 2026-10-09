// Semantic tones. Clinical status colours (ok / warn / serious / crit) always travel with an icon + label.
// Every class string is written out in full so Tailwind can see it.

export type Tone = 'ok' | 'warn' | 'serious' | 'crit' | 'info' | 'accent' | 'neutral'

/** Decorative card colour families (not status). */
export type Tint = 'rose' | 'sky' | 'violet' | 'amber' | 'emerald' | 'teal' | 'indigo' | 'fuchsia'

export const TONE_SOFT: Record<Tone, string> = {
  ok: 'bg-ok-soft text-ok-ink',
  warn: 'bg-warn-soft text-warn-ink',
  serious: 'bg-serious-soft text-serious-ink',
  crit: 'bg-crit-soft text-crit-ink',
  info: 'bg-info-soft text-info-ink',
  accent: 'bg-accent-soft text-accent',
  neutral: 'bg-surface-2 text-ink-2',
}

export const TONE_SOLID: Record<Tone, string> = {
  ok: 'bg-ok',
  warn: 'bg-warn',
  serious: 'bg-serious',
  crit: 'bg-crit',
  info: 'bg-info',
  accent: 'bg-accent',
  neutral: 'bg-ink-3',
}

export const TONE_TEXT: Record<Tone, string> = {
  ok: 'text-ok-ink',
  warn: 'text-warn-ink',
  serious: 'text-serious-ink',
  crit: 'text-crit-ink',
  info: 'text-info-ink',
  accent: 'text-accent',
  neutral: 'text-ink-2',
}

export const TONE_BORDER: Record<Tone, string> = {
  ok: 'border-ok',
  warn: 'border-warn',
  serious: 'border-serious',
  crit: 'border-crit',
  info: 'border-info',
  accent: 'border-accent',
  neutral: 'border-line-strong',
}

/** Left-edge accent only (keeps the other three borders neutral). */
export const TONE_BORDER_L: Record<Tone, string> = {
  ok: 'border-l-ok',
  warn: 'border-l-warn',
  serious: 'border-l-serious',
  crit: 'border-l-crit',
  info: 'border-l-info',
  accent: 'border-l-accent',
  neutral: 'border-l-line-strong',
}

/** Camera / vision risk ("Low" | "Medium" | "High" | "Pending"), case-insensitive. */
export function cameraRiskTone(value: unknown): Tone {
  const level = String(value ?? '').toUpperCase()
  if (level.includes('HIGH')) return 'crit'
  if (level.includes('MEDIUM')) return 'warn'
  if (level.includes('LOW')) return 'ok'
  return 'neutral'
}

/** Rule-based summary risk ("Low" | "Moderate" | "High" | "Critical"). */
export function summaryRiskTone(value: unknown): Tone {
  switch (String(value ?? '')) {
    case 'Critical':
      return 'crit'
    case 'High':
      return 'serious'
    case 'Moderate':
      return 'warn'
    case 'Low':
      return 'ok'
    default:
      return 'neutral'
  }
}

/** Rule-engine risk level ("High" | "Moderate" | "Low"), case-insensitive. */
export function aiRiskTone(value: unknown): Tone {
  const level = String(value ?? '').toUpperCase()
  if (level.includes('CRIT')) return 'crit'
  if (level.includes('HIGH')) return 'crit'
  if (level.includes('MOD') || level.includes('MEDIUM')) return 'warn'
  if (level.includes('LOW')) return 'ok'
  return 'neutral'
}

export function vitalSeverityTone(severity: string): Tone {
  switch (severity) {
    case 'normal':
      return 'ok'
    case 'mild':
      return 'info'
    case 'moderate':
      return 'warn'
    case 'severe':
      return 'serious'
    case 'critical':
      return 'crit'
    default:
      return 'neutral'
  }
}

export function patternTone(severity: string): Tone {
  switch (severity) {
    case 'Critical':
      return 'crit'
    case 'High':
      return 'serious'
    case 'Moderate':
      return 'warn'
    case 'Low':
      return 'info'
    default:
      return 'neutral'
  }
}

export function triageTone(triage: string): Tone {
  switch (String(triage).toLowerCase()) {
    case 'red':
      return 'crit'
    case 'orange':
      return 'serious'
    case 'yellow':
      return 'warn'
    case 'green':
      return 'ok'
    default:
      return 'neutral'
  }
}

export function trendTone(direction: string): Tone {
  if (direction === 'Deteriorating') return 'crit'
  if (direction === 'Slowly worsening') return 'warn'
  if (direction === 'Improving' || direction === 'Slowly improving') return 'ok'
  return 'neutral'
}

/** Patient outcome status (records table / history). */
export function outcomeTone(status: string): Tone {
  if (status === 'Recovered' || status === 'Completed') return 'ok'
  if (status === 'Ongoing') return 'warn'
  if (status === 'Recovering') return 'info'
  return 'neutral'
}

/** Diagnosis severity_color from the backend (Bootstrap colour names) -> tone. */
export function diagnosisTone(severityColor: unknown): Tone {
  switch (String(severityColor)) {
    case 'danger':
      return 'crit'
    case 'warning':
      return 'warn'
    case 'info':
      return 'info'
    case 'success':
      return 'ok'
    case 'primary':
      return 'accent'
    default:
      return 'neutral'
  }
}

/** Backend strings occasionally contain en/em dashes; render them as a plain separator. */
export function plainDashes(text: unknown): string {
  return String(text ?? '').replace(/\s*[–—]\s*/g, ': ')
}
