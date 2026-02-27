import { CallHistoryClient } from './call-history-client'
import type { CallHistoryResponse } from '@/types/call-history.types'
import { backendUrl } from '@/lib/api/fetch/backend-url'
import { serverFetch } from '@/lib/api/fetch/server-api'

export default async function CallHistoryPage() {
  const data = await serverFetch<CallHistoryResponse>(
    backendUrl.resources.callHistory(),
    { token: true }
  )

  return <CallHistoryClient initialData={data} />
}
