'use client'

import { useEffect, useState } from 'react'

import { AppLayout } from '@/components/layouts/app-layout'
import { Button } from '@ws/ui/components/ui/button'
import { IconRefresh } from '@tabler/icons-react'
import { ReportsDataTable } from '@/components/data-table/reports/data-table'
import type { ResourcesAPI } from '@/types/resources.types'
import { useQuery } from '@tanstack/react-query'
import { useUserContext } from '@/components/providers/user/user-provider'

export default function UserReportsPage() {
  const { state } = useUserContext()
  const [token, setToken] = useState<string | null>(null)
  const [data, setData] = useState<ResourcesAPI.Reports.Report[]>([])

  useEffect(() => {
    const fetchToken = async () => {
      const token = await state.getToken()
      setToken(token)
    }
    fetchToken()
  }, [state])

  const { data: reports, isFetching, refetch } = useQuery({
    queryKey: ['user-reports'],
    queryFn: async () => {
      const res = await fetch(`/api/resources/reports/me?limit=50&offset=0`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error("Failed to load data")
      return res.json() as Promise<ResourcesAPI.Reports.GetMe.Response>
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
