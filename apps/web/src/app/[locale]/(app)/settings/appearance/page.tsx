import { AppearanceSettingsClient } from "@/features/user/ui/appearance-settings-client";
import { getUserSettings } from "@/features/user/api/settings";

export default async function AppearancePage() {
  const settings = await getUserSettings()

  return <AppearanceSettingsClient initialSettings={settings} />
}
