import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { NotificationsFeed } from '@/components/notifications/notifications-feed'

export default function NotificationsPage() {
  return (
    <DashboardLayout>
      <NotificationsFeed />
    </DashboardLayout>
  )
}
