import { ChangelogsClient } from '@/features/admin/ui/changelogs-client';
import { getAdminChangelogs } from "@/features/admin/api/changelogs";

export default async function ChangelogsPage() {
  const changelogs = await getAdminChangelogs();

  return <ChangelogsClient initialData={changelogs} />;
}
