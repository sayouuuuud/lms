import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { PaymentsPageHeader } from '@/components/payments/payments-page-header'
import { PaymentsTable } from '@/components/payments/payments-table'
import { getPayments } from './actions'

export default async function PaymentsPage() {
  const payments = await getPayments()

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PaymentsPageHeader />
        <PaymentsTable initialPayments={payments} />
      </div>
    </DashboardLayout>
  )
}
