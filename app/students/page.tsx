import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { StudentsProvider } from '@/components/students/students-context'
import { StudentsPageHeader } from '@/components/students/students-page-header'
import { StudentsStats } from '@/components/students/students-stats'
import { StudentsTable } from '@/components/students/students-table'
import { StudentFormModal } from '@/components/students/student-form-modal'

export default function StudentsPage() {
  return (
    <DashboardLayout>
      <StudentsProvider>
        <StudentsPageHeader />
        <StudentsStats />
        <StudentsTable />
        <StudentFormModal />
      </StudentsProvider>
    </DashboardLayout>
  )
}
