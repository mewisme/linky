import type { AdminAPI } from "@/types/admin.types";
import { LevelFeatureUnlocksClient } from "./level-feature-unlocks-client";
import { apiUrl } from "@/lib/api/fetch/api-url";
import { fetchData } from "@/lib/api/fetch/server-api";

async function fetchLevelFeatureUnlocks(): Promise<AdminAPI.LevelFeatureUnlocks.Get.Response> {
  return fetchData<AdminAPI.LevelFeatureUnlocks.Get.Response>(apiUrl.admin.levelFeatureUnlocks(), { token: true });
}

export default async function LevelFeatureUnlocksPage() {
  const levelFeatureUnlocks = await fetchLevelFeatureUnlocks();

  return <LevelFeatureUnlocksClient initialData={levelFeatureUnlocks} />;
}
