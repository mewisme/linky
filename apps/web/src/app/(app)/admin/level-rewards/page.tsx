import type { AdminAPI } from "@/types/admin.types";
import { LevelRewardsClient } from "./level-rewards-client";
import { backendUrl } from "@/lib/api/fetch/backend-url";
import { serverFetch } from "@/lib/api/fetch/server-api";

export default async function LevelRewardsPage() {
  const levelRewards = await serverFetch<AdminAPI.LevelRewards.Get.Response>(
    backendUrl.admin.levelRewards(),
    { token: true }
  );

  return <LevelRewardsClient initialData={levelRewards} />;
}
