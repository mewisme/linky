import { ExpBonusesClient } from "@/features/admin/ui/exp-bonuses-client";
import { getAdminExpBonuses } from "@/features/admin/api/exp-bonuses";

export default async function ExpBonusesPage() {
  const expBonuses = await getAdminExpBonuses();

  return <ExpBonusesClient initialData={expBonuses} />;
}
