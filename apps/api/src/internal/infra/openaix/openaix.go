package openaix

import (
	"sync"

	"linky-api/src/internal/config"
	"linky-api/src/internal/infra/aiconfig"
	"linky-api/src/internal/logger"
)

var (
	cfg  *config.Config
	once sync.Once
	log  = logger.New("infra:openai")
)

func Init(c *config.Config) {
	cfg = c
	aiconfig.Init(c)
}

func Configured() bool {
	return aiconfig.Configured()
}

func LogConfigured() {
	once.Do(func() {
		if !Configured() {
			log.Warn().Msg("AI provider not fully configured (OPENAI_BASE_URL, OPENAI_API_KEY, and models required)")
			return
		}
		e := aiconfig.EffectiveConfig()
		log.Info().
			Str("base_url", e.BaseURL).
			Str("embedding_model", e.EmbeddingModel).
			Str("broadcast_model", e.ChatBroadcast).
			Str("report_summary_model", e.ChatReportSummary).
			Msg("OpenAI-compatible provider configured")
	})
}

func EmbedUserAPIBatchSize() int {
	e := aiconfig.EffectiveConfig()
	if e.EmbedUserAPIBatchSize > 0 {
		return e.EmbedUserAPIBatchSize
	}
	return 8
}
