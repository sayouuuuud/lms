import { PaymentsPageHeader } from '@/components/payments/payments-page-header'
import { PaymentsTable } from '@/components/payments/payments-table'
import { getPayments } from './actions'

export default async function PaymentsPage() {
  const payments = await getPayments()

  return (
    <div className="space-y-6">
      <PaymentsPageHeader />
      <PaymentsTable initialPayments={payments} />
    </div>
  )
}
