/** Split a reading like "86 BPM", "118/76 mmHg" or "98.6°F" into value + unit. Non-numeric text stays whole. */
export function splitReading(reading: unknown): { value: string; unit: string; numeric: boolean } {
  const text = String(reading ?? '').trim()
  const match = text.match(/^(-?[\d.]+(?:\/[\d.]+)?)\s*(.*)$/)
  if (!match) return { value: text, unit: '', numeric: false }
  return { value: match[1], unit: match[2], numeric: true }
}
