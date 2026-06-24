import { StudentLayout } from '@/components/student/student-layout'
import { StudentAssignmentsPage } from '@/components/student/assignments/student-assignments-page'

export const metadata = {
  title: 'الواجبات | بوابة الطالب',
  description: 'تابع واجباتك وتسليماتك وتصحيحات المدرّب',
}

export default function Page() {
  return (
    <StudentLayout>
      <StudentAssignmentsPage />
    </StudentLayout>
  )
}
