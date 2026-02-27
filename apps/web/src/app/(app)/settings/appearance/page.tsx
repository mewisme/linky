import { AppearanceSettingsClient } from './appearance-settings-client'
import type { UsersAPI } from '@/types/users.types'
import { backendUrl } from '@/lib/api/fetch/backend-url'
import { serverFetch } from '@/lib/api/fetch/server-api'

export default async function AppearanceSettingsPage() {
  const settings = await serverFetch<UsersAPI.UserSettings.GetMe.Response>(
    backendUrl.users.settings(),
    { token: true }
  )

  return <AppearanceSettingsClient initialSettings={settings} />
}
