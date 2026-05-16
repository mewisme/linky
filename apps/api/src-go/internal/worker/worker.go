package worker

import (
	"context"
	"strings"

	"linky-api/src-go/internal/config"
	"linky-api/src-go/internal/domains/user/userservice"
	"linky-api/src-go/internal/infra/ollamax"
	"linky-api/src-go/internal/infra/supax"
	"linky-api/src-go/internal/logger"
)

var (
	log = logger.New("worker:exec")
	cfg *config.Config
)

func Init(c *config.Config) { cfg = c }

type ApplyCallExpPayload struct {
	UserID            string `json:"userId"`
	DurationSeconds   int    `json:"durationSeconds"`
	ExpSecondsToAdd   *int   `json:"expSecondsToAdd,omitempty"`
	Timezone          string `json:"timezone,omitempty"`
	CounterpartUserID string `json:"counterpartUserId,omitempty"`
	DateForExpToday   string `json:"dateForExpToday,omitempty"`
}

func ExecuteReportAISummary(ctx context.Context, reportID string, force bool) error {
	if !force {
		existing, _ := supax.GetExistingReportAISummary(ctx, reportID)
		if existing != nil {
			log.Info().Str("reportId", reportID).Msg("report_ai_summary already exists, skipping")
			return nil
		}
	}
	report, err := supax.GetReport(ctx, reportID)
	if err != nil || report == nil {
		log.Warn().Str("reportId", reportID).Msg("report not found")
		return nil
	}
	contextRow, _ := supax.GetReportContext(ctx, reportID)

	system := "You are a moderation analyst. Read the user-submitted report and any attached context, and output a concise (3-5 sentence) summary suitable for a human moderator."
	var userParts []string
	userParts = append(userParts, "Reason: "+report.Reason)
	if report.Description != nil && *report.Description != "" {
		userParts = append(userParts, "Description: "+*report.Description)
	}
	if contextRow != nil {
		if msgs, ok := contextRow["messages"].([]any); ok && len(msgs) > 0 {
			userParts = append(userParts, "Recent messages: <attached>")
		}
		if calls, ok := contextRow["call_history"].([]any); ok && len(calls) > 0 {
			userParts = append(userParts, "Recent call history: <attached>")
		}
	}
	userMsg := strings.Join(userParts, "\n")

	summary, err := ollamax.ChatCompletion(ctx, []ollamax.ChatMessage{
		{Role: "system", Content: system},
		{Role: "user", Content: userMsg},
	})
	if err != nil {
		log.Error().Err(err).Str("reportId", reportID).Msg("Ollama chat completion failed")
		return err
	}
	modelName := ""
	if cfg != nil {
		modelName = cfg.OllamaCloudModel
	}
	if err := supax.UpsertReportAISummary(ctx, reportID, summary, modelName); err != nil {
		log.Error().Err(err).Str("reportId", reportID).Msg("Failed to persist report AI summary")
		return err
	}
	log.Info().Str("reportId", reportID).Msg("report_ai_summary done")
	return nil
}

func ExecuteUserEmbeddingRegenerate(ctx context.Context, userID string) error {
	if userID == "" || cfg == nil {
		return nil
	}
	user, err := supax.GetUserByID(ctx, userID)
	if err != nil || user == nil {
		log.Warn().Str("userId", userID).Msg("user not found for embedding")
		return nil
	}
	details, _ := supax.GetUserDetailsByUserID(ctx, userID)
	var parts []string
	if v, ok := user["first_name"].(string); ok && v != "" {
		parts = append(parts, "Name: "+v)
	}
	if v, ok := user["last_name"].(string); ok && v != "" {
		parts = append(parts, v)
	}
	if v, ok := user["country"].(string); ok && v != "" {
		parts = append(parts, "Country: "+v)
	}
	if details != nil {
		if details.Bio != nil && *details.Bio != "" {
			parts = append(parts, "Bio: "+*details.Bio)
		}
		if details.Gender != nil && *details.Gender != "" {
			parts = append(parts, "Gender: "+*details.Gender)
		}
		if len(details.InterestTags) > 0 {
			tags, _ := supax.GetInterestTagsByIDs(ctx, details.InterestTags)
			names := make([]string, 0, len(tags))
			for _, t := range tags {
				names = append(names, t.Name)
			}
			parts = append(parts, "Interests: "+strings.Join(names, ", "))
		}
	}
	semanticText := strings.Join(parts, "\n")

	chunkCfg := ollamax.ChunkingConfig{
		MaxChunkChars:            cfg.EmbedMaxChunkChars,
		ChunkOverlapChars:        cfg.EmbedChunkOverlapChars,
		MaxChunksPerJob:          cfg.EmbedMaxChunksPerJob,
		MaxTotalInputCharsPerJob: cfg.EmbedMaxTotalInputCharsPerJob,
	}
	chunks := ollamax.PrepareChunks(semanticText, chunkCfg)
	batches := ollamax.PlanBatches(chunks, cfg.EmbedBatchSize, cfg.EmbedMaxBatchTotalChars)

	var pooled [][]float32
	modelName := cfg.OllamaEmbeddingModel
	for _, batch := range batches {
		vectors, model, err := ollamax.EmbedBatch(ctx, batch)
		if err != nil {
			log.Error().Err(err).Str("userId", userID).Msg("Ollama embed batch failed")
			return err
		}
		if model != "" {
			modelName = model
		}
		pooled = append(pooled, vectors...)
	}
	mean := ollamax.MeanPool(pooled)
	if !ollamax.ValidateDimension(mean, cfg.EmbedExpectedDimension) {
		log.Warn().Str("userId", userID).Int("dim", len(mean)).Int("expected", cfg.EmbedExpectedDimension).Msg("embedding dimension mismatch; refusing to persist")
		return nil
	}
	if err := supax.UpsertUserEmbedding(ctx, userID, mean, semanticText, modelName); err != nil {
		log.Error().Err(err).Str("userId", userID).Msg("Failed to persist user embedding")
		return err
	}
	log.Info().Str("userId", userID).Int("dim", len(mean)).Msg("user_embedding_regenerate done")
	return nil
}

func ExecuteApplyCallExp(ctx context.Context, p ApplyCallExpPayload) error {
	log.Info().Str("userId", p.UserID).Int("durationSeconds", p.DurationSeconds).Msg("apply_call_exp start")
	res, err := userservice.AddCallExp(ctx, p.UserID, p.DurationSeconds, p.ExpSecondsToAdd)
	if err != nil {
		return err
	}
	log.Info().Str("userId", p.UserID).Bool("didLevelUp", res.DidLevelUp).Int("previousLevel", res.PreviousLevel).Int("newLevel", res.NewLevel).Msg("apply_call_exp done")
	return nil
}
