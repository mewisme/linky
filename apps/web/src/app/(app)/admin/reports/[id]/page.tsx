import type { AdminAPI } from '@/types/admin.types'
import { AdminReportDetailClient } from './admin-report-detail-client'
import { getAdminReport } from '@/lib/actions/admin/reports'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminReportDetailPage({ params }: Props) {
  const { id } = await params
  const report = await getAdminReport(id)

  return <AdminReportDetailClient report={report} />
}
