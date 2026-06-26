import { CouponsProvider } from '@/components/coupons/coupons-context'
import { CouponsPageHeader } from '@/components/coupons/coupons-page-header'
import { CouponsStats } from '@/components/coupons/coupons-stats'
import { CouponsTable } from '@/components/coupons/coupons-table'
import { CouponFormModal } from '@/components/coupons/coupon-form-modal'
import { getCoupons } from './actions'

export default async function CouponsPage() {
  const coupons = await getCoupons()

  return (
    <>
      <CouponsProvider initialCoupons={coupons}>
        <div className="space-y-6">
          <CouponsPageHeader />
          <CouponsStats />
          <CouponsTable />
        </div>
        <CouponFormModal />
      </CouponsProvider>
    </>
  )
}
