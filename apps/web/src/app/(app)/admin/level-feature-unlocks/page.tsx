import { LevelFeatureUnlocksClient } from './level-feature-unlocks-client';
import { getAdminLevelFeatureUnlocks } from "@/lib/actions/admin/level-feature-unlocks";

export default async function LevelFeatureUnlocksPage() {
  const levelFeatureUnlocks = await getAdminLevelFeatureUnlocks();

  return <LevelFeatureUnlocksClient initialData={levelFeatureUnlocks} />;
}
