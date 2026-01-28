'use client'

import { Activity, useEffect, useState } from 'react'

import type { AdminAPI } from '@/types/admin.types'
import { AppLayout } from '@/components/layouts/app-layout'
import { VisitorChart } from '../components/visitor-chart'
import { useQuery } from '@tanstack/react-query'
import { useUserContext } from '@/components/providers/user/user-provider'

type ChartItem = {
  date: string
  visitors: number
  pageViews: number
}

export default function VisitorsPage() {
  const { state } = useUserContext()

  const [token, setToken] = useState<string | null>(null)
  const [days, setDays] = useState(90)
  const [chartData, setChartData] = useState<ChartItem[]>([])

  useEffect(() => {
    const fetchToken = async () => {
      const token = await state.getToken()
      setToken(token)
    }
    fetchToken()
  }, [state])

  const { data: analytics } = useQuery({
    queryKey: ['analytics', days],
    queryFn: () => fetch(`/api/admin/analytics?days=${days}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }).then(res => res.json() as Promise<AdminAPI.GetAnalytics.Response>).then(json => {
      const ts = json.timeseries
      if (!ts) return
      const pageViews = Array.isArray(ts.pageViews) ? ts.pageViews : []
      const visitors = Array.isArray(ts.visitors) ? ts.visitors : []
      const map = new Map<string, ChartItem>()
      pageViews.forEach(i => {
        if (!i?.day) return
        map.set(i.day, { date: i.day, pageViews: Number(i.views) || 0, visitors: 0 })
      })
      visitors.forEach(i => {
        if (!i?.day) return
        const existing = map.get(i.day)
        if (existing) {
          existing.visitors = Number(i.visitors) || 0
        } else {
          map.set(i.day, { date: i.day, visitors: Number(i.visitors) || 0, pageViews: 0 })
        }
      })
      return Array.from(map.values())
    }),
    enabled: !!token && !!days,
  })

  useEffect(() => {
    if (analytics) {
      setChartData([...analytics])
    }
  }, [analytics])

  return (
    <AppLayout label="Visitors" description="Manage visitors">
      <Activity mode={chartData ? 'visible' : 'hidden'}>
        <VisitorChart setDays={setDays} days={days} data={chartData} />
      </Activity>
    </AppLayout>
  )
}
