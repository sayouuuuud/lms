import { NotificationsFeed } from '@/components/notifications/notifications-feed'
import { getNotifications } from './actions'

export default async function NotificationsPage() {
  const notifications = await getNotifications()

  return <NotificationsFeed initialNotifications={notifications} />
}
