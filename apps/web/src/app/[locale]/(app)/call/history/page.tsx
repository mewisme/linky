import { CallHistoryClient } from "@/features/video-chat/ui/page/call-history-client";
import { getCallHistory } from "@/actions/resources/call-history";

export default async function CallHistoryPage() {
  const data = await getCallHistory();

  return <CallHistoryClient initialData={data} />;
}
