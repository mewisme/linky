import { describe, expect, it } from "vitest";

import { safeParseJobEnvelope } from "@ws/validation";

describe("async job envelope", () => {
  it("parses report_ai_summary", () => {
    const raw = JSON.stringify({
      v: 1,
      type: "report_ai_summary",
      payload: { reportId: "r1", force: true },
    });
    const r = safeParseJobEnvelope(raw);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.type).toBe("report_ai_summary");
      if (r.data.type === "report_ai_summary") {
        expect(r.data.payload.reportId).toBe("r1");
        expect(r.data.payload.force).toBe(true);
      }
    }
  });

  it("parses user_embedding_regenerate", () => {
    const raw = JSON.stringify({
      v: 1,
      type: "user_embedding_regenerate",
      payload: { userId: "550e8400-e29b-41d4-a716-446655440000" },
    });
    const r = safeParseJobEnvelope(raw);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.type).toBe("user_embedding_regenerate");
    }
  });

  it("parses apply_call_exp", () => {
    const raw = JSON.stringify({
      v: 1,
      type: "apply_call_exp",
      payload: { userId: "550e8400-e29b-41d4-a716-446655440000", durationSeconds: 60 },
    });
    const r = safeParseJobEnvelope(raw);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.type).toBe("apply_call_exp");
    }
  });

  it("rejects invalid payloads", () => {
    const r = safeParseJobEnvelope("not-json");
    expect(r.ok).toBe(false);
  });
});
