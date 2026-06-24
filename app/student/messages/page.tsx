import { StudentLayout } from '@/components/student/student-layout'
import { StudentMessagesPage } from '@/components/student/messages/student-messages-page'

export default function Page() {
  return (
    <StudentLayout>
      <StudentMessagesPage />
    </StudentLayout>
  )
}
