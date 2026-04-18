import { LevelRewardsClient } from '@/features/admin/ui/level-rewards-client';
import { getAdminLevelRewards } from "@/features/admin/api/level-rewards";

export default async function LevelRewardsPage() {
  const levelRewards = await getAdminLevelRewards();

  return <LevelRewardsClient initialData={levelRewards} />;
}
