import type { AdminAPI } from '@/types/admin.types'
import { AdminReportDetailClient } from './admin-report-detail-client'
import { backendUrl } from '@/lib/api/fetch/backend-url'
import { serverFetch } from '@/lib/api/fetch/server-api'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminReportDetailPage({ params }: Props) {
  const { id } = await params
  const report = await serverFetch<AdminAPI.Reports.GetById.Response>(
    backendUrl.admin.reportById(id),
    { token: true }
  )

  return <AdminReportDetailClient report={report} />
}
