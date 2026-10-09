import type { LiveVitalsResponse, Sbar, SummaryPattern, TrendBlock, VitalsSummary } from '../../api/types'
import { PATTERN_COLOR, RISK_COLOR, SEVERITY_COLOR, TREND_STYLE } from '../../utils/riskStyles'
import { BulletRows } from '../BulletRows'

interface LiveClinicalSummaryCardProps {
  title: string
  live: LiveVitalsResponse | null
  error: Error | null
  lastUpdated: Date | null
  showVitals?: boolean
  showSbar?: boolean
  cardClassName?: string
}

/** The "Live Clinical Summary" card shared by Dashboard, Analysis and Doctor Summary. */
export function LiveClinicalSummaryCard({ title, live, error, lastUpdated, showVitals = false, showSbar = false, cardClassName = '' }: LiveClinicalSummaryCardProps) {
  let status = 'Connecting to live vitals...'
  if (error) status = 'Live feed unavailable - retrying...'
  else if (lastUpdated) status = `Live · updated ${lastUpdated.toLocaleTimeString()}`

  return (
    <div className="row g-3 mb-4">
      <div className="col-12">
        <div className={`card live-summary-card ${cardClassName}`.trim()}>
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
            <span>
              <span className="live-status-dot"></span>
              <i className="bi bi-broadcast"></i> {title}
            </span>
            <small id="liveSummaryUpdated">{status}</small>
          </div>
          <div className="card-body" id="liveClinicalSummary">
            {live?.summary ? (
              <SummaryBody summary={live.summary} showVitals={showVitals} showSbar={showSbar} />
            ) : (
              <p className="text-muted mb-0">Waiting for live vitals...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryBody({ summary, showVitals, showSbar }: { summary: VitalsSummary; showVitals: boolean; showSbar: boolean }) {
  const risk = summary.risk_level || 'Low'
  const riskColor = RISK_COLOR[risk] ?? 'secondary'
  const news = summary.scores?.news2
  const qsofa = summary.scores?.qsofa
  const sirs = summary.scores?.sirs
  const trend = TREND_STYLE[summary.trend?.direction] ?? TREND_STYLE.Stable

  return (
    <>
      <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
        <span className={`badge bg-${riskColor} live-risk-badge ${risk === 'Critical' ? 'live-critical' : ''}`}>{risk.toUpperCase()} RISK</span>
        <span className={`badge live-triage live-triage-${String(summary.triage || '').toLowerCase()}`}>Triage: {summary.triage}</span>
        <span className="badge bg-secondary" title={news?.note}>
          NEWS2*: {news?.score} ({news?.band})
        </span>
        <span className="badge bg-secondary" title={qsofa?.note}>
          qSOFA*: {qsofa?.score}/2
        </span>
        <span className="badge bg-secondary" title={sirs?.note}>
          SIRS: {sirs?.score}/3
        </span>
        <span className={`badge bg-${trend.color}`}>
          <i className={`bi bi-${trend.icon}`}></i> {summary.trend?.direction}
        </span>
      </div>
      <h5 className={`live-headline text-${riskColor} mb-3`}>{summary.headline}</h5>
      {showVitals && <VitalStrip summary={summary} />}
      {summary.alerts?.length > 0 && (
        <div className="alert alert-danger py-2 mb-3">
          {summary.alerts.map(alert => (
            <div key={alert}>
              <i className="bi bi-exclamation-octagon-fill"></i> {alert}
            </div>
          ))}
        </div>
      )}
      <p className="live-narrative">{summary.narrative}</p>
      <div className="row g-3">
        <div className="col-lg-6">
          <h6>
            <i className="bi bi-list-check"></i> Key Findings
          </h6>
          <BulletRows items={summary.key_findings} />
        </div>
        <div className="col-lg-6">
          <h6>
            <i className="bi bi-diagram-3-fill"></i> Detected Patterns
          </h6>
          <Patterns patterns={summary.patterns} />
        </div>
      </div>
      <div className="row g-3 mt-1">
        <div className="col-lg-6">
          <h6>
            <i className="bi bi-calculator"></i> Haemodynamic Indices
          </h6>
          <div className="table-responsive">
            <table className="table table-sm live-table mb-0">
              <tbody>
                {Object.entries(summary.derived_indices ?? {}).map(([key, idx]) => (
                  <tr key={key}>
                    <td>{idx.label}</td>
                    <td className="fw-semibold text-nowrap">
                      {idx.value} {idx.unit}
                    </td>
                    <td className="small">{idx.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="col-lg-6">
          <h6>
            <i className="bi bi-graph-up-arrow"></i> Trend (last {summary.trend?.window_seconds ?? 0} s)
          </h6>
          <Trend trend={summary.trend} />
        </div>
      </div>
      <h6 className="mt-3">
        <i className="bi bi-check2-square"></i> Recommended Actions
      </h6>
      <ol className="live-actions mb-0">
        {(summary.recommended_actions ?? []).map(action => (
          <li key={action}>{action}</li>
        ))}
      </ol>
      {showSbar && <SbarBlock sbar={summary.sbar} />}
      <div className="small text-muted mt-3">
        <i className="bi bi-clock-history"></i> {summary.monitoring_interval}
        <br />* {news?.note} {qsofa?.note}
        <br />
        {summary.disclaimer}
      </div>
    </>
  )
}

function VitalStrip({ summary }: { summary: VitalsSummary }) {
  const perVital = summary.trend?.per_vital ?? {}
  const trendKey: Record<string, string> = { blood_pressure: 'systolic_bp' }
  return (
    <div className="live-vital-strip mb-3">
      {(summary.vital_interpretations ?? []).map(vital => {
        const direction = perVital[trendKey[vital.key] ?? vital.key]?.direction
        const arrow = direction === 'up' ? 'bi-caret-up-fill' : direction === 'down' ? 'bi-caret-down-fill' : ''
        const color = SEVERITY_COLOR[vital.severity] ?? 'secondary'
        return (
          <div className={`live-vital-chip border-${color}`} key={vital.key}>
            <div className="live-vital-label">{vital.label}</div>
            <div className="live-vital-value">
              {vital.display} {arrow && <i className={`bi ${arrow}`}></i>}
            </div>
            <div className={`live-vital-band text-${color}`}>{vital.band}</div>
          </div>
        )
      })}
    </div>
  )
}

function Patterns({ patterns }: { patterns: SummaryPattern[] }) {
  if (!patterns || patterns.length === 0) {
    return <div className="bullet-row">No combined syndrome pattern detected.</div>
  }
  return (
    <>
      {patterns.map(pattern => {
        const color = PATTERN_COLOR[pattern.severity] ?? 'secondary'
        return (
          <div className={`live-pattern border-${color}`} key={pattern.id}>
            <div className="d-flex justify-content-between align-items-start gap-2">
              <strong>{pattern.title}</strong>
              <span className={`badge bg-${color}`}>{pattern.severity}</span>
            </div>
            <div className="small mt-1">{pattern.interpretation}</div>
            <div className="small text-muted mt-1">
              <i className="bi bi-search"></i> Evidence: {(pattern.evidence ?? []).join(' · ')}
            </div>
          </div>
        )
      })}
    </>
  )
}

function Trend({ trend }: { trend: TrendBlock }) {
  const changes = trend?.changes ?? []
  return (
    <>
      <p className="small mb-2">{trend?.summary ?? ''}</p>
      {changes.length > 0 ? (
        changes.map(change => {
          const color = change.status === 'worsening' ? 'danger' : change.status === 'improving' ? 'success' : 'secondary'
          const icon = change.status === 'worsening' ? 'exclamation-triangle-fill' : change.status === 'improving' ? 'check-circle-fill' : 'dash-circle'
          return (
            <div className="bullet-row small" key={change.text}>
              <i className={`bi bi-${icon} text-${color}`}></i> {change.text}
            </div>
          )
        })
      ) : (
        <div className="small text-muted">No clinically significant change in this window.</div>
      )}
    </>
  )
}

function SbarBlock({ sbar }: { sbar: Sbar | undefined }) {
  if (!sbar) return null
  const rows: [string, string, string][] = [
    ['S', 'Situation', sbar.situation],
    ['B', 'Background', sbar.background],
    ['A', 'Assessment', sbar.assessment],
    ['R', 'Recommendation', sbar.recommendation],
  ]
  return (
    <>
      <h6 className="mt-3">
        <i className="bi bi-telephone-forward-fill"></i> SBAR Handoff
      </h6>
      <div className="live-sbar">
        {rows.map(([letter, title, text]) => (
          <div className="live-sbar-row" key={letter}>
            <span className="live-sbar-letter">{letter}</span>
            <div>
              <strong>{title}:</strong> {text}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
