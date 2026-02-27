import { AppearanceSettingsClient } from './appearance-settings-client'
import { getUserSettings } from '@/lib/actions/user/settings'

export default async function AppearancePage() {
  const settings = await getUserSettings()

  return <AppearanceSettingsClient initialSettings={settings} />
}
