import type { AdminAPI } from "@/types/admin.types";
import { LevelRewardsClient } from "./level-rewards-client";
import { apiUrl } from "@/lib/api/fetch/api-url";
import { fetchData } from "@/lib/api/fetch/server-api";

async function fetchLevelRewards(): Promise<AdminAPI.LevelRewards.Get.Response> {
  return fetchData<AdminAPI.LevelRewards.Get.Response>(apiUrl.admin.levelRewards(), { token: true });
}

export default async function LevelRewardsPage() {
  const levelRewards = await fetchLevelRewards();

  return <LevelRewardsClient initialData={levelRewards} />;
}
