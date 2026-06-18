package jobs

import (
	"encoding/json"
	"testing"

	"linky-api/src/internal/sharedtypes"
)

func TestCanonicalEnvelopeJSON(t *testing.T) {
	t.Parallel()
	body, err := CanonicalEnvelopeJSON(sharedtypes.JobTypeApplyCallExp, map[string]any{
		"userId":          "u1",
		"durationSeconds": 60,
	})
	if err != nil {
		t.Fatal(err)
	}
	var env sharedtypes.JobEnvelope
	if err := json.Unmarshal(body, &env); err != nil {
		t.Fatal(err)
	}
	if env.V != 1 || env.Type != sharedtypes.JobTypeApplyCallExp {
		t.Fatalf("unexpected envelope metadata: %+v", env)
	}
	if env.Payload.UserID != "u1" || env.Payload.DurationSeconds != 60 {
		t.Fatalf("unexpected payload: %+v", env.Payload)
	}
}

func TestCanonicalEnvelopeJSONNilPayload(t *testing.T) {
	t.Parallel()
	body, err := CanonicalEnvelopeJSON(sharedtypes.JobTypeReportAISummary, nil)
	if err != nil {
		t.Fatal(err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(body, &decoded); err != nil {
		t.Fatal(err)
	}
	payload, ok := decoded["payload"].(map[string]any)
	if !ok {
		t.Fatalf("payload = %T, want object", decoded["payload"])
	}
	if len(payload) != 0 {
		t.Fatalf("payload = %+v, want empty object", payload)
	}
}
