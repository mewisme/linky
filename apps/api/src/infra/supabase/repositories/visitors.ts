import { createLogger } from "@repo/logger";
import { supabase } from "../client.js";

const logger = createLogger("API:Supabase:Visitors:Repository");

export async function getAllPageViews() {
  const { count: totalPageViews, error } = await supabase.from("page_views").select("*", { count: "exact", head: true });
  if (error) {
    logger.error("Error fetching total page views: %o", error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
  return totalPageViews;
}

export async function getAllVisitors() {
  const { count: totalVisitors, error } = await supabase
    .from("visitors")
    .select("*", { count: "exact", head: true });
  if (error) {
    logger.error("Error fetching total visitors: %o", error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
  return totalVisitors;
}

export async function getPageViewsTimeseries(days: number) {
  const { data, error } = await supabase.rpc('page_views_timeseries', { days: days });
  if (error) {
    logger.error("Error fetching page views timeseries: %o", error instanceof Error ? error : new Error(String(error)));
    return [];
  }
  return data;
}

export async function getVisitorsTimeseries(days: number) {
  const { data, error } = await supabase.rpc('visitors_timeseries', { days: days });
  if (error) {
    logger.error("Error fetching visitors timeseries: %o", error instanceof Error ? error : new Error(String(error)));
    return [];
  }
  return data;
}

export async function createPageView(path: string, ip: string) {
  const { error } = await supabase.from("page_views").insert({ path: path, ip: ip });
  if (error) {
    logger.error("Error creating page view: %o", error instanceof Error ? error : new Error(String(error)));
    return false;
  }
  return true;
}

export async function createVisitor(ip: string) {
  const { error } = await supabase.from("visitors").insert({ ip: ip });
  if (error) {
    logger.error("Error creating visitor: %o", error instanceof Error ? error : new Error(String(error)));
    return false;
  }
  return true;
}

export async function incrementVisitor(ip: string) {
  const { error } = await supabase.rpc('increment_visitor', { ip: ip });
  if (error) {
    logger.error("Error incrementing visitor: %o", error instanceof Error ? error : new Error(String(error)));
    return false;
  }
  return true;
}

export async function getVisitor(ip: string) {
  const { data, error } = await supabase.from("visitors").select("*").eq("ip", ip).single();
  if (error) {
    // PGRST116 is the error code when no rows are found with .single()
    // This is expected behavior when a visitor doesn't exist yet
    if (error.code === "PGRST116" || error.message.includes("JSON object requested, multiple (or no) rows returned")) {
      return null;
    }
    logger.error("Error fetching visitor: %o", error instanceof Error ? error : new Error(String(error)));
    return null;
  }
  return data;
}

export interface GetVisitorsOptions {
  page?: number;
  limit?: number;
}

export interface GetVisitorsResult {
  data: unknown[];
  count: number | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getVisitors(options: GetVisitorsOptions = {}): Promise<GetVisitorsResult> {
  const { page = 1, limit = 50 } = options;
  const maxLimit = Math.min(limit, 100);
  const offset = (page - 1) * maxLimit;

  const { data, error, count } = await supabase
    .from("visitors")
    .select("*", { count: "exact" })
    .order("last_visit", { ascending: false })
    .range(offset, offset + maxLimit - 1);

  if (error) {
    logger.error("Error fetching visitors: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return {
    data: data || [],
    count,
    pagination: {
      page,
      limit: maxLimit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / maxLimit),
    },
  };
}

export interface GetPageViewsOptions {
  page?: number;
  limit?: number;
  path?: string;
}

export interface GetPageViewsResult {
  data: unknown[];
  count: number | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getPageViews(options: GetPageViewsOptions = {}): Promise<GetPageViewsResult> {
  const { page = 1, limit = 50, path } = options;
  const maxLimit = Math.min(limit, 100);
  const offset = (page - 1) * maxLimit;

  let query = supabase
    .from("page_views")
    .select("*", { count: "exact" });

  if (path) {
    query = query.eq("path", path);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + maxLimit - 1);

  if (error) {
    logger.error("Error fetching page views: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return {
    data: data || [],
    count,
    pagination: {
      page,
      limit: maxLimit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / maxLimit),
    },
  };
}

export interface TopPage {
  path: string;
  views: number;
}

export async function getTopPages(limit: number = 10): Promise<TopPage[]> {
  const { data, error } = await supabase
    .from("page_views")
    .select("path");

  if (error) {
    logger.error("Error fetching top pages: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  const pathCounts: Record<string, number> = {};
  (data || []).forEach((view: any) => {
    pathCounts[view.path] = (pathCounts[view.path] || 0) + 1;
  });

  const topPages: TopPage[] = Object.entries(pathCounts)
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);

  return topPages;
}

export interface VisitorStats {
  totalVisitors: number;
  uniqueVisitors: number;
  returningVisitors: number;
  averageVisitCount: number;
  newVisitorsToday: number;
  newVisitorsThisWeek: number;
  newVisitorsThisMonth: number;
}

export async function getVisitorStats(): Promise<VisitorStats> {
  const { data: allVisitors, error } = await supabase
    .from("visitors")
    .select("*");

  if (error) {
    logger.error("Error fetching visitor stats: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  const visitors = allVisitors || [];
  const totalVisitors = visitors.length;
  const uniqueVisitors = visitors.filter((v: any) => v.visit_count === 1).length;
  const returningVisitors = visitors.filter((v: any) => v.visit_count > 1).length;
  const totalVisitCount = visitors.reduce((sum: number, v: any) => sum + (v.visit_count || 0), 0);
  const averageVisitCount = totalVisitors > 0 ? totalVisitCount / totalVisitors : 0;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const newVisitorsToday = visitors.filter((v: any) => {
    const firstVisit = new Date(v.first_visit);
    return firstVisit >= todayStart;
  }).length;

  const newVisitorsThisWeek = visitors.filter((v: any) => {
    const firstVisit = new Date(v.first_visit);
    return firstVisit >= weekStart;
  }).length;

  const newVisitorsThisMonth = visitors.filter((v: any) => {
    const firstVisit = new Date(v.first_visit);
    return firstVisit >= monthStart;
  }).length;

  return {
    totalVisitors,
    uniqueVisitors,
    returningVisitors,
    averageVisitCount: Math.round(averageVisitCount * 100) / 100,
    newVisitorsToday,
    newVisitorsThisWeek,
    newVisitorsThisMonth,
  };
}

