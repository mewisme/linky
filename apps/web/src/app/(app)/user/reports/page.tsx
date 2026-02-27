import type { ResourcesAPI } from '@/types/resources.types'
import { ReportsClient } from './reports-client'
import { backendUrl } from '@/lib/api/fetch/backend-url'
import { serverFetch } from '@/lib/api/fetch/server-api'

export default async function UserReportsPage() {
  const params = new URLSearchParams({ limit: '50', offset: '0' })
  const data = await serverFetch<ResourcesAPI.Reports.GetMe.Response>(
    backendUrl.resources.reportsMe(params),
    { token: true }
  )

  return <ReportsClient initialData={data} />
}
