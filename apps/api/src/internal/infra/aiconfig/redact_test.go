package aiconfig

import (
	"encoding/json"
	"testing"
)

func TestRedactSettingsMapCopiesAndRemovesAPIKey(t *testing.T) {
	t.Parallel()
	in := map[string]any{
		"api_key":  "secret",
		"base_url": "https://api.example.test",
	}
	got := RedactSettingsMap(in)
	if _, ok := got["api_key"]; ok {
		t.Fatal("api_key should be removed")
	}
	if got["base_url"] != in["base_url"] {
		t.Fatalf("base_url = %v, want %v", got["base_url"], in["base_url"])
	}
	if _, ok := in["api_key"]; !ok {
		t.Fatal("input map should not be mutated")
	}
	if RedactSettingsMap(nil) != nil {
		t.Fatal("nil map should remain nil")
	}
}

func TestSettingsMapFromRawRedactsAPIKey(t *testing.T) {
	t.Parallel()
	got, err := SettingsMapFromRaw(json.RawMessage(`{"base_url":" https://api.example.test ","api_key":"secret","models":{"embedding":"embed"}}`))
	if err != nil {
		t.Fatal(err)
	}
	if got.APIKey != "" {
		t.Fatalf("APIKey = %q, want empty", got.APIKey)
	}
	if got.BaseURL != " https://api.example.test " {
		t.Fatalf("BaseURL = %q", got.BaseURL)
	}
	if _, err := SettingsMapFromRaw(json.RawMessage(`{"base_url":`)); err == nil {
		t.Fatal("expected invalid JSON error")
	}
}

func TestRedactAdminConfigRow(t *testing.T) {
	t.Parallel()
	raw := json.RawMessage(`{"api_key":"secret","models":{"embedding":"embed"}}`)
	got := RedactAdminConfigRow(AdminConfigKey, raw)
	if string(got) == string(raw) {
		t.Fatal("expected AI config row to be redacted")
	}
	var decoded map[string]any
	if err := json.Unmarshal(got, &decoded); err != nil {
		t.Fatal(err)
	}
	if _, ok := decoded["api_key"]; ok {
		t.Fatal("api_key should be removed from row")
	}
	if unchanged := RedactAdminConfigRow("other", raw); string(unchanged) != string(raw) {
		t.Fatalf("non-AI config row changed: %s", unchanged)
	}
}
