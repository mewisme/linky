import {
  createPageView as createPageViewQuery,
  createVisitor as createVisitorQuery,
  getPageViews,
  getTopPages,
  getVisitor,
  getVisitorStats,
  incrementVisitor as incrementVisitorQuery,
} from "@/infra/supabase/repositories/index.js";

import { supabase } from "@/infra/supabase/client.js";

export async function getVisitorDetails(ip: string) {
  const visitor = await getVisitor(ip);
  if (!visitor) {
    return null;
  }

  const { data: pageViews, error: pageViewsError } = await supabase
    .from("page_views")
    .select("*")
    .eq("ip", ip)
    .order("created_at", { ascending: false })
    .limit(100);

  return {
    visitor,
    pageViews: pageViews || [],
    pageViewsError,
  };
}

export async function getPathViews(params: { page: number; limit: number; path: string }) {
  const result = await getPageViews({ page: params.page, limit: params.limit, path: params.path });

  const { data: pageViewsData, error: uniqueVisitorsError } = await supabase
    .from("page_views")
    .select("ip")
    .eq("path", params.path);

  const uniqueIPs = new Set(((pageViewsData as any) || []).map((view: any) => view.ip)).size;

  return { result, uniqueIPs, uniqueVisitorsError };
}

export async function createPageView(params: { path: string; ip: string }) {
  const success = await createPageViewQuery(params.path, params.ip);
  if (!success) {
    return { success: false };
  }

  const existingVisitor = await getVisitor(params.ip);
  if (existingVisitor) {
    await incrementVisitorQuery(params.ip);
  } else {
    await createVisitorQuery(params.ip);
  }

  return { success: true };
}

export async function deletePageViewById(id: string) {
  const { error } = await supabase.from("page_views").delete().eq("id", id);
  return { error };
}

export async function getRecentVisits(params: { page: number; limit: number; path?: string; ip?: string }) {
  const options: any = { page: params.page, limit: params.limit };
  if (params.path) {
    options.path = params.path;
  }

  const result = await getPageViews(options);

  let filteredData = result.data;
  if (params.ip) {
    filteredData = (result.data as any[]).filter((view: any) => view.ip === params.ip);
  }

  return { data: filteredData, pagination: result.pagination };
}

export async function getVisitStats() {
  const [visitorStats, topPages] = await Promise.all([getVisitorStats(), getTopPages(10)]);
  return { visitors: visitorStats, topPages };
}

