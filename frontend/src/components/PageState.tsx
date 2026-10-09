interface PageStateProps {
  loading: boolean
  error: Error | null
  onRetry?: () => void
}

/** Loading / error placeholder shown while a page's initial payload is fetched from the API. */
export function PageState({ loading, error, onRetry }: PageStateProps) {
  if (error) {
    return (
      <div className="alert alert-danger d-flex flex-wrap align-items-center justify-content-between gap-2" role="alert">
        <span>
          <i className="bi bi-exclamation-triangle-fill"></i> Unable to load data from the backend ({error.message}). Is the Flask API running on port 5001?
        </span>
        {onRetry && (
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    )
  }
  if (loading) {
    return (
      <p className="text-muted">
        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        Loading...
      </p>
    )
  }
  return null
}
