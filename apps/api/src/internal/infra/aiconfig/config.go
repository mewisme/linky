package aiconfig

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"time"

	"linky-api/src/internal/config"
	"linky-api/src/internal/infra/embeddingconfig"
	"linky-api/src/internal/logger"
)

const (
	AdminConfigKey  = "ai"
	refreshInterval = 30 * time.Second
	refreshTimeout  = 10 * time.Second
)

var (
	log = logger.New("infra:aiconfig")

	envCfg *config.Config

	mu       sync.RWMutex
	adminRaw json.RawMessage
	admin    Settings

	startOnce sync.Once
	reloadFn  func(context.Context) error
)

type ChatModels struct {
	Broadcast     string `json:"broadcast,omitempty"`
	ReportSummary string `json:"report_summary,omitempty"`
}

type ModelsSettings struct {
	Chat      ChatModels `json:"chat,omitempty"`
	Embedding string     `json:"embedding,omitempty"`
	Image     string     `json:"image,omitempty"`
	TTS       string     `json:"tts,omitempty"`
	STT       string     `json:"stt,omitempty"`
	WebSearch string     `json:"web_search,omitempty"`
	WebFetch  string     `json:"web_fetch,omitempty"`
}

type TimeoutsSettings struct {
	RequestMs   *int `json:"request_ms,omitempty"`
	EmbeddingMs *int `json:"embedding_ms,omitempty"`
}

type EmbeddingJobSettings struct {
	UserAPIBatchSize *int `json:"user_api_batch_size,omitempty"`
	Dimension        *int `json:"dimension,omitempty"`
}

type Settings struct {
	BaseURL   string               `json:"base_url,omitempty"`
	APIKey    string               `json:"api_key,omitempty"`
	Models    ModelsSettings       `json:"models,omitempty"`
	Timeouts  TimeoutsSettings     `json:"timeouts,omitempty"`
	Embedding EmbeddingJobSettings `json:"embedding,omitempty"`
}

type Effective struct {
	BaseURL               string
	APIKey                string
	ChatBroadcast         string
	ChatReportSummary     string
	EmbeddingModel        string
	ImageModel            string
	TTSModel              string
	STTModel              string
	WebSearchModel        string
	WebFetchModel         string
	RequestTimeoutMs      int
	EmbeddingTimeoutMs    int
	EmbedUserAPIBatchSize int
	EmbeddingDimension    int
}

func Init(c *config.Config) {
	envCfg = c
}

func SetReloadFunc(fn func(context.Context) error) {
	reloadFn = fn
}

func AdminSettings() Settings {
	mu.RLock()
	defer mu.RUnlock()
	return admin
}

func HasAdminOverlay() bool {
	mu.RLock()
	defer mu.RUnlock()
	return len(adminRaw) > 0
}

func EffectiveConfig() Effective {
	mu.RLock()
	a := admin
	mu.RUnlock()
	return mergeEffective(a)
}

func mergeEffective(a Settings) Effective {
	e := Effective{
		RequestTimeoutMs:      60000,
		EmbeddingTimeoutMs:    60000,
		EmbedUserAPIBatchSize: 8,
		EmbeddingDimension:    3072,
	}
	if envCfg != nil {
		e.BaseURL = envCfg.OpenAIBaseURL
		e.APIKey = envCfg.OpenAIAPIKey
		e.ChatBroadcast = envCfg.OpenAIBroadcastModel
		e.ChatReportSummary = envCfg.OpenAIReportSummaryModel
		e.EmbeddingModel = envCfg.OpenAIEmbeddingModel
		if envCfg.OpenAIRequestTimeoutMs > 0 {
			e.RequestTimeoutMs = envCfg.OpenAIRequestTimeoutMs
		}
		if envCfg.OpenAIEmbeddingTimeoutMs > 0 {
			e.EmbeddingTimeoutMs = envCfg.OpenAIEmbeddingTimeoutMs
		}
		if envCfg.EmbedUserAPIBatchSize > 0 {
			e.EmbedUserAPIBatchSize = envCfg.EmbedUserAPIBatchSize
		}
	}
	if v := trim(a.BaseURL); v != "" {
		e.BaseURL = v
	}
	if v := trim(a.Models.Chat.Broadcast); v != "" {
		e.ChatBroadcast = v
	}
	if v := trim(a.Models.Chat.ReportSummary); v != "" {
		e.ChatReportSummary = v
	}
	if v := trim(a.Models.Embedding); v != "" {
		e.EmbeddingModel = v
	}
	if v := trim(a.Models.Image); v != "" {
		e.ImageModel = v
	}
	if v := trim(a.Models.TTS); v != "" {
		e.TTSModel = v
	}
	if v := trim(a.Models.STT); v != "" {
		e.STTModel = v
	}
	if v := trim(a.Models.WebSearch); v != "" {
		e.WebSearchModel = v
	}
	if v := trim(a.Models.WebFetch); v != "" {
		e.WebFetchModel = v
	}
	if a.Timeouts.RequestMs != nil && *a.Timeouts.RequestMs > 0 {
		e.RequestTimeoutMs = *a.Timeouts.RequestMs
	}
	if a.Timeouts.EmbeddingMs != nil && *a.Timeouts.EmbeddingMs > 0 {
		e.EmbeddingTimeoutMs = *a.Timeouts.EmbeddingMs
	}
	if a.Embedding.UserAPIBatchSize != nil && *a.Embedding.UserAPIBatchSize > 0 {
		e.EmbedUserAPIBatchSize = clamp(*a.Embedding.UserAPIBatchSize, 5, 10)
	}
	if a.Embedding.Dimension != nil && *a.Embedding.Dimension > 0 {
		e.EmbeddingDimension = *a.Embedding.Dimension
	}
	return e
}

