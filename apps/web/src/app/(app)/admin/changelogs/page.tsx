import type { AdminAPI } from "@/types/admin.types";
import { ChangelogsClient } from './changelogs-client';
import { backendUrl } from "@/lib/api/fetch/backend-url";
import { serverFetch } from "@/lib/api/fetch/server-api";

export default async function ChangeLogsPage() {
  const changelogs = await serverFetch<AdminAPI.Changelogs.Get.Response>(
    backendUrl.admin.changelogs(),
    { token: true }
  );

  return <ChangelogsClient initialData={changelogs} />;
}
