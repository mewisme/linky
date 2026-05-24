package admin

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"linky-api/src/internal/app/embeddings"
	domainembed "linky-api/src/internal/domain/embeddings"
	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/jobs"
)

var (
	ErrUserIDsRequired = errors.New("user_ids must be a non-empty array")
	ErrUserIDRequired  = errors.New("user_id is required")
	ErrEmbeddingMissing = errors.New("embedding not found for one or both users")
)

func RegenerateEmbeddings(ctx context.Context, userIDs []string) (*AsyncJobResult, error) {
	if len(userIDs) == 0 {
		return nil, ErrUserIDsRequired
	}
	eligible, err := supax.FilterNonDeletedUserIDs(ctx, userIDs)
	if err != nil {
		return nil, err
	}
	enqueued, err := jobs.EnqueueUserEmbeddingRegenerateMany(ctx, eligible)
	if err != nil {
		return nil, err
	}
	return &AsyncJobResult{Queued: true, Enqueued: &enqueued}, nil
}

func SyncEmbeddings(ctx context.Context, userIDs []string) (*AsyncJobResult, error) {
	if len(userIDs) == 0 {
		return nil, ErrUserIDsRequired
	}
	enqueued := 0
	for _, id := range userIDs {
		if _, err := uuid.Parse(id); err != nil {
			continue
		}
		if err := jobs.EnqueueUserEmbeddingRegenerate(ctx, id); err == nil {
			enqueued++
		}
	}
	return &AsyncJobResult{Queued: true, Enqueued: &enqueued}, nil
}

func SyncAllEmbeddings(ctx context.Context) (*AsyncJobResult, error) {
	ids, err := supax.ListAllUserIDs(ctx)
	if err != nil {
		return nil, err
	}
	go func() {
		bg := context.Background()
		for _, id := range ids {
			_ = jobs.EnqueueUserEmbeddingRegenerate(bg, id)
		}
	}()
	scheduled := len(ids)
	return &AsyncJobResult{Queued: true, Scheduled: &scheduled}, nil
}

func CompareEmbeddings(ctx context.Context, userA, userB string) (map[string]any, error) {
	if userA == "" || userB == "" {
		return nil, ErrUserIDsRequired
	}
	emb, err := supax.ListUserEmbeddings(ctx, []string{userA, userB})
	if err != nil {
		return nil, err
	}
	a, ok1 := emb[userA]
	b, ok2 := emb[userB]
	if !ok1 || !ok2 {
		return nil, ErrEmbeddingMissing
	}
	score := domainembed.CosineSimilarity(a, b)
	return map[string]any{
		"user_id_a":  userA,
		"user_id_b":  userB,
		"similarity": score,
	}, nil
}

func FindSimilarEmbeddings(ctx context.Context, userID string, limit int, threshold float64) (map[string]any, error) {
	if userID == "" {
		return nil, ErrUserIDRequired
	}
	if limit <= 0 {
		limit = 25
	}
	results, err := embeddings.FindSimilar(ctx, userID, limit, threshold)
	if err != nil {
		return nil, err
	}
	return map[string]any{"results": results}, nil
}
