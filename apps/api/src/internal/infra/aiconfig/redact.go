package aiconfig

import "encoding/json"

func APIKeyConfigured() bool {
	return envCfg != nil && trim(envCfg.OpenAIAPIKey) != ""
}

func RedactSettings(s Settings) Settings {
	s.APIKey = ""
	return s
}

func RedactSettingsMap(m map[string]any) map[string]any {
	if m == nil {
		return nil
	}
	out := make(map[string]any, len(m))
	for k, v := range m {
		out[k] = v
	}
	delete(out, "api_key")
	return out
}

func MergeSettingsForUpsert(incoming, _ Settings) Settings {
	out := incoming
	out.APIKey = ""
	return out
}

func SettingsMapFromRaw(raw json.RawMessage) (Settings, error) {
	if len(raw) == 0 {
		return Settings{}, nil
	}
	var s Settings
	if err := json.Unmarshal(raw, &s); err != nil {
		return Settings{}, err
	}
	s.APIKey = ""
	return s, nil
}

func EffectiveToPublicMap() map[string]any {
	e := EffectiveConfig()
	return map[string]any{
		"base_url":            e.BaseURL,
		"api_key_configured":  APIKeyConfigured(),
		"models": map[string]any{
			"chat": map[string]any{
				"broadcast":      e.ChatBroadcast,
				"report_summary": e.ChatReportSummary,
			},
			"embedding":  e.EmbeddingModel,
			"image":      e.ImageModel,
			"tts":        e.TTSModel,
			"stt":        e.STTModel,
			"web_search": e.WebSearchModel,
			"web_fetch":  e.WebFetchModel,
		},
		"timeouts": map[string]any{
			"request_ms":   e.RequestTimeoutMs,
			"embedding_ms": e.EmbeddingTimeoutMs,
		},
		"embedding": map[string]any{
			"user_api_batch_size": e.EmbedUserAPIBatchSize,
		},
	}
}

func DefaultSettingsPublicFromEnv() map[string]any {
	s := DefaultSettingsFromEnv()
	m, _ := SettingsToMap(s)
	if m == nil {
		m = map[string]any{}
	}
	m["api_key_configured"] = envCfg != nil && trim(envCfg.OpenAIAPIKey) != ""
	return m
}

func SettingsToMap(s Settings) (map[string]any, error) {
	raw, err := json.Marshal(RedactSettings(s))
	if err != nil {
		return nil, err
	}
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		return nil, err
	}
	return m, nil
}

func RedactAdminConfigRow(key string, value json.RawMessage) json.RawMessage {
	if key != AdminConfigKey || len(value) == 0 {
		return value
	}
	var m map[string]any
	if err := json.Unmarshal(value, &m); err != nil {
		return value
	}
	redacted, err := json.Marshal(RedactSettingsMap(m))
	if err != nil {
		return value
	}
	return redacted
}
