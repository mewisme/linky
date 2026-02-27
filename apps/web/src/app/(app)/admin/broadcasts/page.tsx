import type { AdminAPI } from "@/types/admin.types";
import { BroadcastsClient } from "./broadcasts-client";
import { backendUrl } from "@/lib/api/fetch/backend-url";
import { serverFetch } from "@/lib/api/fetch/server-api";

export default async function AdminBroadcastsPage() {
  const params = new URLSearchParams({ limit: "50", offset: "0" });
  const initialData = await serverFetch<AdminAPI.Broadcasts.Get.Response>(
    backendUrl.admin.broadcasts(params),
    { token: true }
  );

  return <BroadcastsClient initialData={initialData} />;
}
