import { UserRole } from "@/types/users.types";

export function isAdmin(role?: UserRole | null) {
  return role === "admin" || role === "superadmin";
}

export function isSuperAdmin(role?: UserRole | null) {
  return role === "superadmin";
}