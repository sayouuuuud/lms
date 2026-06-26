import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { NotificationsFeed } from '@/components/notifications/notifications-feed'
import { getNotifications } from './actions'

export default async function NotificationsPage() {
  const notifications = await getNotifications()

  return (
    <DashboardLayout>
      <NotificationsFeed initialNotifications={notifications} />
    </DashboardLayout>
  )
}
