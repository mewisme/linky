import { z } from "zod";

export function safeParseEnvelope<T>(raw: string, schema: z.ZodType<T>): { ok: true; data: T } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const data = schema.parse(parsed);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

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

export const jobEnvelopeSchema = z.discriminatedUnion("type", [
  reportAiSummaryEnvelopeSchema,
  userEmbeddingRegenerateEnvelopeSchema,
  applyCallExpEnvelopeSchema,
]);

export type JobEnvelope = z.infer<typeof jobEnvelopeSchema>;

export function safeParseJobEnvelope(raw: string): { ok: true; data: JobEnvelope } | { ok: false; error: string } {
  return safeParseEnvelope(raw, jobEnvelopeSchema);
}
