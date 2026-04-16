import { z } from "zod";

export const reportAiSummaryEnvelopeSchema = z.object({
  v: z.literal(1),
  type: z.literal("report_ai_summary"),
  payload: z.object({
    reportId: z.string().min(1),
    force: z.boolean().optional(),
  }),
});

export const userEmbeddingRegenerateEnvelopeSchema = z.object({
  v: z.literal(1),
  type: z.literal("user_embedding_regenerate"),
  payload: z.object({
    userId: z.string().uuid(),
  }),
});

export const aiJobEnvelopeSchema = z.discriminatedUnion("type", [
  reportAiSummaryEnvelopeSchema,
  userEmbeddingRegenerateEnvelopeSchema,
]);

export type AiJobEnvelope = z.infer<typeof aiJobEnvelopeSchema>;

export function safeParseAiJobEnvelope(raw: string): { ok: true; data: AiJobEnvelope } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const data = aiJobEnvelopeSchema.parse(parsed);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export const applyCallExpEnvelopeSchema = z.object({
  v: z.literal(1),
  type: z.literal("apply_call_exp"),
  payload: z.object({
    userId: z.string().uuid(),
    durationSeconds: z.number().int().positive(),
    expSecondsToAdd: z.number().int().nonnegative().optional(),
    timezone: z.string().min(1).optional(),
    counterpartUserId: z.string().uuid().optional(),
    dateForExpToday: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
});

export const jobsJobEnvelopeSchema = z.discriminatedUnion("type", [applyCallExpEnvelopeSchema]);

export type JobsJobEnvelope = z.infer<typeof jobsJobEnvelopeSchema>;

export function safeParseJobsJobEnvelope(raw: string): { ok: true; data: JobsJobEnvelope } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const data = jobsJobEnvelopeSchema.parse(parsed);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
