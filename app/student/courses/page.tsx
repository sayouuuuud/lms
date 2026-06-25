import { StudentLayout } from '@/components/student/student-layout'
import { StudentCoursesPage } from '@/components/student/courses/student-courses-page'

export default function Page() {
  return (
    <StudentLayout>
      <StudentCoursesPage />
    </StudentLayout>
  )
}
