import { StudentLayout } from '@/components/student/student-layout'
import { StudentNotificationsPage } from '@/components/student/notifications/student-notifications-page'

export default function Page() {
  return (
    <StudentLayout>
      <StudentNotificationsPage />
    </StudentLayout>
  )
}
