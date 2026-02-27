import { CallHistoryClient } from './call-history-client'
import { getCallHistory } from '@/lib/actions/resources/call-history'

export default async function CallHistoryPage() {
  const data = await getCallHistory()

  return <CallHistoryClient initialData={data} />
}
