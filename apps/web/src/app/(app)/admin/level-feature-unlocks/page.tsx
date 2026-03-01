import { LevelFeatureUnlocksClient } from '@/features/admin/ui/level-feature-unlocks-client';
import { getAdminLevelFeatureUnlocks } from "@/features/admin/api/level-feature-unlocks";

export default async function LevelFeatureUnlocksPage() {
  const levelFeatureUnlocks = await getAdminLevelFeatureUnlocks();

  return <LevelFeatureUnlocksClient initialData={levelFeatureUnlocks} />;
}
