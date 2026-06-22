import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { CoursesPageHeader } from '@/components/courses/courses-page-header'
import { CoursesStats } from '@/components/courses/courses-stats'
import { CoursesGrid } from '@/components/courses/courses-grid'

export default function CoursesPage() {
  return (
    <DashboardLayout>
      <CoursesPageHeader />
      <CoursesStats />
      <CoursesGrid />
    </DashboardLayout>
  )
}
