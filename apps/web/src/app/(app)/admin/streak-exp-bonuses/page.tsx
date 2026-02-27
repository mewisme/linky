import type { AdminAPI } from "@/types/admin.types";
import { StreakExpBonusesClient } from "./streak-exp-bonuses-client";
import { backendUrl } from "@/lib/api/fetch/backend-url";
import { serverFetch } from "@/lib/api/fetch/server-api";

export default async function StreakExpBonusesPage() {
  const streakExpBonuses = await serverFetch<AdminAPI.StreakExpBonuses.Get.Response>(
    backendUrl.admin.streakExpBonuses(),
    { token: true }
  );

  return <StreakExpBonusesClient initialData={streakExpBonuses} />;
}
