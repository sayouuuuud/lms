import { StudentLayout } from '@/components/student/student-layout'
import { StudentSchedulePage } from '@/components/student/schedule/student-schedule-page'

export default function Page() {
  return (
    <StudentLayout>
      <StudentSchedulePage />
    </StudentLayout>
  )
}
