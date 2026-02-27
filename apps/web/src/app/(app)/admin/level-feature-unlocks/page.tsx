import type { AdminAPI } from "@/types/admin.types";
import { LevelFeatureUnlocksClient } from "./level-feature-unlocks-client";
import { backendUrl } from "@/lib/api/fetch/backend-url";
import { serverFetch } from "@/lib/api/fetch/server-api";

export default async function LevelFeatureUnlocksPage() {
  const levelFeatureUnlocks = await serverFetch<AdminAPI.LevelFeatureUnlocks.Get.Response>(
    backendUrl.admin.levelFeatureUnlocks(),
    { token: true }
  );

  return <LevelFeatureUnlocksClient initialData={levelFeatureUnlocks} />;
}
