package matchmaking

import (
	"math"
	"sort"
)

const (
	scorePerCommonInterest = 100.0
	bonusBothHaveTags      = 50.0
	fairnessBonusPerSecond = 0.1
	maxFairnessBonus       = 20.0
	embeddingWeight        = 25.0
	minSimilarityThreshold = 0.3

	favoriteMutualScore = 10000.0
	favoriteOneWayScore = 5000.0
)

type FavoriteType string

const (
	FavoriteMutual FavoriteType = "mutual"
	FavoriteOneWay FavoriteType = "one-way"
	FavoriteNone   FavoriteType = "none"
)

type ScoringInputs struct {
	UserAID      string
	UserBID      string
	TagsA        []string
	TagsB        []string
	JoinedAtAMs  int64
	JoinedAtBMs  int64
	NowMs        int64
	EmbeddingA   []float32
	EmbeddingB   []float32
	FavoritesA   map[string]struct{}
	FavoritesB   map[string]struct{}
	BlockedSetA  map[string]struct{}
	BlockedSetB  map[string]struct{}
	HasSkipCooldown bool
}

type ScoredCandidate struct {
	UserAID         string
	UserBID         string
	Score           float64
	CommonInterests int
	FavoriteType    FavoriteType
	HasSkipCooldown bool
}

func CommonInterests(tagsA, tagsB []string) int {
	if len(tagsA) == 0 || len(tagsB) == 0 {
		return 0
	}
	setA := make(map[string]struct{}, len(tagsA))
	for _, t := range tagsA {
		setA[t] = struct{}{}
	}
	count := 0
	for _, t := range tagsB {
		if _, ok := setA[t]; ok {
			count++
		}
	}
	return count
}

func FairnessBonus(nowMs, joinedAtAMs, joinedAtBMs int64) float64 {
	waitA := nowMs - joinedAtAMs
	waitB := nowMs - joinedAtBMs
	avg := float64(waitA+waitB) / 2.0
	bonus := (avg / 1000.0) * fairnessBonusPerSecond
	if bonus > maxFairnessBonus {
		return maxFairnessBonus
	}
	if bonus < 0 {
		return 0
	}
	return bonus
}

func InterestScore(common int, tagsCountA, tagsCountB int, fairness float64) float64 {
	score := float64(common) * scorePerCommonInterest
	if common > 0 && tagsCountA > 0 && tagsCountB > 0 {
		score += bonusBothHaveTags
	}
	score += fairness
	return score
}

func CosineSimilarity(a, b []float32) float64 {
	if len(a) == 0 || len(a) != len(b) {
		return 0
	}
	var dot, normA, normB float64
	for i := 0; i < len(a); i++ {
		ai := float64(a[i])
		bi := float64(b[i])
		dot += ai * bi
		normA += ai * ai
		normB += bi * bi
	}
	mag := math.Sqrt(normA) * math.Sqrt(normB)
	if mag == 0 {
		return 0
	}
	return dot / mag
}

func EmbeddingScore(a, b []float32) (float64, bool) {
	if len(a) == 0 || len(b) == 0 {
		return 0, false
	}
	sim := CosineSimilarity(a, b)
	if sim < minSimilarityThreshold {
		return 0, true
	}
	return sim * embeddingWeight, true
}

func ResolveFavoriteType(favA, favB map[string]struct{}, userAID, userBID string) FavoriteType {
	aLikesB := false
	bLikesA := false
	if favA != nil {
		_, aLikesB = favA[userBID]
	}
	if favB != nil {
		_, bLikesA = favB[userAID]
	}
	if aLikesB && bLikesA {
		return FavoriteMutual
	}
	if aLikesB || bLikesA {
		return FavoriteOneWay
	}
	return FavoriteNone
}

func IsBlocked(blockedA, blockedB map[string]struct{}, userAID, userBID string) bool {
	if blockedA != nil {
		if _, ok := blockedA[userBID]; ok {
			return true
		}
	}
	if blockedB != nil {
		if _, ok := blockedB[userAID]; ok {
			return true
		}
	}
	return false
}

func ScorePair(in ScoringInputs) (ScoredCandidate, bool) {
	if IsBlocked(in.BlockedSetA, in.BlockedSetB, in.UserAID, in.UserBID) {
		return ScoredCandidate{}, false
	}
	common := CommonInterests(in.TagsA, in.TagsB)
	fairness := FairnessBonus(in.NowMs, in.JoinedAtAMs, in.JoinedAtBMs)
	base := InterestScore(common, len(in.TagsA), len(in.TagsB), fairness)
	embScore, _ := EmbeddingScore(in.EmbeddingA, in.EmbeddingB)
	favType := ResolveFavoriteType(in.FavoritesA, in.FavoritesB, in.UserAID, in.UserBID)

	finalScore := base + embScore
	switch favType {
	case FavoriteMutual:
		finalScore += favoriteMutualScore
	case FavoriteOneWay:
		finalScore += favoriteOneWayScore
	}

	return ScoredCandidate{
		UserAID:         in.UserAID,
		UserBID:         in.UserBID,
		Score:           finalScore,
		CommonInterests: common,
		FavoriteType:    favType,
		HasSkipCooldown: in.HasSkipCooldown,
	}, true
}

var favoriteOrder = map[FavoriteType]int{
	FavoriteMutual: 3,
	FavoriteOneWay: 2,
	FavoriteNone:   1,
}

func compareCandidates(a, b ScoredCandidate) bool {
	if a.FavoriteType != b.FavoriteType {
		return favoriteOrder[a.FavoriteType] > favoriteOrder[b.FavoriteType]
	}
	if a.CommonInterests != b.CommonInterests {
		return a.CommonInterests > b.CommonInterests
	}
	return a.Score > b.Score
}

func SortCandidates(candidates []ScoredCandidate) {
	sort.SliceStable(candidates, func(i, j int) bool {
		return compareCandidates(candidates[i], candidates[j])
	})
}

type MatchPickResult struct {
	Pair     *ScoredCandidate
	Fallback bool
}

func PickBest(candidates []ScoredCandidate) MatchPickResult {
	if len(candidates) == 0 {
		return MatchPickResult{}
	}
	noSkip := make([]ScoredCandidate, 0, len(candidates))
	for _, c := range candidates {
		if !c.HasSkipCooldown {
			noSkip = append(noSkip, c)
		}
	}
	if len(noSkip) > 0 {
		SortCandidates(noSkip)
		best := noSkip[0]
		return MatchPickResult{Pair: &best, Fallback: false}
	}
	all := append([]ScoredCandidate(nil), candidates...)
	SortCandidates(all)
	best := all[0]
	return MatchPickResult{Pair: &best, Fallback: true}
}

func StringSetFromSlice(s []string) map[string]struct{} {
	if len(s) == 0 {
		return nil
	}
	out := make(map[string]struct{}, len(s))
	for _, v := range s {
		out[v] = struct{}{}
	}
	return out
}
