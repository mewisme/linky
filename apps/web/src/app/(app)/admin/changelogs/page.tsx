import { ChangelogsClient } from './changelogs-client';
import { getAdminChangelogs } from "@/lib/actions/admin/changelogs";

export default async function ChangelogsPage() {
  const changelogs = await getAdminChangelogs();

  return <ChangelogsClient initialData={changelogs} />;
}
