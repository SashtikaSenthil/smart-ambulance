import { lazy, Suspense, type ReactNode } from 'react'
import { Route, Routes } from 'react-router'
import { AppLayout } from './components/layout/AppLayout'
import { PageState } from './components/PageState'

// Route-level code splitting: each page (and its charts) loads on demand.
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })))
const AnalysisPage = lazy(() => import('./pages/analysis/AnalysisPage').then(m => ({ default: m.AnalysisPage })))
const DoctorSummaryPage = lazy(() => import('./pages/doctor/DoctorSummaryPage').then(m => ({ default: m.DoctorSummaryPage })))
const PatientRecordsPage = lazy(() => import('./pages/records/PatientRecordsPage').then(m => ({ default: m.PatientRecordsPage })))
const PatientHistoryPage = lazy(() => import('./pages/records/PatientHistoryPage').then(m => ({ default: m.PatientHistoryPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })))

function Page({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageState loading error={null} />}>{children}</Suspense>
}

// Same URLs as the original Flask pages.
export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Page><DashboardPage /></Page>} />
        <Route path="analysis" element={<Page><AnalysisPage /></Page>} />
        <Route path="doctor-summary" element={<Page><DoctorSummaryPage /></Page>} />
        <Route path="records" element={<Page><PatientRecordsPage /></Page>} />
        <Route path="records/:patientId/history" element={<Page><PatientHistoryPage /></Page>} />
        <Route path="*" element={<Page><NotFoundPage /></Page>} />
      </Route>
    </Routes>
  )
}
