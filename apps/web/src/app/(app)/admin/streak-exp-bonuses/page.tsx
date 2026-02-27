import { StreakExpBonusesClient } from './streak-exp-bonuses-client';
import { getAdminStreakExpBonuses } from "@/lib/actions/admin/streak-exp-bonuses";

export default async function StreakExpBonusesPage() {
  const streakExpBonuses = await getAdminStreakExpBonuses();

  return <StreakExpBonusesClient initialData={streakExpBonuses} />;
}