func Configured() bool {
	e := EffectiveConfig()
	return trim(e.BaseURL) != "" &&
		trim(e.APIKey) != "" &&
		trim(e.EmbeddingModel) != "" &&
		trim(e.ChatBroadcast) != "" &&
		trim(e.ChatReportSummary) != ""
}

func ApplySettings(raw json.RawMessage) error {
	var s Settings
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &s); err != nil {
			return err
		}
	}
	s.APIKey = ""
	if len(raw) > 0 {
		if cleaned, err := json.Marshal(s); err == nil {
			raw = cleaned
		}
	}
	mu.Lock()
	adminRaw = raw
	admin = s
	mu.Unlock()
	if err := embeddingconfig.ApplyDimension(mergeEffective(s).EmbeddingDimension); err != nil {
		return err
	}
	return nil
}

func Load(ctx context.Context) error {
	return Reload(ctx)
}

func Reload(ctx context.Context) error {
	if reloadFn == nil {
		return ApplySettings(nil)
	}
	return reloadFn(ctx)
}

func StartRefresher(ctx context.Context) {
	startOnce.Do(func() {
		go func() {
			t := time.NewTicker(refreshInterval)
			defer t.Stop()
			for {
				select {
				case <-ctx.Done():
					return
				case <-t.C:
					rctx, cancel := context.WithTimeout(context.Background(), refreshTimeout)
					if err := Reload(rctx); err != nil {
						log.Warn().Err(err).Msg("AI config refresh failed")
					}
					cancel()
				}
			}
		}()
	})
}

func NotifyConfigChanged(ctx context.Context, key string, value map[string]any) {
	if key != AdminConfigKey {
		return
	}
	raw, err := json.Marshal(value)
	if err != nil {
		log.Warn().Err(err).Msg("Failed to encode ai admin config")
		return
	}
	if err := ApplySettings(raw); err != nil {
		log.Warn().Err(err).Msg("Failed to apply ai admin config")
		return
	}
	logConfigApplied(EffectiveConfig())
	_ = ctx
}

func logConfigApplied(e Effective) {
	log.Info().
		Str("base_url", e.BaseURL).
		Str("embedding_model", e.EmbeddingModel).
		Int("embedding_dimension", e.EmbeddingDimension).
		Str("chat_broadcast_model", e.ChatBroadcast).
		Str("chat_report_summary_model", e.ChatReportSummary).
		Msg("AI config applied")
}

func SettingsFromMap(value map[string]any) (Settings, error) {
	raw, err := json.Marshal(value)
	if err != nil {
		return Settings{}, err
	}
	var s Settings
	if err := json.Unmarshal(raw, &s); err != nil {
		return Settings{}, err
	}
	s.APIKey = ""
	if s.Embedding.Dimension != nil && *s.Embedding.Dimension <= 0 {
		return Settings{}, errors.New("embedding.dimension must be positive")
	}
	if s.Embedding.Dimension != nil {
		if _, err := embeddingconfig.ColumnForDimension(*s.Embedding.Dimension); err != nil {
			return Settings{}, err
		}
	}
	return s, nil
}

func DefaultSettingsFromEnv() Settings {
	e := mergeEffective(Settings{})
	return Settings{
		BaseURL: e.BaseURL,
		Models: ModelsSettings{
			Chat: ChatModels{
				Broadcast:     e.ChatBroadcast,
				ReportSummary: e.ChatReportSummary,
			},
			Embedding: e.EmbeddingModel,
		},
		Timeouts: TimeoutsSettings{
			RequestMs:   intPtr(e.RequestTimeoutMs),
			EmbeddingMs: intPtr(e.EmbeddingTimeoutMs),
		},
		Embedding: EmbeddingJobSettings{
			UserAPIBatchSize: intPtr(e.EmbedUserAPIBatchSize),
			Dimension:        intPtr(e.EmbeddingDimension),
		},
	}
}

func intPtr(n int) *int { return &n }

func trim(s string) string {
	for len(s) > 0 && (s[0] == ' ' || s[0] == '\t' || s[0] == '\n') {
		s = s[1:]
	}
	for len(s) > 0 {
		c := s[len(s)-1]
		if c != ' ' && c != '\t' && c != '\n' {
			break
		}
		s = s[:len(s)-1]
	}
	return s
}

func clamp(n, lo, hi int) int {
	if n < lo {
		return lo
	}
	if n > hi {
		return hi
	}
	return n
}
