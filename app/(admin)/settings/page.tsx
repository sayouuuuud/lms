import { SettingsPageHeader } from '@/components/settings/settings-page-header'
import { SettingsPanel } from '@/components/settings/settings-panel'
import { getSettings } from './actions'

export default async function SettingsPage() {
  const initialSettings = await getSettings()

  return (
    <div className="space-y-6">
      <SettingsPageHeader />
      <SettingsPanel initialSettings={initialSettings} />
    </div>
  )
}
