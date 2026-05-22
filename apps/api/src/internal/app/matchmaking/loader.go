package matchmaking

import (
	"context"
	"time"

	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/logger"
)

var loaderLog = logger.New("app:matchmaking")

func UserInterests(userID string) []string {
	if userID == "" {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	row, err := supax.GetUserDetailsByUserID(ctx, userID)
	if err != nil {
		loaderLog.Warn().Err(err).Str("userId", userID).Msg("UserInterests failed")
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

func UserFavorites(userID string) []string {
	if userID == "" {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	rows, err := supax.GetFavoritesWithStats(ctx, userID)
	if err != nil {
		loaderLog.Warn().Err(err).Str("userId", userID).Msg("UserFavorites failed")
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

func UserBlocks(userID string) []string {
	if userID == "" {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	ids, err := supax.GetBlockedUserIDs(ctx, userID)
	if err != nil {
		loaderLog.Warn().Err(err).Str("userId", userID).Msg("UserBlocks failed")
		return nil
	}
	return ids
}
