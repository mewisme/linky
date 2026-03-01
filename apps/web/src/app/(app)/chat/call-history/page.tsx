import { CallHistoryClient } from "@/features/chat/ui/call-history-client";
import { getCallHistory } from '@/actions/resources/call-history'

export default async function CallHistoryPage() {
  const data = await getCallHistory()

  return <CallHistoryClient initialData={data} />
}
