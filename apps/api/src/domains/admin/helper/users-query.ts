import type { GetUsersQuery } from "@/domains/admin/types/admin.types.js";

const ROLES = ["admin", "member", "superadmin"] as const;
type Role = (typeof ROLES)[number];

function isRole(s: unknown): s is Role {
  return typeof s === "string" && ROLES.includes(s as Role);
}

function parseBoolean(value: unknown, defaultValue: boolean): boolean {
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return defaultValue;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export function parseGetUsersQuery(query: Record<string, unknown>): GetUsersQuery {
  const getAll = parseBoolean(query.all, false);
  const page = Math.max(1, parseInt(String(query.page), 10) || DEFAULT_PAGE);
  const limit = Math.min(
    Math.max(1, parseInt(String(query.limit), 10) || DEFAULT_LIMIT),
    MAX_LIMIT
  );
  const role = isRole(query.role) ? query.role : undefined;
  const deleted = parseBoolean(query.deleted, false);
  const search = typeof query.search === "string" && query.search.trim() ? query.search.trim() : undefined;

  return { getAll, page, limit, role, deleted, search };
}
