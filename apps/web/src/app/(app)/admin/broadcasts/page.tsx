import type { AdminAPI } from "@/types/admin.types";
import { BroadcastsClient } from "./broadcasts-client";
import { apiUrl } from "@/lib/api/fetch/api-url";
import { fetchData } from "@/lib/api/fetch/server-api";

async function fetchBroadcasts(): Promise<AdminAPI.Broadcasts.Get.Response> {
  const params = new URLSearchParams({ limit: "50", offset: "0" });
  return fetchData<AdminAPI.Broadcasts.Get.Response>(apiUrl.admin.broadcasts(params), {
    token: true,
  });
}

export default async function AdminBroadcastsPage() {
  const initialData = await fetchBroadcasts();
  return <BroadcastsClient initialData={initialData} />;
}
