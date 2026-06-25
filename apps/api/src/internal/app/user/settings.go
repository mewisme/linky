package user

import (
	"context"

	"linky-api/src/internal/infra/supax"
)

func GetSettings(ctx context.Context, userID string) (map[string]any, error) {
	settings, err := supax.GetUserSettings(ctx, userID)
	if err != nil {
		return nil, statusErr(500, "FAILED_FETCH_SETTINGS", "failedFetchUserSettings", "Failed to fetch user settings")
	}
	if settings == nil {
		return nil, statusErr(404, "USER_SETTINGS_NOT_FOUND", "userSettingsNotFound", "User settings not found")
	}
	return settings, nil
}

func PutSettings(ctx context.Context, userID string, body map[string]any) (map[string]any, error) {
	if body == nil {
		body = map[string]any{}
	}
	delete(body, "user_id")
	out, err := supax.UpsertUserSettings(ctx, userID, body)
	if err != nil {
		return nil, statusErr(500, "FAILED_UPDATE_SETTINGS", "failedUpdateUserSettings", "Failed to update user settings")
	}
	return out, nil
}
