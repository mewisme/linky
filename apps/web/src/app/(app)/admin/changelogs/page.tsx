import type { AdminAPI } from "@/types/admin.types";
import { ChangelogsClient } from './changelogs-client';
import { apiUrl } from '@/lib/api/fetch/api-url';
import { fetchData } from '@/lib/api/fetch/server-api';

async function fetchChangelogs(): Promise<AdminAPI.Changelogs.Get.Response> {
  const res = await fetchData<AdminAPI.Changelogs.Get.Response>(apiUrl.admin.changelogs(), { token: true });
  return res;
}

export default async function ChangeLogsPage() {
  const changelogs = await fetchChangelogs();

  return <ChangelogsClient initialData={changelogs} />;
}