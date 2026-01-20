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

export async function getOverview(days: number) {
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
}

export async function getPageViewsForAdmin(params: { days: number; page: number; limit: number; timeseries: boolean }) {
  if (params.timeseries) {
    const timeseries = await getPageViewsTimeseries(params.days);
    return { timeseries, days: params.days };
  }

  return await getPageViews({ page: params.page, limit: params.limit });
}

export async function getVisitorsForAdmin(params: { days: number; page: number; limit: number; timeseries: boolean }) {
  if (params.timeseries) {
    const timeseries = await getVisitorsTimeseries(params.days);
    return { timeseries, days: params.days };
  }

  return await getVisitors({ page: params.page, limit: params.limit });
}

export async function getTopPagesForAdmin(limit: number) {
  const topPages = await getTopPages(limit);
  return { data: topPages };
}

export async function getVisitorStatsForAdmin() {
  return await getVisitorStats();
}

