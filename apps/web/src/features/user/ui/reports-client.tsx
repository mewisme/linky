'use client'

import { useEffect, useState } from 'react'

import { AppLayout } from '@/shared/ui/layouts/app-layout'
import { Button } from '@ws/ui/components/ui/button'
import { IconRefresh } from '@tabler/icons-react'
import type { ResourcesAPI } from '@/shared/types/resources.types'
import dynamic from 'next/dynamic'
import { getMyReports } from '@/actions/resources/reports'
import { useQuery } from "@ws/ui/internal-lib/react-query"

const ReportsDataTable = dynamic(
  () => import('@/shared/ui/data-table/reports/data-table').then(mod => ({ default: mod.ReportsDataTable })),
  { ssr: false }
)

interface ReportsClientProps {
  initialData: ResourcesAPI.Reports.GetMe.Response
}

export function ReportsClient({ initialData }: ReportsClientProps) {
  const [data, setData] = useState<ResourcesAPI.Reports.Report[]>(initialData.data)

  const { data: reports, isFetching, refetch } = useQuery({
    queryKey: ['user-reports'],
    queryFn: () => getMyReports({ limit: 50, offset: 0 }),
    initialData,
    staleTime: Infinity,
  })

  useEffect(() => {
    if (reports) {
      setData(reports.data)
    }
  }, [reports])

  return (
    <AppLayout sidebarItem="userReports">
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
