import type { ResourcesAPI } from '@/types/resources.types'
import { ReportsClient } from './reports-client'
import { apiUrl } from '@/lib/api/fetch/api-url'
import { fetchData } from '@/lib/api/fetch/server-api'

async function fetchReports(): Promise<ResourcesAPI.Reports.GetMe.Response> {
  const params = new URLSearchParams({ limit: '50', offset: '0' })
  return fetchData<ResourcesAPI.Reports.GetMe.Response>(
    apiUrl.resources.reportsMe() + '?' + params.toString(),
    { token: true }
  )
}

export default async function UserReportsPage() {
  const data = await fetchReports()
  return <ReportsClient initialData={data} />
}
