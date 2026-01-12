'use client'

import { useEffect, useState } from 'react'

import type { AdminAPI } from '@/types/api.types'
import { AppLayout } from '@/components/layouts/app-layout'
import { VisitorChart } from './components/visitor-chart'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'

type ChartItem = {
  date: string
  visitors: number
  pageViews: number
}

export default function VisitorsPage() {
  const { getToken } = useAuth()

  const [token, setToken] = useState<string | null>(null)
  const [days, setDays] = useState(90)
  const [chartData, setChartData] = useState<ChartItem[]>([])

  useEffect(() => {
    const fetchToken = async () => {
      const token = await getToken({ template: 'custom', skipCache: true })
      setToken(token)
    }
    fetchToken()
  }, [getToken])

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
    const mockData = [
      { date: '2026-01-01', visitors: 1, pageViews: 10 },
      { date: '2026-01-02', visitors: 2, pageViews: 20 },
      { date: '2026-01-03', visitors: 3, pageViews: 30 },
      { date: '2026-01-04', visitors: 4, pageViews: 40 },
      { date: '2026-01-05', visitors: 5, pageViews: 50 },
      { date: '2026-01-06', visitors: 6, pageViews: 40 },
      { date: '2026-01-07', visitors: 7, pageViews: 30 },
      { date: '2026-01-08', visitors: 8, pageViews: 40 },
      { date: '2026-01-09', visitors: 9, pageViews: 30 },
    ]
    if (analytics) {
      setChartData([...mockData, ...analytics])
    } else {
      setChartData(mockData)
    }
  }, [analytics])

  return (
    <AppLayout label="Visitors" description="Manage visitors">
      {chartData && <VisitorChart setDays={setDays} days={days} data={chartData} />}
    </AppLayout>
  )
}
