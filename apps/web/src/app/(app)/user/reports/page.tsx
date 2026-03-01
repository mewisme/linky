import { ReportsClient } from "@/features/user/ui/reports-client";
import { getMyReports } from '@/actions/resources/reports'

export default async function UserReportsPage() {
  const data = await getMyReports()

  return <ReportsClient initialData={data} />;
}
