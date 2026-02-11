import type { AdminAPI } from "@/types/admin.types";
import { ReportsClient } from "./reports-client";
import { apiUrl } from "@/lib/api/fetch/api-url";
import { fetchData } from "@/lib/api/fetch/server-api";

async function fetchReports(): Promise<AdminAPI.Reports.Get.Response> {
  const params = new URLSearchParams({ limit: "50", offset: "0" });
  return fetchData<AdminAPI.Reports.Get.Response>(apiUrl.admin.reports(params), { token: true });
}

export default async function AdminReportsPage() {
  const reports = await fetchReports();

  return <ReportsClient initialData={reports} />;
}
