package embeddings

import (
	"context"
	"math"
	"sort"

	"linky-api/src/internal/infra/supax"
)

func CosineSimilarity(a, b []float32) float64 {
	if len(a) == 0 || len(b) == 0 {
		return 0
	}
	n := len(a)
	if len(b) < n {
		n = len(b)
	}
	var dot, na, nb float64
	for i := 0; i < n; i++ {
		fa := float64(a[i])
		fb := float64(b[i])
		dot += fa * fb
		na += fa * fa
		nb += fb * fb
	}
	if na == 0 || nb == 0 {
		return 0
	}
	cos := dot / (math.Sqrt(na) * math.Sqrt(nb))
	if cos > 1 {
		cos = 1
	} else if cos < -1 {
		cos = -1
	}
	return cos
}

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
		score := CosineSimilarity(target, vec)
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
