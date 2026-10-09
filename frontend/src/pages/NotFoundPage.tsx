import { Link } from 'react-router'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Page Not Found - AI Ambulance System')
  return (
    <>
      <div className="page-header">
        <div>
          <h4 className="mb-0">Page Not Found</h4>
        </div>
      </div>
      <div className="alert alert-warning" role="alert">
        <i className="bi bi-exclamation-circle-fill"></i> The page you requested does not exist. <Link to="/">Back to Dashboard</Link>
      </div>
    </>
  )
}
