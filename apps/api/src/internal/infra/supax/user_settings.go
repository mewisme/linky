package supax

import (
	"context"
	"errors"
	"time"
)

type UserSettingsRow struct {
	UserID    string         `json:"user_id"`
	Settings  map[string]any `json:"settings,omitempty"`
	Theme     *string        `json:"theme"`
	Language  *string        `json:"language"`
	CreatedAt string         `json:"created_at"`
	UpdatedAt string         `json:"updated_at"`
}

func GetUserSettings(ctx context.Context, userID string) (map[string]any, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("user_settings").
		Select("*", "exact", false).
		Eq("user_id", userID).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	r, err := decodeOne[map[string]any](raw)
	if err != nil || r == nil {
		return nil, err
	}
	return *r, nil
}

func UpsertUserSettings(ctx context.Context, userID string, body map[string]any) (map[string]any, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	existing, err := GetUserSettings(ctx, userID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		body["user_id"] = userID
		raw, _, err := c.From("user_settings").
			Insert(body, false, "", "representation", "exact").
			ExecuteWithContext(ctx)
		if err != nil {
			return nil, err
		}
		r, err := decodeOne[map[string]any](raw)
		if err != nil || r == nil {
			return nil, err
		}
		return *r, nil
	}
	body["updated_at"] = time.Now().UTC().Format(time.RFC3339Nano)
	raw, _, err := c.From("user_settings").
		Update(body, "representation", "exact").
		Eq("user_id", userID).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	r, err := decodeOne[map[string]any](raw)
	if err != nil || r == nil {
		return nil, err
	}
	return *r, nil
}
