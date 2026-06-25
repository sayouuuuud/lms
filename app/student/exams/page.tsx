import { StudentLayout } from '@/components/student/student-layout'
import { StudentExamsPage } from '@/components/student/exams/student-exams-page'

export default function Page() {
  return (
    <StudentLayout>
      <StudentExamsPage />
    </StudentLayout>
  )
}
