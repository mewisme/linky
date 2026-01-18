'use client'

import { useEffect, useState } from 'react'

import { AppLayout } from '@/components/layouts/app-layout'
import { Button } from '@re@/components/layouts/app-layout
import { IconRefresh } from '@tabl@/components/data-table/reports/data-table
import { ReportsDataTable } from '@/components/data-table/reports/data-table'
import type { ResourcesAPI } from '@/types/resources.types'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'

export default function UserReportsPage() {
  const { getToken } = useAuth()
  const [token, setToken] = useState<string | null>(null)
  const [data, setData] = useState<ResourcesAPI.Reports.Report[]>([])

  useEffect(() => {
    const fetchToken = async () => {
      const token = await getToken({ template: 'custom', skipCache: true })
      setToken(token)
    }
    fetchToken()
  }, [getToken])

  const { data: reports, isFetching, refetch } = useQuery({
    queryKey: ['user-reports'],
    queryFn: async () => {
      const res = await fetch(`/api/resources/reports/me?limit=50&offset=0`, {
        headers: { Authorization: `Bearer ${token || ''}` }
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
