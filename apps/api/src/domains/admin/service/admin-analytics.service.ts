import {
  getAllPageViews,
  getAllVisitors,
  getPageViews,
  getPageViewsTimeseries,
  getTopPages,
  getVisitorStats,
  getVisitors,
  getVisitorsTimeseries,
} from "../../../infra/supabase/repositories/index.js";
import { getOrSet } from "../../../infra/redis/cache/index.js";
import { REDIS_CACHE_KEYS } from "../../../infra/redis/cache/keys.js";
import { REDIS_CACHE_TTL_SECONDS } from "../../../infra/redis/cache/policy.js";
import { hashFilters } from "../../../infra/redis/cache/hash.js";

export async function getOverview(days: number) {
  return await getOrSet(
    REDIS_CACHE_KEYS.admin("analytics", hashFilters({ type: "overview", days })),
    REDIS_CACHE_TTL_SECONDS.ADMIN_ANALYTICS,
    async () => {
      const [totalPageViews, totalVisitors, pageViewsTimeseries, visitorsTimeseries] = await Promise.all([
        getAllPageViews(),
        getAllVisitors(),
        getPageViewsTimeseries(days),
        getVisitorsTimeseries(days),
      ]);

      return {
        overview: {
          totalPageViews,
          totalVisitors,
        },
        timeseries: {
          pageViews: pageViewsTimeseries,
          visitors: visitorsTimeseries,
          days,
        },
      };
    },
  );
}

export async function getPageViewsForAdmin(params: { days: number; page: number; limit: number; timeseries: boolean }) {
  if (params.timeseries) {
    return await getOrSet(
      REDIS_CACHE_KEYS.admin("analytics", hashFilters({ type: "page-views-timeseries", days: params.days })),
      REDIS_CACHE_TTL_SECONDS.ADMIN_ANALYTICS,
      async () => {
        const timeseries = await getPageViewsTimeseries(params.days);
        return { timeseries, days: params.days };
      },
    );
  }

  return await getOrSet(
    REDIS_CACHE_KEYS.admin(
      "analytics",
      hashFilters({ type: "page-views", days: params.days, page: params.page, limit: params.limit }),
    ),
    REDIS_CACHE_TTL_SECONDS.ADMIN_ANALYTICS,
    async () => await getPageViews({ page: params.page, limit: params.limit }),
  );
}

export async function getVisitorsForAdmin(params: { days: number; page: number; limit: number; timeseries: boolean }) {
  if (params.timeseries) {
    return await getOrSet(
      REDIS_CACHE_KEYS.admin("analytics", hashFilters({ type: "visitors-timeseries", days: params.days })),
      REDIS_CACHE_TTL_SECONDS.ADMIN_ANALYTICS,
      async () => {
        const timeseries = await getVisitorsTimeseries(params.days);
        return { timeseries, days: params.days };
      },
    );
  }

  return await getOrSet(
    REDIS_CACHE_KEYS.admin(
      "analytics",
      hashFilters({ type: "visitors", days: params.days, page: params.page, limit: params.limit }),
    ),
    REDIS_CACHE_TTL_SECONDS.ADMIN_ANALYTICS,
    async () => await getVisitors({ page: params.page, limit: params.limit }),
  );
}

export async function getTopPagesForAdmin(limit: number) {
  return await getOrSet(
    REDIS_CACHE_KEYS.admin("analytics", hashFilters({ type: "top-pages", limit })),
    REDIS_CACHE_TTL_SECONDS.ADMIN_ANALYTICS,
    async () => {
      const topPages = await getTopPages(limit);
      return { data: topPages };
    },
  );
}

export async function getVisitorStatsForAdmin() {
  return await getOrSet(
    REDIS_CACHE_KEYS.admin("analytics", hashFilters({ type: "visitor-stats" })),
    REDIS_CACHE_TTL_SECONDS.ADMIN_ANALYTICS,
    async () => await getVisitorStats(),
  );
}

