package embeddings

import (
	"context"
	"sort"

	domainembed "linky-api/src/internal/domain/embeddings"
	"linky-api/src/internal/infra/supax"
)

type SimilarUser struct {
	UserID     string  `json:"user_id"`
	Similarity float64 `json:"similarity"`
}

func FindSimilar(ctx context.Context, userID string, limit int, threshold float64) ([]SimilarUser, error) {
	if userID == "" {
		return nil, nil
	}
	all, err := supax.ListAllUserIDs(ctx)
	if err != nil {
		return nil, err
	}
	if len(all) == 0 {
		return nil, nil
	}
	emb, err := supax.ListUserEmbeddings(ctx, all)
	if err != nil {
		return nil, err
	}
	target, ok := emb[userID]
	if !ok || len(target) == 0 {
		return nil, nil
	}
	results := make([]SimilarUser, 0, len(emb))
	for id, vec := range emb {
		if id == userID {
			continue
		}
		score := domainembed.CosineSimilarity(target, vec)
		if score < threshold {
			continue
		}
		results = append(results, SimilarUser{UserID: id, Similarity: score})
	}
	sort.Slice(results, func(i, j int) bool { return results[i].Similarity > results[j].Similarity })
	if limit > 0 && len(results) > limit {
		results = results[:limit]
	}
	return results, nil
}
