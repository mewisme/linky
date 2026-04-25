'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ws/ui/components/ui/select'
import { useEffect, useState } from 'react'

import type { AdminAPI } from '@/features/admin/types/admin.types'
import { AppLayout } from '@/shared/ui/layouts/app-layout'
import { Button } from '@ws/ui/components/ui/button'
import { IconRefresh } from '@tabler/icons-react'
import { Input } from '@ws/ui/components/ui/input'
import { Label } from '@ws/ui/components/ui/label'
import dynamic from 'next/dynamic'
import { getAdminReports } from '@/features/admin/api/reports'
import { useQuery } from '@ws/ui/internal-lib/react-query'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

const AdminReportsDataTable = dynamic(
  () => import('@/shared/ui/data-table/admin-reports/data-table').then(mod => ({ default: mod.AdminReportsDataTable })),
)

interface ReportsClientProps {
  initialData: AdminAPI.Reports.Get.Response;
}

export function ReportsClient({ initialData }: ReportsClientProps) {
  const t = useTranslations('admin.reportsList')
  const router = useRouter()
  const [data, setData] = useState<AdminAPI.Reports.Report[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [reporterUserIdFilter, setReporterUserIdFilter] = useState<string>('')
  const [reportedUserIdFilter, setReportedUserIdFilter] = useState<string>('')

  const buildQueryParams = (): Record<string, string> => {
    const params: Record<string, string> = { limit: '50', offset: '0' }
    if (statusFilter !== 'all') params.status = statusFilter
    if (reporterUserIdFilter.trim()) params.reporter_user_id = reporterUserIdFilter.trim()
    if (reportedUserIdFilter.trim()) params.reported_user_id = reportedUserIdFilter.trim()
    return params
  }

  const { data: reports, isFetching, refetch } = useQuery({
    queryKey: ['admin-reports', statusFilter, reporterUserIdFilter, reportedUserIdFilter],
    queryFn: () => getAdminReports(buildQueryParams()),
    initialData,
    staleTime: Infinity,
  })

  useEffect(() => {
    if (reports) {
      setData(reports.data)
    }
  }, [reports])

  const handleViewReport = (report: AdminAPI.Reports.Report) => {
    router.push(`/admin/reports/${report.id}`)
  }

  return (
    <AppLayout sidebarItem="adminReports">
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg bg-card">
          <div className="flex-1 space-y-2">
            <Label htmlFor="status-filter">{t('statusFilter')}</Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AdminAPI.Reports.ReportStatus)}>
              <SelectTrigger id="status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatuses')}</SelectItem>
                <SelectItem value="pending">{t('statusPending')}</SelectItem>
                <SelectItem value="reviewed">{t('statusReviewed')}</SelectItem>
                <SelectItem value="resolved">{t('statusResolved')}</SelectItem>
                <SelectItem value="dismissed">{t('statusDismissed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="reporter-filter">{t('reporterFilter')}</Label>
            <Input
              id="reporter-filter"
              placeholder={t('reporterPlaceholder')}
              value={reporterUserIdFilter}
              onChange={(e) => setReporterUserIdFilter(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="reported-filter">{t('reportedFilter')}</Label>
            <Input
              id="reported-filter"
              placeholder={t('reportedPlaceholder')}
              value={reportedUserIdFilter}
              onChange={(e) => setReportedUserIdFilter(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        </div>
        <AdminReportsDataTable
          initialData={data}
          callbacks={{
            onView: handleViewReport
          }}
          leftColumnVisibilityContent={
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <IconRefresh className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          }
        />
      </div>
    </AppLayout>
  )
}
