import { StudentsProvider } from '@/components/students/students-context'
import { StudentsPageHeader } from '@/components/students/students-page-header'
import { StudentsStats } from '@/components/students/students-stats'
import { StudentsTable } from '@/components/students/students-table'
import { StudentFormModal } from '@/components/students/student-form-modal'
import { getStudents } from './actions'

export default async function StudentsPage() {
  const students = await getStudents()

  return (
    <StudentsProvider initialStudents={students}>
      <StudentsPageHeader />
      <StudentsStats />
      <StudentsTable />
      <StudentFormModal />
    </StudentsProvider>
  )
}
