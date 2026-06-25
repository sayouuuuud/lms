import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { SettingsPageHeader } from '@/components/settings/settings-page-header'
import { SettingsPanel } from '@/components/settings/settings-panel'

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <SettingsPageHeader />
        <SettingsPanel />
      </div>
    </DashboardLayout>
  )
}
