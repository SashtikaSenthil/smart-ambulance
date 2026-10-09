import { Route, Routes } from 'react-router'
import { AppLayout } from './components/layout/AppLayout'
import { AnalysisPage } from './pages/analysis/AnalysisPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { DoctorSummaryPage } from './pages/doctor/DoctorSummaryPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PatientHistoryPage } from './pages/records/PatientHistoryPage'
import { PatientRecordsPage } from './pages/records/PatientRecordsPage'

// Same URLs as the original Flask pages.
export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="analysis" element={<AnalysisPage />} />
        <Route path="doctor-summary" element={<DoctorSummaryPage />} />
        <Route path="records" element={<PatientRecordsPage />} />
        <Route path="records/:patientId/history" element={<PatientHistoryPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
