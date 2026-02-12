'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

import { AppLayout } from '@/components/layouts/app-layout'
import { Button } from '@ws/ui/components/ui/button'
import { IconRefresh } from '@tabler/icons-react'
import type { ResourcesAPI } from '@/types/resources.types'
import { apiUrl } from '@/lib/api/fetch/api-url'
import { fetchData } from '@/lib/api/fetch/client-api'
import { useQuery } from '@tanstack/react-query'
import { useUserTokenContext } from '@/components/providers/user/user-token-provider'

const ReportsDataTable = dynamic(
  () => import('@/components/data-table/reports/data-table').then(mod => ({ default: mod.ReportsDataTable })),
  { ssr: false }
)

interface ReportsClientProps {
  initialData: ResourcesAPI.Reports.GetMe.Response
}

export function ReportsClient({ initialData }: ReportsClientProps) {
  const { token } = useUserTokenContext()
  const [data, setData] = useState<ResourcesAPI.Reports.Report[]>(initialData.data)

  const { data: reports, isFetching, refetch } = useQuery({
    queryKey: ['user-reports'],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50', offset: '0' })
      return fetchData<ResourcesAPI.Reports.GetMe.Response>(
        apiUrl.resources.reportsMe() + '?' + params.toString(),
        { token: token ?? undefined }
      )
    },
    initialData,
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
