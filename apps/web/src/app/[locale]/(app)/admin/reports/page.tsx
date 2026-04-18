import { ReportsClient } from '@/features/admin/ui/reports-client';
import { getAdminReports } from "@/features/admin/api/reports";

export default async function AdminReportsPage() {
  const reports = await getAdminReports();

  return <ReportsClient initialData={reports} />;
}
