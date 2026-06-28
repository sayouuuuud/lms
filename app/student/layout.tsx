import { ReactNode } from 'react'
import { StudentLayout as LayoutComponent } from '@/components/student/student-layout'
import { StudentProvider } from '@/components/student/student-context'
import {
  getStudentProfile,
  getStudentEnrolledCourses,
  getStudentUpcomingSchedule,
  getStudentRecentGrades,
  getStudentAnnouncements,
  getStudentLearningActivity,
  getAvailableStagesMinimal
} from './actions'
import { ForceGradeSelection } from '@/components/student/force-grade-selection'

export default async function StudentLayout({ children }: { children: ReactNode }) {
  // Fetch the portal data in parallel instead of a slow sequential waterfall.
  const [profile, enrolledCourses, schedule, grades, announcements, activity, stages] =
    await Promise.all([
      getStudentProfile(),
      getStudentEnrolledCourses(),
      getStudentUpcomingSchedule(),
      getStudentRecentGrades(),
      getStudentAnnouncements(),
      getStudentLearningActivity(),
      getAvailableStagesMinimal(),
    ])

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
      {profile?.profile && !profile.profile.grade && (
        <ForceGradeSelection stages={stages} />
      )}
    </StudentProvider>
  )
}
