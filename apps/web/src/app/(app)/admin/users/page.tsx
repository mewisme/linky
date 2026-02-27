import { UsersPageContent } from '../components/users';
import { getAdminUsers } from "@/lib/actions/admin/users";

export default async function ListUsersPage() {
  const params = new URLSearchParams({ all: "true" });
  const users = await getAdminUsers(params);

  return <UsersPageContent initialData={users} />;
}
