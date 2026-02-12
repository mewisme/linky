'use client'

import { useEffect, useState } from 'react'

import { AppLayout } from '@/components/layouts/app-layout'
import { Button } from '@ws/ui/components/ui/button'
import { IconRefresh } from '@tabler/icons-react'
import { ReportsDataTable } from '@/components/data-table/reports/data-table'
import type { ResourcesAPI } from '@/types/resources.types'
import { apiUrl } from '@/lib/api/fetch/api-url'
import { fetchData } from '@/lib/api/fetch/client-api'
import { useQuery } from '@tanstack/react-query'
import { useUserTokenContext } from '@/components/providers/user/user-token-provider'

export default function UserReportsPage() {
  const { token } = useUserTokenContext()
  const [data, setData] = useState<ResourcesAPI.Reports.Report[]>([])

  const { data: reports, isFetching, refetch } = useQuery({
    queryKey: ['user-reports'],
    queryFn: async () => {
      return fetchData<ResourcesAPI.Reports.GetMe.Response>(
        apiUrl.resources.reportsMe(new URLSearchParams({ limit: '50', offset: '0' })),
        { token: token ?? undefined }
      )
    },
    enabled: !!token,
  })

  useEffect(() => {
    if (reports) {
      setData(reports.data)
    }
  }, [reports])

  return (
    <AppLayout label="Reports" description="View your submitted reports">
      <ReportsDataTable
        initialData={data}
        leftColumnVisibilityContent={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <IconRefresh className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        }
      />
    </AppLayout>
  )
}
