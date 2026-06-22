import { DashboardLayout } from './dashboard-layout'
import { PageHeader } from './page-header'
import { StatCards } from './stat-cards'
import { RevenueChart } from './revenue-chart'
import { StudentsChart } from './students-chart'
import { TopCourses } from './top-courses'
import { ActivityChart } from './activity-chart'
import { LatestMessages } from './latest-messages'
import { LatestPayments } from './latest-payments'
import { LatestStudents } from './latest-students'
import { LatestCourses } from './latest-courses'

export function DashboardShell() {
  return (
    <DashboardLayout>
      <PageHeader />

      <StatCards />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="xl:col-span-1">
          <RevenueChart />
        </div>
        <div className="xl:col-span-1">
          <StudentsChart />
        </div>
        <div className="xl:col-span-1">
          <TopCourses />
        </div>
        <div className="xl:col-span-1">
          <ActivityChart />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <LatestMessages />
        <LatestPayments />
        <LatestStudents />
        <LatestCourses />
      </div>
    </DashboardLayout>
  )
}
