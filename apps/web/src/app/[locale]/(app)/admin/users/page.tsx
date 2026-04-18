import { UsersPageContent } from '@/features/admin/ui/users';
import { getAdminUsers } from "@/features/admin/api/users";

export default async function ListUsersPage() {
  const users = await getAdminUsers({ deleted: 'false' });

  return <UsersPageContent initialData={users} />;
}
