export const JOB_QUEUE_KEY = "linky:queue:jobs:v2" as const;
export const JOB_DLQ_KEY = "linky:queue:jobs:dlq:v1" as const;
export const JOB_PROCESSING_LIST_PREFIX = "linky:queue:jobs:processing:" as const;
export const WORKER_HEARTBEAT_PREFIX = "linky:worker:heartbeat:" as const;
export const WORKER_HEARTBEAT_TTL_SECONDS = 30;
export const WORKER_HEARTBEAT_REFRESH_MS = 10_000;
export const JOB_REAPER_INTERVAL_MS = 30_000;

export type JobDlqReason = "dropped" | "retries_exhausted" | "panic" | "stranded";

export type JobDlqEntry = {
  raw: string;
  label: string;
  reason: JobDlqReason;
  lastStatus?: number;
  errorMessage?: string;
  attempts: number;
  failedAt: string;
  workerId: string;
};

export function buildProcessingListKey(workerId: string): string {
  return `${JOB_PROCESSING_LIST_PREFIX}${workerId}`;
}

export function buildWorkerHeartbeatKey(workerId: string): string {
  return `${WORKER_HEARTBEAT_PREFIX}${workerId}`;
}

export function processingListWorkerId(processingKey: string): string | null {
  if (!processingKey.startsWith(JOB_PROCESSING_LIST_PREFIX)) {
    return null;
  }
  return processingKey.slice(JOB_PROCESSING_LIST_PREFIX.length);
}

export type ReportAiSummaryJobEnvelope = {
  v: 1;
  type: "report_ai_summary";
  payload: {
    reportId: string;
    force?: boolean;
  };
};

export type UserEmbeddingRegenerateJobEnvelope = {
  v: 1;
  type: "user_embedding_regenerate";
  payload: {
    userId: string;
  };
};

export type ApplyCallExpJobEnvelope = {
  v: 1;
  type: "apply_call_exp";
  payload: {
    userId: string;
    durationSeconds: number;
    expSecondsToAdd?: number;
    timezone?: string;
    counterpartUserId?: string;
    dateForExpToday?: string;
  };
};

export type JobEnvelope =
  | ReportAiSummaryJobEnvelope
  | UserEmbeddingRegenerateJobEnvelope
  | ApplyCallExpJobEnvelope;

export type {
  BackendI18nPayload,
  BackendUserMessage,
  UiLocale,
} from "./user-message.js";
export { isUiLocale } from "./user-message.js";
