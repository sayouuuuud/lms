import { StudentLayout } from '@/components/student/student-layout'
import { StudentAssignmentsPage } from '@/components/student/assignments/student-assignments-page'

export default function Page() {
  return (
    <StudentLayout>
      <StudentAssignmentsPage />
    </StudentLayout>
  )
}
