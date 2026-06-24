import { StudentLayout } from '@/components/student/student-layout'
import { StudentBillingPage } from '@/components/student/billing/student-billing-page'

export default function Page() {
  return (
    <StudentLayout>
      <StudentBillingPage />
    </StudentLayout>
  )
}
