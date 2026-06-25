import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { MessagesPageHeader } from '@/components/messages/messages-page-header'
import { MessagesInbox } from '@/components/messages/messages-inbox'

export default function MessagesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <MessagesPageHeader />
        <MessagesInbox />
      </div>
    </DashboardLayout>
  )
}
