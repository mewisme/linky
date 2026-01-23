import {
  createReport,
  getReportById,
  getReports,
  getUserReports,
  updateReport,
} from "../../../infra/supabase/repositories/reports.js";
import { getReportWithContext } from "../../../infra/supabase/repositories/report-contexts.js";
import type { ReportStatus } from "../types/report-status.types.js";
import type { ReportUpdate } from "../types/report.types.js";
import { getOrSet, invalidateByPrefix } from "../../../infra/redis/cache/index.js";
import { REDIS_CACHE_KEYS } from "../../../infra/redis/cache/keys.js";
import { REDIS_CACHE_TTL_SECONDS } from "../../../infra/redis/cache/policy.js";
import { hashFilters } from "../../../infra/redis/cache/hash.js";

export async function createUserReport(params: { reporterUserId: string; reportedUserId: string; reason: string }) {
  const created = await createReport({
    reporter_user_id: params.reporterUserId,
    reported_user_id: params.reportedUserId,
    reason: params.reason,
    status: "pending",
  });
  await invalidateByPrefix(REDIS_CACHE_KEYS.adminPrefix("reports"));
  return created;
}

export async function listUserReports(params: { userId: string; limit: number; offset: number }) {
  return await getUserReports(params.userId, { limit: params.limit, offset: params.offset });
}

export async function listReports(params: {
  limit: number;
  offset: number;
  status?: ReportStatus;
  reporterUserId?: string;
  reportedUserId?: string;
}) {
  const filters = {
    limit: params.limit,
    offset: params.offset,
    status: params.status,
    reporterUserId: params.reporterUserId,
    reportedUserId: params.reportedUserId,
  };

  return await getOrSet(
    REDIS_CACHE_KEYS.admin("reports", hashFilters(filters)),
    REDIS_CACHE_TTL_SECONDS.ADMIN_LISTS,
    async () =>
      await getReports({
        limit: params.limit,
        offset: params.offset,
        status: params.status,
        reporterUserId: params.reporterUserId,
        reportedUserId: params.reportedUserId,
      }),
  );
}

export async function fetchReportById(id: string) {
  return await getReportById(id);
}

export async function fetchReportWithContext(id: string) {
  return await getReportWithContext(id);
}

export async function updateReportById(id: string, updateData: Partial<ReportUpdate>) {
  const updated = await updateReport(id, updateData as ReportUpdate);
  await invalidateByPrefix(REDIS_CACHE_KEYS.adminPrefix("reports"));
  return updated;
}

