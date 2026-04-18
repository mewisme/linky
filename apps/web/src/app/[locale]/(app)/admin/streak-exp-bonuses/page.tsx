import { StreakExpBonusesClient } from '@/features/admin/ui/streak-exp-bonuses-client';
import { getAdminStreakExpBonuses } from "@/features/admin/api/streak-exp-bonuses";

export default async function StreakExpBonusesPage() {
  const streakExpBonuses = await getAdminStreakExpBonuses();

  return <StreakExpBonusesClient initialData={streakExpBonuses} />;
}
