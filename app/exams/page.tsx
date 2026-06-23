import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { ExamsPageHeader } from '@/components/exams/exams-page-header'
import { ExamsStats } from '@/components/exams/exams-stats'
import { ExamsTable } from '@/components/exams/exams-table'

export default function ExamsPage() {
  return (
    <DashboardLayout>
      <ExamsPageHeader />
      <ExamsStats />
      <ExamsTable />
    </DashboardLayout>
  )
}
