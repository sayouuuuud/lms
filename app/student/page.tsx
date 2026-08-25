import { StudentDashboardShell } from '@/components/student/student-dashboard-shell'
import { getStudentLastWatchedLesson } from '@/app/student/actions'

export default async function StudentPage() {
  const lastWatched = await getStudentLastWatchedLesson()
  return <StudentDashboardShell lastWatched={lastWatched} />
}
