import { StudentNotificationsPage } from '@/components/student/notifications/student-notifications-page'
import { getStudentAnnouncements } from '../actions'

export default async function Page() {
  const notifications = await getStudentAnnouncements()
  
  return (
    <StudentNotificationsPage notifications={notifications} />
  )
}
