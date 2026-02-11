import type { AdminAPI } from "@/types/admin.types";
import { UsersPageContent } from '../components/users';
import { apiUrl } from "@/lib/api/fetch/api-url";
import { fetchData } from "@/lib/api/fetch/server-api";

async function fetchUsers(): Promise<AdminAPI.GetUsers.Response> {
  const params = new URLSearchParams({ all: "true" });
  return fetchData<AdminAPI.GetUsers.Response>(apiUrl.admin.users(params), { token: true });
}

export default async function ListUsersPage() {
  const users = await fetchUsers();

  return <UsersPageContent initialData={users} />;
}
