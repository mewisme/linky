package matchmaking

import (
	"context"
	"time"

	appuser "linky-api/src/internal/app/user"
	domain "linky-api/src/internal/domain/matchmaking"
	"linky-api/src/internal/infra/expbonus"
	"linky-api/src/internal/infra/supax"
)

type LiveParticipant struct {
	Entry domain.QueueEntry
	Tags  []string
}

type MatchDetails struct {
	Pick             domain.MatchPickResult
	FavoriteRelation string
	PublicInfo       map[string]map[string]any
	Timezones        map[string]string
}

func FindMatch(ctx context.Context, store *domain.MemoryStore, live []LiveParticipant) (*MatchDetails, bool) {
	if len(live) < 2 {
		return nil, false
	}

	favorites := make(map[string]map[string]struct{}, len(live))
	blocked := make(map[string]map[string]struct{}, len(live))
	userIDs := make([]string, 0, len(live))
	for _, l := range live {
		favorites[l.Entry.UserID] = domain.StringSetFromSlice(UserFavorites(l.Entry.UserID))
		blocked[l.Entry.UserID] = domain.StringSetFromSlice(UserBlocks(l.Entry.UserID))
		userIDs = append(userIDs, l.Entry.UserID)
	}

	var embeddings map[string][]float32
	embCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	emb, err := supax.ListUserEmbeddings(embCtx, userIDs)
	cancel()
	if err == nil {
		embeddings = emb
	}

	nowMs := time.Now().UnixMilli()
	candidates := make([]domain.ScoredCandidate, 0)
	for i := 0; i < len(live); i++ {
		for j := i + 1; j < len(live); j++ {
			a := live[i]
			b := live[j]
			cand, ok := domain.ScorePair(domain.ScoringInputs{
				UserAID:         a.Entry.UserID,
				UserBID:         b.Entry.UserID,
				TagsA:           a.Tags,
				TagsB:           b.Tags,
				JoinedAtAMs:     a.Entry.JoinedAt.UnixMilli(),
				JoinedAtBMs:     b.Entry.JoinedAt.UnixMilli(),
				NowMs:           nowMs,
				EmbeddingA:      embeddings[a.Entry.UserID],
				EmbeddingB:      embeddings[b.Entry.UserID],
				FavoritesA:      favorites[a.Entry.UserID],
				FavoritesB:      favorites[b.Entry.UserID],
				BlockedSetA:     blocked[a.Entry.UserID],
				BlockedSetB:     blocked[b.Entry.UserID],
				HasSkipCooldown: store.HasSkip(a.Entry.UserID, b.Entry.UserID),
			})
			if !ok {
				continue
			}
			candidates = append(candidates, cand)
		}
	}
	if len(candidates) == 0 {
		return nil, false
	}

	pick := domain.PickBest(candidates)
	if pick.Pair == nil {
		return nil, false
	}

	pair := pick.Pair
	infoCtx, infoCancel := context.WithTimeout(ctx, 3*time.Second)
	defer infoCancel()

	peerA, myA := appuser.MatchPublicInfo(infoCtx, pair.UserBID, pair.UserAID)
	peerB, myB := appuser.MatchPublicInfo(infoCtx, pair.UserAID, pair.UserBID)
	publicInfo := map[string]map[string]any{
		pair.UserAID:         peerA,
		pair.UserBID:         peerB,
		"my:" + pair.UserAID: myA,
		"my:" + pair.UserBID: myB,
	}

	timezones := make(map[string]string)
	if tz, err := supax.GetUserTimezone(infoCtx, pair.UserAID); err == nil && tz != "" {
		timezones[pair.UserAID] = tz
	}
	if tz, err := supax.GetUserTimezone(infoCtx, pair.UserBID); err == nil && tz != "" {
		timezones[pair.UserBID] = tz
	}

	return &MatchDetails{
		Pick:             pick,
		FavoriteRelation: expbonus.RelationForCallFavorite(string(pair.FavoriteType)),
		PublicInfo:       publicInfo,
		Timezones:        timezones,
	}, true
}
