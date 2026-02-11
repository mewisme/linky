import type { AdminAPI } from "@/types/admin.types";
import { StreakExpBonusesClient } from "./streak-exp-bonuses-client";
import { apiUrl } from "@/lib/api/fetch/api-url";
import { fetchData } from "@/lib/api/fetch/server-api";

async function fetchStreakExpBonuses(): Promise<AdminAPI.StreakExpBonuses.Get.Response> {
  return fetchData<AdminAPI.StreakExpBonuses.Get.Response>(apiUrl.admin.streakExpBonuses(), { token: true });
}

export default async function StreakExpBonusesPage() {
  const streakExpBonuses = await fetchStreakExpBonuses();

  return <StreakExpBonusesClient initialData={streakExpBonuses} />;
}
