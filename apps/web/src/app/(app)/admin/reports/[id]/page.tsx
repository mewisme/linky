import { AdminReportDetailClient } from "@/features/admin/ui/admin-report-detail-client";
import { getAdminReport } from '@/features/admin/api/reports'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminReportDetailPage({ params }: Props) {
  const { id } = await params
  const report = await getAdminReport(id)

  return <AdminReportDetailClient report={report} />
}
