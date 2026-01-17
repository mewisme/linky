'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layouts/app-layout'
import { AdminReportsDataTable } from '@/components/data-table/admin-reports/data-table'
import type { AdminAPI } from '@/types/admin.types'
import { Button } from '@repo/ui/components/ui/button'
import { IconRefresh } from '@tabler/icons-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/components/ui/select'
import { Input } from '@repo/ui/components/ui/input'
import { Label } from '@repo/ui/components/ui/label'

export default function AdminReportsPage() {
  const { getToken } = useAuth()
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [data, setData] = useState<AdminAPI.Reports.Report[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [reporterUserIdFilter, setReporterUserIdFilter] = useState<string>('')
  const [reportedUserIdFilter, setReportedUserIdFilter] = useState<string>('')

  useEffect(() => {
    const fetchToken = async () => {
      const token = await getToken({ template: 'custom', skipCache: true })
      setToken(token)
    }
    fetchToken()
  }, [getToken])

  const buildQueryParams = () => {
    const params = new URLSearchParams()
    params.set('limit', '50')
    params.set('offset', '0')
    if (statusFilter !== 'all') {
      params.set('status', statusFilter)
    }
    if (reporterUserIdFilter.trim()) {
      params.set('reporter_user_id', reporterUserIdFilter.trim())
    }
    if (reportedUserIdFilter.trim()) {
      params.set('reported_user_id', reportedUserIdFilter.trim())
    }
    return params.toString()
  }

  const { data: reports, isFetching, refetch } = useQuery({
    queryKey: ['admin-reports', statusFilter, reporterUserIdFilter, reportedUserIdFilter],
    queryFn: async () => {
      const queryParams = buildQueryParams()
      const res = await fetch(`/api/admin/reports?${queryParams}`, {
        headers: { Authorization: `Bearer ${token || ''}` }
      })
      if (!res.ok) throw new Error("Failed to load data")
      return res.json() as Promise<AdminAPI.Reports.Get.Response>
    },
    enabled: !!token,
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
    <AppLayout label="Reports" description="Manage all reports">
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg bg-card">
          <div className="flex-1 space-y-2">
            <Label htmlFor="status-filter">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="reporter-filter">Reporter User ID</Label>
            <Input
              id="reporter-filter"
              placeholder="Filter by reporter user ID..."
              value={reporterUserIdFilter}
              onChange={(e) => setReporterUserIdFilter(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="reported-filter">Reported User ID</Label>
            <Input
              id="reported-filter"
              placeholder="Filter by reported user ID..."
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
