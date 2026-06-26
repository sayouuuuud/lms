import { ReactNode } from 'react'
import { StudentLayout as LayoutComponent } from '@/components/student/student-layout'
import { StudentProvider } from '@/components/student/student-context'
import {
  getStudentProfile,
  getStudentEnrolledCourses,
  getStudentUpcomingSchedule,
  getStudentRecentGrades,
  getStudentAnnouncements,
  getStudentLearningActivity
} from './actions'

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const profile = await getStudentProfile()
  const enrolledCourses = await getStudentEnrolledCourses()
  const schedule = await getStudentUpcomingSchedule()
  const grades = await getStudentRecentGrades()
  const announcements = await getStudentAnnouncements()
  const activity = await getStudentLearningActivity()

  // Fallback profile if not found
  const defaultProfile = {
    id: '',
    name: 'طالب غير مسجل',
    email: '',
    initials: 'ط',
    level: '',
    gender: 'غير محدد'
  }

  return (
    <StudentProvider data={{
      profile: profile || defaultProfile,
      enrolledCourses,
      schedule,
      grades,
      announcements,
      activity
    }}>
      <LayoutComponent>{children}</LayoutComponent>
    </StudentProvider>
  )
}
