import { Compass, Gauge } from '@phosphor-icons/react'
import { PageHeader } from '../components/layout/PageHeader'
import { ButtonLink } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/Feedback'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Page Not Found - AI Ambulance System')
  return (
    <>
      <PageHeader title="Page not found" />
      <Card tint="indigo">
        <EmptyState icon={Compass} title="This page does not exist">
          The link may be outdated. Use the navigation, or return to the live dashboard.
        </EmptyState>
        <div className="flex justify-center pb-10">
          <ButtonLink to="/" variant="primary" icon={Gauge}>
            Back to dashboard
          </ButtonLink>
        </div>
      </Card>
    </>
  )
}
