export const JOB_QUEUE_KEY = "linky:queue:jobs:v2" as const;

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
