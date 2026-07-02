import { SettingsPageHeader } from '@/components/settings/settings-page-header'
import { SettingsPanel } from '@/components/settings/settings-panel'
import { getSettings, getAdminProfile } from './actions'

export default async function SettingsPage() {
  const [initialSettings, adminProfile] = await Promise.all([
    getSettings(),
    getAdminProfile(),
  ])

  return (
    <div className="space-y-6">
      <SettingsPageHeader />
      <SettingsPanel initialSettings={initialSettings} adminProfile={adminProfile} />
    </div>
  )
}
