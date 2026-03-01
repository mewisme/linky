import { BroadcastsClient } from '@/features/admin/ui/broadcasts-client';
import { getBroadcasts } from "@/features/admin/api/broadcasts";

export default async function BroadcastsPage() {
  const initialData = await getBroadcasts();

  return <BroadcastsClient initialData={initialData} />;
}
