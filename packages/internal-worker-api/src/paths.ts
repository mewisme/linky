export const INTERNAL_WORKER_V1_PREFIX = "/internal/worker/v1" as const;

export const INTERNAL_WORKER_AI_JOBS_PATH = `${INTERNAL_WORKER_V1_PREFIX}/ai-jobs` as const;

export const INTERNAL_WORKER_GENERAL_JOBS_PATH = `${INTERNAL_WORKER_V1_PREFIX}/general-jobs` as const;

export type InternalWorkerJobRoute = "ai-jobs" | "general-jobs";

export function internalWorkerJobUrl(baseUrl: string, route: InternalWorkerJobRoute): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  const path =
    route === "ai-jobs" ? INTERNAL_WORKER_AI_JOBS_PATH : INTERNAL_WORKER_GENERAL_JOBS_PATH;
  return `${trimmed}${path}`;
}
