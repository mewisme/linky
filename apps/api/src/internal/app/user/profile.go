package user

import (
	"context"

	"linky-api/src/internal/infra/supax"
)

func GetProfileAggregate(ctx context.Context, clerkUserID string) (map[string]any, error) {
	profile, err := supax.GetUserProfileAggregate(ctx, clerkUserID)
	if err != nil {
		return nil, statusErr(500, "FAILED_FETCH_PROFILE", "failedFetchUserProfile", "Failed to fetch user profile")
	}
	if profile == nil {
		return nil, statusErr(404, "USER_NOT_IN_DB", "userNotInDatabase", "User not found in database")
	}
	return profile, nil
}
