import { getUserById, getUsers, patchUser, updateUser } from "../../../infra/supabase/repositories/index.js";
import type { AdminUserUpdate } from "../types/admin.types.js";

export async function listUsers(params: {
  getAll: boolean;
  page: number;
  limit: number;
  role?: "admin" | "member";
  allow?: boolean;
  search?: string;
}) {
  return await getUsers({
    page: params.page,
    limit: params.limit,
    role: params.role,
    allow: params.allow,
    search: params.search,
    getAll: params.getAll,
  });
}

export async function getUser(id: string) {
  return await getUserById(id);
}

export async function updateAdminUser(id: string, userData: AdminUserUpdate) {
  return await updateUser(id, userData);
}

export async function patchAdminUser(id: string, userData: Partial<AdminUserUpdate>) {
  return await patchUser(id, userData);
}

