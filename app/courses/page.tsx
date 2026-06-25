import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { CoursesPageHeader } from '@/components/courses/courses-page-header'
import { CoursesStats } from '@/components/courses/courses-stats'
import { CoursesGrid } from '@/components/courses/courses-grid'
import { getCourses } from './actions'

export default async function CoursesPage() {
  const courses = await getCourses()

  return (
    <DashboardLayout>
      <CoursesPageHeader />
      <CoursesStats />
      <CoursesGrid courses={courses} />
    </DashboardLayout>
  )
}
