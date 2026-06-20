"use server";

import type { AdminAPI } from "@/features/admin/types/admin.types";
import { backendUrl } from "@/lib/http/backend-url";
import { serverFetch } from "@/lib/http/server-api";
import {
  withSentryAction,
  withSentryQuery,
} from "@/lib/monitoring/with-action";
import {
  toURLSearchParams,
  type ServerActionQueryParams,
} from "@/lib/http/query-params";

export async function getAdminAIConfig(): Promise<AdminAPI.AI.Config.Response> {
  return withSentryQuery("getAdminAIConfig", async () =>
    serverFetch<AdminAPI.AI.Config.Response>(backendUrl.admin.aiConfig()),
  );
}

export async function saveAdminAIConfig(
  value: AdminAPI.AI.Settings,
): Promise<AdminAPI.AI.Config.PutResponse> {
  return withSentryAction("saveAdminAIConfig", async () =>
    serverFetch<AdminAPI.AI.Config.PutResponse>(backendUrl.admin.aiConfig(), {
      method: "PUT",
      body: JSON.stringify({ value }),
    }),
  );
}

export async function getAdminAIModels(
  params?: ServerActionQueryParams,
): Promise<AdminAPI.AI.Models.SingleResponse | AdminAPI.AI.Models.AllResponse> {
  const searchParams = toURLSearchParams(params);
  return withSentryQuery("getAdminAIModels", async () =>
    serverFetch<
      AdminAPI.AI.Models.SingleResponse | AdminAPI.AI.Models.AllResponse
    >(backendUrl.admin.aiModels(searchParams)),
  );
}
