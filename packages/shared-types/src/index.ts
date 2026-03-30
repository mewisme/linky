export const AI_JOB_QUEUE_KEY = "linky:queue:ai:v1" as const;
export const JOBS_QUEUE_KEY = "linky:queue:jobs:v1" as const;

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

export type AiJobEnvelope = ReportAiSummaryJobEnvelope | UserEmbeddingRegenerateJobEnvelope;

export type JobsJobEnvelope = never;

export type AnyJobEnvelope = AiJobEnvelope;
