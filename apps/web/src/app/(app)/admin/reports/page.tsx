import { ReportsClient } from './reports-client';
import { getAdminReports } from "@/lib/actions/admin/reports";

export default async function AdminReportsPage() {
  const reports = await getAdminReports();

  return <ReportsClient initialData={reports} />;
}
