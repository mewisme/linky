package embeddings

import (
	"context"
	"strings"

	"linky-api/src/internal/config"
	"linky-api/src/internal/infra/embeddingconfig"
	"linky-api/src/internal/infra/openaix"
	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/logger"
)

var (
	cfg *config.Config
	log = logger.New("app:embeddings")
)

func Init(c *config.Config) { cfg = c }

type userEmbedJob struct {
	UserID       string
	SemanticText string
	SingleChunk  bool
	ChunkBatches [][]string
}

func buildUserSemanticText(ctx context.Context, userID string) (string, bool, error) {
	user, err := supax.GetUserByID(ctx, userID)
	if err != nil || user == nil {
		return "", false, nil
	}
	switch v := user["deleted"].(type) {
	case bool:
		if v {
			return "", false, nil
		}
	case string:
		if v == "true" {
			return "", false, nil
		}
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
			if len(names) > 0 {
				parts = append(parts, "Interests: "+strings.Join(names, ", "))
			}
		}
	}
	text := strings.TrimSpace(strings.Join(parts, "\n"))
	if text == "" {
		return "", false, nil
	}
	return text, true, nil
}

func planUserEmbedJob(ctx context.Context, userID, semanticText string) (*userEmbedJob, error) {
	tikModel := cfg.EmbedTiktokenModel
	if tikModel == "" {
		tikModel = openaix.EmbeddingModel()
	}
	enc, err := openaix.EmbeddingTokenizer(tikModel)
	if err != nil {
		return nil, err
	}
	chunkCfg := openaix.ChunkingConfig{
		MaxChunkTokens:            cfg.EmbedMaxChunkTokens,
		ChunkOverlapTokens:        cfg.EmbedChunkOverlapTokens,
		MaxChunksPerJob:           cfg.EmbedMaxChunksPerJob,
		MaxTotalInputTokensPerJob: cfg.EmbedMaxTotalInputTokensPerJob,
	}
	chunks := openaix.PrepareChunks(semanticText, enc, chunkCfg)
	batches := openaix.PlanBatches(enc, chunks, cfg.EmbedBatchSize, cfg.EmbedMaxBatchTotalTokens)
	return &userEmbedJob{
		UserID:       userID,
		SemanticText: semanticText,
		SingleChunk:  len(chunks) == 1 && len(batches) == 1 && len(batches[0]) == 1,
		ChunkBatches: batches,
	}, nil
}

func persistUserEmbedding(ctx context.Context, userID string, semanticText string, vectors [][]float32, modelName string) error {
	mean := openaix.MeanPool(vectors)
	expectedDim := embeddingconfig.Dimension()
	if !openaix.ValidateDimension(mean, expectedDim) {
		log.Warn().Str("userId", userID).Int("dim", len(mean)).Int("expected", expectedDim).Msg("embedding dimension mismatch; refusing to persist")
		return nil
	}
	if err := supax.UpsertUserEmbedding(ctx, userID, mean, semanticText, modelName); err != nil {
		log.Error().Err(err).Str("userId", userID).Msg("Failed to persist user embedding")
		return err
	}
	log.Info().Str("userId", userID).Int("dim", len(mean)).Msg("user_embedding_regenerate done")
	return nil
}

func embedUserFromJob(ctx context.Context, job *userEmbedJob) error {
	modelName := openaix.EmbeddingModel()
	var pooled [][]float32
	for _, batch := range job.ChunkBatches {
		vectors, model, err := openaix.EmbedBatch(ctx, batch)
		if err != nil {
			return err
		}
		if model != "" {
			modelName = model
		}
		pooled = append(pooled, vectors...)
	}
	return persistUserEmbedding(ctx, job.UserID, job.SemanticText, pooled, modelName)
}

func RegenerateUser(ctx context.Context, userID string) error {
	if userID == "" || cfg == nil {
		return nil
	}
	semanticText, ok, err := buildUserSemanticText(ctx, userID)
	if err != nil {
		return err
	}
	if !ok {
		log.Warn().Str("userId", userID).Msg("user not found for embedding")
		return nil
	}
	job, err := planUserEmbedJob(ctx, userID, semanticText)
	if err != nil {
		log.Error().Err(err).Str("userId", userID).Msg("embedding tokenizer init failed")
		return err
	}
	if err := embedUserFromJob(ctx, job); err != nil {
		log.Error().Err(err).Str("userId", userID).Msg("OpenAI embed batch failed")
		return err
	}
	return nil
}

func RegenerateUserBatch(ctx context.Context, userIDs []string) error {
	if len(userIDs) == 0 || cfg == nil {
		return nil
	}

	var singles []*userEmbedJob
	for _, userID := range userIDs {
		if userID == "" {
			continue
		}
		semanticText, ok, err := buildUserSemanticText(ctx, userID)
		if err != nil {
			return err
		}
		if !ok {
			continue
		}
		job, err := planUserEmbedJob(ctx, userID, semanticText)
		if err != nil {
			log.Error().Err(err).Str("userId", userID).Msg("embedding tokenizer init failed")
			return err
		}
		if job.SingleChunk {
			singles = append(singles, job)
			continue
		}
		if err := embedUserFromJob(ctx, job); err != nil {
			log.Error().Err(err).Str("userId", userID).Msg("OpenAI embed batch failed")
			return err
		}
	}

	for i := 0; i < len(singles); {
		end := i + openaix.EmbedUserAPIBatchSize()
		if end > len(singles) {
			end = len(singles)
		}
		chunk := singles[i:end]
		if err := embedSingleChunkUsers(ctx, chunk); err != nil {
			return err
		}
		i = end
	}
	return nil
}

func embedSingleChunkUsers(ctx context.Context, jobs []*userEmbedJob) error {
	if len(jobs) == 0 {
		return nil
	}
	inputs := make([]string, len(jobs))
	for i, j := range jobs {
		inputs[i] = j.ChunkBatches[0][0]
	}
	vectors, modelName, err := openaix.EmbedBatch(ctx, inputs)
	if err != nil {
		return err
	}
	if len(vectors) != len(jobs) {
		log.Error().Int("jobs", len(jobs)).Int("vectors", len(vectors)).Msg("embedding batch size mismatch")
		return nil
	}
	for i, j := range jobs {
		if err := persistUserEmbedding(ctx, j.UserID, j.SemanticText, [][]float32{vectors[i]}, modelName); err != nil {
			return err
		}
	}
	return nil
}
