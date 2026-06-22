import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { CouponsPageHeader } from '@/components/coupons/coupons-page-header'
import { CouponsStats } from '@/components/coupons/coupons-stats'
import { CouponsTable } from '@/components/coupons/coupons-table'

export default function CouponsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <CouponsPageHeader />
        <CouponsStats />
        <CouponsTable />
      </div>
    </DashboardLayout>
  )
}
