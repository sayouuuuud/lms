import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { ReportsPageHeader } from '@/components/reports/reports-page-header'
import { ReportsStats } from '@/components/reports/reports-stats'
import { RevenueReportChart } from '@/components/reports/revenue-report-chart'
import { StudentsGrowthChart } from '@/components/reports/students-growth-chart'
import { CategoryDistributionChart } from '@/components/reports/category-distribution-chart'
import { CoursePerformanceTable } from '@/components/reports/course-performance-table'
import { ReportsHistoryTable } from '@/components/reports/reports-history-table'
import { getReports, getReportsData } from './actions'

export default async function ReportsPage() {
  const reports = await getReports()
  const data = await getReportsData()
  
  if ('error' in data) return <div>{data.error}</div>
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <ReportsPageHeader />
        <ReportsStats stats={data.reportStats} />
        <div className="grid gap-6 lg:grid-cols-2">
          <RevenueReportChart data={data.monthlyRevenue} />
          <StudentsGrowthChart data={data.studentsGrowth} />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <CategoryDistributionChart data={data.categoryDistribution} />
          </div>
          <div className="lg:col-span-2">
            <CoursePerformanceTable courses={data.coursePerformance} />
          </div>
        </div>
        <ReportsHistoryTable reports={reports} />
      </div>
    </DashboardLayout>
  )
}
