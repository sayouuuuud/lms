import { StudentsProvider } from '@/components/students/students-context'
import { StudentsPageHeader } from '@/components/students/students-page-header'
import { StudentsStats } from '@/components/students/students-stats'
import { StudentsTable } from '@/components/students/students-table'
import { StudentFormModal } from '@/components/students/student-form-modal'
import { getStudents, getStages } from './actions'

export default async function StudentsPage() {
  const [students, stages] = await Promise.all([getStudents(), getStages()])

  return (
    <StudentsProvider initialStudents={students} stages={stages}>
      <StudentsPageHeader />
      <StudentsStats />
      <StudentsTable />
      <StudentFormModal />
    </StudentsProvider>
  )
}
