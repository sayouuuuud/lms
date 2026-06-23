import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { CouponsProvider } from '@/components/coupons/coupons-context'
import { CouponsPageHeader } from '@/components/coupons/coupons-page-header'
import { CouponsStats } from '@/components/coupons/coupons-stats'
import { CouponsTable } from '@/components/coupons/coupons-table'
import { CouponFormModal } from '@/components/coupons/coupon-form-modal'

export default function CouponsPage() {
  return (
    <DashboardLayout>
      <CouponsProvider>
        <div className="space-y-6">
          <CouponsPageHeader />
          <CouponsStats />
          <CouponsTable />
        </div>
        <CouponFormModal />
      </CouponsProvider>
    </DashboardLayout>
  )
}
