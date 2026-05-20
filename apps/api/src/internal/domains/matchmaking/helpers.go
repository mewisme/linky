package matchmaking

import (
	"context"
	"time"

	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/logger"
)

var helperLog = logger.New("matchmaking:helpers")

func (s *MemoryStore) GetUserInterests(userID string) []string {
	if userID == "" {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	row, err := supax.GetUserDetailsByUserID(ctx, userID)
	if err != nil {
		helperLog.Warn().Err(err).Str("userId", userID).Msg("GetUserInterests failed")
		return nil
	}
	if row == nil {
		return nil
	}
	out := make([]string, 0, len(row.InterestTags))
	for _, t := range row.InterestTags {
		if t != "" {
			out = append(out, t)
		}
	}
	return out
}

func (s *MemoryStore) GetUserFavorites(userID string) []string {
	if userID == "" {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	rows, err := supax.GetFavoritesWithStats(ctx, userID)
	if err != nil {
		helperLog.Warn().Err(err).Str("userId", userID).Msg("GetUserFavorites failed")
		return nil
	}
	if len(rows) == 0 {
		return nil
	}
	out := make([]string, 0, len(rows))
	for _, r := range rows {
		if r.FavoriteUserID != "" {
			out = append(out, r.FavoriteUserID)
		}
	}
	return out
}

func (s *MemoryStore) GetUserBlocks(userID string) []string {
	if userID == "" {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	ids, err := supax.GetBlockedUserIDs(ctx, userID)
	if err != nil {
		helperLog.Warn().Err(err).Str("userId", userID).Msg("GetUserBlocks failed")
		return nil
	}
	return ids
}
