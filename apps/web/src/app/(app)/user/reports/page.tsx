import { ReportsClient } from './reports-client'
import { getMyReports } from '@/lib/actions/resources/reports'

export default async function UserReportsPage() {
  const data = await getMyReports()

  return <ReportsClient initialData={data} />;
}
