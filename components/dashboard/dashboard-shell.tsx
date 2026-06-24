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

      {/* Row 1: الإيرادات الشهرية (wide) + أكثر الكورسات + نشاط المنصة */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="xl:col-span-2">
          <RevenueChart />
        </div>
        <div className="xl:col-span-1">
          <TopCourses />
        </div>
        <div className="xl:col-span-1">
          <ActivityChart />
        </div>
      </div>

      {/* Row 2: آخر الرسائل + آخر الطلاب المسجلين + نمو الطلاب (wide) */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="xl:col-span-1">
          <LatestMessages />
        </div>
        <div className="xl:col-span-1">
          <LatestStudents />
        </div>
        <div className="xl:col-span-2">
          <StudentsChart />
        </div>
      </div>

      {/* Row 3: آخر المدفوعات + آخر الكورسات */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <LatestPayments />
        <LatestCourses />
      </div>
    </DashboardLayout>
  )
}
