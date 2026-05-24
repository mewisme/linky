package favorite

import (
	"context"
	"errors"
	"strings"
	"time"

	"linky-api/src/internal/infra/supax"
)

var (
	ErrSelfFavorite      = errors.New("cannot favorite yourself")
	ErrFavoriteUserIDReq = errors.New("favorite_user_id is required")
	ErrAlreadyExists     = errors.New("user is already in favorites")
	ErrNotFound          = errors.New("favorite not found")
)

type DailyLimitError struct {
	Current int
	Limit   int
}

func (e *DailyLimitError) Error() string {
	return "daily favorite limit reached"
}

func ListWithStats(ctx context.Context, uid string) (map[string]any, error) {
	rows, err := supax.GetFavoritesWithStats(ctx, uid)
	if err != nil {
		return nil, err
	}
	if rows == nil {
		rows = []supax.FavoriteWithStatsRow{}
	}
	return map[string]any{
		"data":  rows,
		"count": len(rows),
	}, nil
}

func Add(ctx context.Context, uid, favoriteUserID string) (any, error) {
	if favoriteUserID == "" {
		return nil, ErrFavoriteUserIDReq
	}
	if favoriteUserID == uid {
		return nil, ErrSelfFavorite
	}

	limitCheck, err := supax.CheckDailyFavoriteLimitReached(ctx, uid)
	if err != nil {
		return nil, err
	}
	if limitCheck.Reached {
		return nil, &DailyLimitError{Current: limitCheck.Current, Limit: limitCheck.Limit}
	}

	exists, err := supax.CheckFavoriteExists(ctx, uid, favoriteUserID)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrAlreadyExists
	}

	row, err := supax.CreateFavorite(ctx, uid, favoriteUserID)
	if err != nil {
		return nil, err
	}
	if err := supax.IncrementFavoriteLimit(ctx, uid); err != nil {
		return nil, err
	}
	return row, nil
}

func Remove(ctx context.Context, uid, favoriteUserID string) (refunded bool, err error) {
	if favoriteUserID == "" {
		return false, ErrFavoriteUserIDReq
	}

	exists, err := supax.CheckFavoriteExists(ctx, uid, favoriteUserID)
	if err != nil {
		return false, err
	}
	if !exists {
		return false, ErrNotFound
	}

	createdAt, _ := supax.GetFavoriteCreationDate(ctx, uid, favoriteUserID)
	today := time.Now().UTC().Format("2006-01-02")
	createdDate := ""
	if createdAt != "" {
		if idx := strings.Index(createdAt, "T"); idx > 0 {
			createdDate = createdAt[:idx]
		} else {
			createdDate = createdAt
		}
	}
	isSameDay := createdDate != "" && createdDate == today

	if err := supax.DeleteFavorite(ctx, uid, favoriteUserID); err != nil {
		return false, err
	}

	if isSameDay {
		_ = supax.DecrementFavoriteLimit(ctx, uid)
	}

	return isSameDay, nil
}
