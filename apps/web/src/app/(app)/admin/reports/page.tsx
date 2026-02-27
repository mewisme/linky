import type { AdminAPI } from "@/types/admin.types";
import { ReportsClient } from "./reports-client";
import { backendUrl } from "@/lib/api/fetch/backend-url";
import { serverFetch } from "@/lib/api/fetch/server-api";

export default async function AdminReportsPage() {
  const params = new URLSearchParams({ limit: "50", offset: "0" });
  const reports = await serverFetch<AdminAPI.Reports.Get.Response>(
    backendUrl.admin.reports(params),
    { token: true }
  );

  return <ReportsClient initialData={reports} />;
}
