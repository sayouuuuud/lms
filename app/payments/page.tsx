import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { PaymentsPageHeader } from '@/components/payments/payments-page-header'
import { PaymentsTable } from '@/components/payments/payments-table'

export default function PaymentsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PaymentsPageHeader />
        <PaymentsTable />
      </div>
    </DashboardLayout>
  )
}
