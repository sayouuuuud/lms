import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { StudentsPageHeader } from '@/components/students/students-page-header'
import { StudentsStats } from '@/components/students/students-stats'
import { StudentsTable } from '@/components/students/students-table'

export default function StudentsPage() {
  return (
    <DashboardLayout>
      <StudentsPageHeader />
      <StudentsStats />
      <StudentsTable />
    </DashboardLayout>
  )
}
