package matchmaking

import "testing"

func TestMutualFavoriteBeatsOneWay(t *testing.T) {
	now := int64(1_000_000)
	mutual, _ := ScorePair(ScoringInputs{
		UserAID:     "a",
		UserBID:     "b",
		JoinedAtAMs: now - 1000,
		JoinedAtBMs: now - 1000,
		NowMs:       now,
		FavoritesA:  StringSetFromSlice([]string{"b"}),
		FavoritesB:  StringSetFromSlice([]string{"a"}),
	})
	oneWay, _ := ScorePair(ScoringInputs{
		UserAID:     "c",
		UserBID:     "d",
		JoinedAtAMs: now - 1000,
		JoinedAtBMs: now - 1000,
		NowMs:       now,
		FavoritesA:  StringSetFromSlice([]string{"d"}),
		FavoritesB:  nil,
	})
	candidates := []ScoredCandidate{oneWay, mutual}
	res := PickBest(candidates)
	if res.Pair == nil {
		t.Fatalf("expected a pair")
	}
	if res.Pair.FavoriteType != FavoriteMutual {
		t.Fatalf("expected mutual to win, got %s", res.Pair.FavoriteType)
	}
}

func TestHigherInterestOverlapWinsTies(t *testing.T) {
	now := int64(2_000_000)
	more, _ := ScorePair(ScoringInputs{
		UserAID:     "a",
		UserBID:     "b",
		TagsA:       []string{"music", "art", "code"},
		TagsB:       []string{"music", "art", "code"},
		JoinedAtAMs: now - 5_000,
		JoinedAtBMs: now - 5_000,
		NowMs:       now,
	})
	less, _ := ScorePair(ScoringInputs{
		UserAID:     "c",
		UserBID:     "d",
		TagsA:       []string{"music", "sports"},
		TagsB:       []string{"music", "travel"},
		JoinedAtAMs: now - 5_000,
		JoinedAtBMs: now - 5_000,
		NowMs:       now,
	})
	candidates := []ScoredCandidate{less, more}
	res := PickBest(candidates)
	if res.Pair == nil {
		t.Fatalf("expected pair")
	}
	if res.Pair.UserAID != "a" {
		t.Fatalf("expected pair a/b with more overlap, got %s/%s common=%d", res.Pair.UserAID, res.Pair.UserBID, res.Pair.CommonInterests)
	}
}

func TestEmbeddingSimilarityBreaksRemainingTies(t *testing.T) {
	now := int64(3_000_000)
	dim := 8
	highVecA := make([]float32, dim)
	highVecB := make([]float32, dim)
	lowVecA := make([]float32, dim)
	lowVecB := make([]float32, dim)
	for i := 0; i < dim; i++ {
		highVecA[i] = 1
		highVecB[i] = 1
		lowVecA[i] = 1
		if i%2 == 0 {
			lowVecB[i] = 1
		} else {
			lowVecB[i] = -1
		}
	}
	high, _ := ScorePair(ScoringInputs{
		UserAID:     "a",
		UserBID:     "b",
		TagsA:       []string{"x"},
		TagsB:       []string{"x"},
		JoinedAtAMs: now - 1000,
		JoinedAtBMs: now - 1000,
		NowMs:       now,
		EmbeddingA:  highVecA,
		EmbeddingB:  highVecB,
	})
	low, _ := ScorePair(ScoringInputs{
		UserAID:     "c",
		UserBID:     "d",
		TagsA:       []string{"x"},
		TagsB:       []string{"x"},
		JoinedAtAMs: now - 1000,
		JoinedAtBMs: now - 1000,
		NowMs:       now,
		EmbeddingA:  lowVecA,
		EmbeddingB:  lowVecB,
	})
	res := PickBest([]ScoredCandidate{low, high})
	if res.Pair == nil {
		t.Fatalf("expected pair")
	}
	if res.Pair.UserAID != "a" {
		t.Fatalf("expected high-similarity pair a/b to win, got %s/%s", res.Pair.UserAID, res.Pair.UserBID)
	}
}

func TestBlockedPairNeverMatches(t *testing.T) {
	now := int64(4_000_000)
	_, ok := ScorePair(ScoringInputs{
		UserAID:     "a",
		UserBID:     "b",
		BlockedSetA: StringSetFromSlice([]string{"b"}),
		NowMs:       now,
	})
	if ok {
		t.Fatalf("blocked pair must not score")
	}
	_, ok = ScorePair(ScoringInputs{
		UserAID:     "a",
		UserBID:     "b",
		BlockedSetB: StringSetFromSlice([]string{"a"}),
		NowMs:       now,
	})
	if ok {
		t.Fatalf("blocked pair (reverse) must not score")
	}
}

func TestSkipCooldownOverriddenByFallback(t *testing.T) {
	now := int64(5_000_000)
	skipped, _ := ScorePair(ScoringInputs{
		UserAID:         "a",
		UserBID:         "b",
		TagsA:           []string{"music"},
		TagsB:           []string{"music"},
		JoinedAtAMs:     now - 30_000,
		JoinedAtBMs:     now - 30_000,
		NowMs:           now,
		HasSkipCooldown: true,
	})
	res := PickBest([]ScoredCandidate{skipped})
	if res.Pair == nil {
		t.Fatalf("expected fallback pair")
	}
	if !res.Fallback {
		t.Fatalf("expected fallback flag to be true")
	}
	if res.Pair.UserAID != "a" {
		t.Fatalf("expected skipped pair to win as fallback")
	}
}

func TestNoSkipPreferredOverSkippedHigherScore(t *testing.T) {
	now := int64(6_000_000)
	skippedHigher, _ := ScorePair(ScoringInputs{
		UserAID:         "a",
		UserBID:         "b",
		TagsA:           []string{"music", "art", "code"},
		TagsB:           []string{"music", "art", "code"},
		JoinedAtAMs:     now - 30_000,
		JoinedAtBMs:     now - 30_000,
		NowMs:           now,
		HasSkipCooldown: true,
	})
	noSkipLower, _ := ScorePair(ScoringInputs{
		UserAID:     "c",
		UserBID:     "d",
		TagsA:       []string{"music"},
		TagsB:       []string{"music"},
		JoinedAtAMs: now - 1_000,
		JoinedAtBMs: now - 1_000,
		NowMs:       now,
	})
	res := PickBest([]ScoredCandidate{skippedHigher, noSkipLower})
	if res.Fallback {
		t.Fatalf("expected non-fallback pick when no-skip exists")
	}
	if res.Pair == nil || res.Pair.UserAID != "c" {
		t.Fatalf("expected no-skip lower-score pair to win, got %v", res.Pair)
	}
}
