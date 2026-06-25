package worker

import (
	"context"

	"linky-api/src/internal/app/embeddings"
)

func ExecuteUserEmbeddingRegenerate(ctx context.Context, userID string) error {
	return embeddings.RegenerateUser(ctx, userID)
}

func ExecuteUserEmbeddingRegenerateBatch(ctx context.Context, userIDs []string) error {
	return embeddings.RegenerateUserBatch(ctx, userIDs)
}
