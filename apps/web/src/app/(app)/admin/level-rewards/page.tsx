import { LevelRewardsClient } from './level-rewards-client';
import { getAdminLevelRewards } from "@/lib/actions/admin/level-rewards";

export default async function LevelRewardsPage() {
  const levelRewards = await getAdminLevelRewards();

  return <LevelRewardsClient initialData={levelRewards} />;
}
