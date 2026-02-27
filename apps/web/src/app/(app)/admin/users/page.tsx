import type { AdminAPI } from "@/types/admin.types";
import { UsersPageContent } from '../components/users';
import { backendUrl } from "@/lib/api/fetch/backend-url";
import { serverFetch } from "@/lib/api/fetch/server-api";

export default async function ListUsersPage() {
  const params = new URLSearchParams({ all: "true" });
  const users = await serverFetch<AdminAPI.GetUsers.Response>(
    backendUrl.admin.users(params),
    { token: true }
  );

  return <UsersPageContent initialData={users} />;
}
