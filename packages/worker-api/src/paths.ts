export const INTERNAL_WORKER_V1_PREFIX = "/internal/worker/v1" as const;

export const INTERNAL_WORKER_JOBS_PATH = `${INTERNAL_WORKER_V1_PREFIX}/jobs` as const;

export function internalWorkerJobUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return `${trimmed}${INTERNAL_WORKER_JOBS_PATH}`;
}
