import type { HospitalPreparation } from '../../api/types'
import { prepHeaderStyle } from '../../utils/riskStyles'

/** Category cards (Teams / Equipment / Supplies / Room Setup). `compact` = doctor-summary variant (small + py-1). */
export function HospitalPreparationCards({ items, compact = false, id }: { items: HospitalPreparation[]; compact?: boolean; id?: string }) {
  return (
    <div id={id} className="row g-3">
      {(items ?? []).map(prep => {
        const style = prepHeaderStyle(prep.category)
        return (
          <div className="col-md-6 col-lg-3" key={prep.category}>
            <div className="card h-100 border-0 shadow-sm">
              <div className={`card-header bg-${style.bg} bg-opacity-10 text-${style.bg} fw-bold${compact ? ' small' : ''}`}>
                <i className={`bi bi-${style.icon}`}></i> {prep.category || 'Preparation'}
              </div>
              <div className="list-group list-group-flush">
                {(prep.details ?? []).map(item => (
                  <div className={`list-group-item small${compact ? ' py-1' : ''}`} key={item}>
                    <i className="bi bi-check2-circle text-success"></i> {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
