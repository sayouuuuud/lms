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

export function DashboardShell({ data }: { data?: any }) {
  if (!data) return <PageHeader />

  return (
    <div className="space-y-6">
      <PageHeader />

      <StatCards stats={data.stats} />

      {/* Row 1: الإيرادات الشهرية (wide) + أكثر الكورسات + نشاط المنصة */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="xl:col-span-2">
          <RevenueChart data={data.revenueData} />
        </div>
        <div className="xl:col-span-1">
          <TopCourses courses={data.topCourses} />
        </div>
        <div className="xl:col-span-1">
          <ActivityChart />
        </div>
      </div>

      {/* Row 2: آخر الرسائل + آخر الطلاب المسجلين + نمو الطلاب (wide) */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="xl:col-span-1">
          <LatestMessages messages={data.latestMessages} />
        </div>
        <div className="xl:col-span-1">
          <LatestStudents students={data.latestStudents} />
        </div>
        <div className="xl:col-span-2">
          <StudentsChart data={data.studentsData} />
        </div>
      </div>

      {/* Row 3: آخر المدفوعات + آخر الكورسات */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <LatestPayments payments={data.latestPayments} />
        <LatestCourses courses={data.latestCourses} />
      </div>
    </div>
  )
}
