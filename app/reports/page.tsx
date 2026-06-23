import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { ReportsPageHeader } from '@/components/reports/reports-page-header'
import { ReportsStats } from '@/components/reports/reports-stats'
import { RevenueReportChart } from '@/components/reports/revenue-report-chart'
import { StudentsGrowthChart } from '@/components/reports/students-growth-chart'
import { CategoryDistributionChart } from '@/components/reports/category-distribution-chart'
import { CoursePerformanceTable } from '@/components/reports/course-performance-table'

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <ReportsPageHeader />
        <ReportsStats />
        <div className="grid gap-6 lg:grid-cols-2">
          <RevenueReportChart />
          <StudentsGrowthChart />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <CategoryDistributionChart />
          </div>
          <div className="lg:col-span-2">
            <CoursePerformanceTable />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
