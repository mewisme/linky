import { queryOptions } from "@ws/ui/internal-lib/react-query";

import type { AdminAPI } from "@/features/admin/types/admin.types";
import { fetchFromActionRoute } from "@/shared/lib/fetch-action-route";

export const ADMIN_AI_MODELS_QUERY_KEY = ["admin-ai-models"] as const;

const TEN_MINUTES_MS = 10 * 60 * 1000;

export function adminAIModelsQueryOptions() {
  return queryOptions({
    queryKey: ADMIN_AI_MODELS_QUERY_KEY,
    queryFn: () =>
      fetchFromActionRoute<AdminAPI.AI.Models.AllResponse>(
        "/api/admin/ai/models",
      ),
    staleTime: TEN_MINUTES_MS,
    refetchInterval: TEN_MINUTES_MS,
  });
}
