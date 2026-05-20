package sharedtypes

import (
	"encoding/json"
	"testing"
)

func TestParseAndValidate_applyCallExp_minimal(t *testing.T) {
	raw := `{"v":1,"type":"apply_call_exp","payload":{"userId":"550e8400-e29b-41d4-a716-446655440000","durationSeconds":60}}`
	_, err := ParseAndValidate([]byte(raw))
	if err != nil {
		t.Fatalf("expected valid envelope: %v", err)
	}
}

func TestParseAndValidate_applyCallExp_nullTimezoneRejected(t *testing.T) {
	raw := `{"v":1,"type":"apply_call_exp","payload":{"userId":"550e8400-e29b-41d4-a716-446655440000","durationSeconds":60,"timezone":null}}`
	_, err := ParseAndValidate([]byte(raw))
	if err == nil || err.Error() != "timezone must be string" {
		t.Fatalf("expected timezone validation error, got %v", err)
	}
}

func TestEnqueueApplyCallExpPayload_omitsEmptyOptionals(t *testing.T) {
	payload := map[string]any{
		"userId":            "550e8400-e29b-41d4-a716-446655440000",
		"durationSeconds":   60,
		"counterpartUserId": "660e8400-e29b-41d4-a716-446655440001",
	}
	envelope := map[string]any{
		"v":       1,
		"type":    JobTypeApplyCallExp,
		"payload": payload,
	}
	body, err := json.Marshal(envelope)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ParseAndValidate(body); err != nil {
		t.Fatalf("expected valid envelope without null optionals: %v", err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(body, &decoded); err != nil {
		t.Fatal(err)
	}
	inner, _ := decoded["payload"].(map[string]any)
	if _, ok := inner["timezone"]; ok {
		t.Fatal("timezone should be omitted when unset")
	}
}
