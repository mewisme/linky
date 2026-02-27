import { BroadcastsClient } from './broadcasts-client';
import { getBroadcasts } from "@/lib/actions/admin/broadcasts";

export default async function BroadcastsPage() {
  const initialData = await getBroadcasts();

  return <BroadcastsClient initialData={initialData} />;
}
