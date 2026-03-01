import { UsersPageContent } from '@/features/admin/ui/users';
import { getAdminUsers } from "@/features/admin/api/users";

export default async function ListUsersPage() {
  const params = new URLSearchParams({ all: "true" });
  const users = await getAdminUsers(params);

  return <UsersPageContent initialData={users} />;
}
