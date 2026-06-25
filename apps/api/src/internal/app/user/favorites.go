package user

import (
	"context"
	"strings"
	"time"

	"linky-api/src/internal/infra/supax"
)

type FavoriteLimitError struct {
	Current int
	Limit   int
}

func (e *FavoriteLimitError) Error() string {
	return "daily favorite limit reached"
}

func ListFavorites(ctx context.Context, userID string) ([]supax.FavoriteWithStatsRow, error) {
	rows, err := supax.GetFavoritesWithStats(ctx, userID)
	if err != nil {
		return nil, statusErr(500, "FAILED_FETCH_FAVORITES", "failedFetchFavorites", "Failed to fetch favorites")
	}
	if rows == nil {
		rows = []supax.FavoriteWithStatsRow{}
	}
	return rows, nil
}

func CreateFavorite(ctx context.Context, userID, favoriteUserID string) (map[string]any, error) {
	if favoriteUserID == "" {
		return nil, statusErr(400, "FAVORITE_USER_ID_REQUIRED", "favoriteUserIdRequired", "favorite_user_id is required")
	}
	if favoriteUserID == userID {
		return nil, statusErr(400, "CANNOT_FAVORITE_SELF", "cannotFavoriteYourself", "Cannot favorite yourself")
	}

	limitCheck, err := supax.CheckDailyFavoriteLimitReached(ctx, userID)
	if err != nil {
		return nil, statusErr(500, "FAILED_ADD_FAVORITE", "failedAddFavorite", "Failed to add favorite")
	}
	if limitCheck.Reached {
		return nil, &FavoriteLimitError{Current: limitCheck.Current, Limit: limitCheck.Limit}
	}

	exists, err := supax.CheckFavoriteExists(ctx, userID, favoriteUserID)
	if err != nil {
		return nil, statusErr(500, "FAILED_ADD_FAVORITE", "failedAddFavorite", "Failed to add favorite")
	}
	if exists {
		return nil, statusErr(409, "ALREADY_IN_FAVORITES", "alreadyInFavorites", "User is already in favorites")
	}

	row, err := supax.CreateFavorite(ctx, userID, favoriteUserID)
	if err != nil {
		return nil, statusErr(500, "FAILED_ADD_FAVORITE", "failedAddFavorite", "Failed to add favorite")
	}
	if err := supax.IncrementFavoriteLimit(ctx, userID); err != nil {
		return nil, statusErr(500, "FAILED_ADD_FAVORITE", "failedAddFavorite", "Failed to add favorite")
	}
	return map[string]any{"data": row}, nil
}

func DeleteFavorite(ctx context.Context, userID, target string) (refunded bool, err error) {
	if target == "" {
		return false, statusErr(400, "FAVORITE_USER_ID_REQUIRED", "favoriteUserIdRequired", "favorite_user_id is required")
	}

	exists, err := supax.CheckFavoriteExists(ctx, userID, target)
	if err != nil {
		return false, statusErr(500, "FAILED_REMOVE_FAVORITE", "failedRemoveFavorite", "Failed to remove favorite")
	}
	if !exists {
		return false, statusErr(404, "FAVORITE_NOT_FOUND", "favoriteNotFound", "Favorite not found")
	}

	createdAt, _ := supax.GetFavoriteCreationDate(ctx, userID, target)
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

	if err := supax.DeleteFavorite(ctx, userID, target); err != nil {
		return false, statusErr(500, "FAILED_REMOVE_FAVORITE", "failedRemoveFavorite", "Failed to remove favorite")
	}
	if isSameDay {
		_ = supax.DecrementFavoriteLimit(ctx, userID)
	}
	return isSameDay, nil
}
