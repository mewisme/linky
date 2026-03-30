import { describe, expect, it } from "vitest";

import { safeParseAiJobEnvelope } from "@ws/validation";

describe("async job envelope", () => {
  it("parses report_ai_summary", () => {
    const raw = JSON.stringify({
      v: 1,
      type: "report_ai_summary",
      payload: { reportId: "r1", force: true },
    });
    const r = safeParseAiJobEnvelope(raw);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.type).toBe("report_ai_summary");
      expect(r.data.payload.reportId).toBe("r1");
      expect(r.data.payload.force).toBe(true);
    }
  });

  it("parses user_embedding_regenerate", () => {
    const raw = JSON.stringify({
      v: 1,
      type: "user_embedding_regenerate",
      payload: { userId: "550e8400-e29b-41d4-a716-446655440000" },
    });
    const r = safeParseAiJobEnvelope(raw);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.type).toBe("user_embedding_regenerate");
    }
  });

  it("rejects invalid payloads", () => {
    const r = safeParseAiJobEnvelope("not-json");
    expect(r.ok).toBe(false);
  });
});
