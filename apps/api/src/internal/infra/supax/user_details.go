package supax

import (
	"context"
	"encoding/json"
	"errors"
	"time"
)

type UserDetailsRow struct {
	UserID         string   `json:"user_id"`
	Bio            *string  `json:"bio"`
	Gender         *string  `json:"gender"`
	DateOfBirth    *string  `json:"date_of_birth"`
	Timezone       *string  `json:"timezone"`
	InterestTags   []string `json:"interest_tags"`
	CreatedAt      string   `json:"created_at"`
	UpdatedAt      string   `json:"updated_at"`
}

func GetUserDetailsByUserID(ctx context.Context, userID string) (*UserDetailsRow, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("user_details").
		Select("*", "exact", false).
		Eq("user_id", userID).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return decodeOne[UserDetailsRow](raw)
}

func GetUserDetailsWithTags(ctx context.Context, userID string) (map[string]any, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("user_details_expanded").
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

func GetUserTimezone(ctx context.Context, userID string) (string, error) {
	row, err := GetUserDetailsByUserID(ctx, userID)
	if err != nil || row == nil || row.Timezone == nil {
		return "", err
	}
	return *row.Timezone, nil
}

type SetTimezoneOnceResult struct {
	Set        bool
	AlreadySet bool
}

func SetUserTimezoneOnce(ctx context.Context, userID, timezone string) (SetTimezoneOnceResult, error) {
	c := Client()
	if c == nil {
		return SetTimezoneOnceResult{}, errors.New("supabase: not configured")
	}
	existing, err := GetUserDetailsByUserID(ctx, userID)
	if err != nil {
		return SetTimezoneOnceResult{}, err
	}
	if existing != nil && existing.Timezone != nil && *existing.Timezone != "" {
		return SetTimezoneOnceResult{AlreadySet: true}, nil
	}
	if existing == nil {
		body := map[string]any{"user_id": userID, "timezone": timezone}
		_, _, err := c.From("user_details").
			Insert(body, false, "", "representation", "exact").
			ExecuteWithContext(ctx)
		if err != nil {
			return SetTimezoneOnceResult{}, err
		}
		return SetTimezoneOnceResult{Set: true}, nil
	}
	body := map[string]any{"timezone": timezone}
	raw, _, err := c.From("user_details").
		Update(body, "representation", "exact").
		Eq("user_id", userID).
		Is("timezone", "null").
		ExecuteWithContext(ctx)
	if err != nil {
		return SetTimezoneOnceResult{}, err
	}
	var arr []map[string]any
	_ = json.Unmarshal(raw, &arr)
	if len(arr) > 0 {
		return SetTimezoneOnceResult{Set: true}, nil
	}
	return SetTimezoneOnceResult{AlreadySet: true}, nil
}

func UpsertUserDetails(ctx context.Context, userID string, body map[string]any) (*UserDetailsRow, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	existing, err := GetUserDetailsByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		body["user_id"] = userID
		raw, _, err := c.From("user_details").
			Insert(body, false, "", "representation", "exact").
			ExecuteWithContext(ctx)
		if err != nil {
			return nil, err
		}
		return decodeOne[UserDetailsRow](raw)
	}
	body["updated_at"] = time.Now().UTC().Format(time.RFC3339Nano)
	raw, _, err := c.From("user_details").
		Update(body, "representation", "exact").
		Eq("user_id", userID).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return decodeOne[UserDetailsRow](raw)
}

func GetUserProfileAggregate(ctx context.Context, clerkUserID string) (map[string]any, error) {
	user, err := GetUserByClerkID(ctx, clerkUserID)
	if err != nil || user == nil {
		return nil, err
	}
	details, _ := GetUserDetailsWithTags(ctx, user.ID)
	settings, _ := GetUserSettings(ctx, user.ID)
	out := map[string]any{
		"user":     user,
		"details":  details,
		"settings": settings,
	}
	return out, nil
}

func GetInterestTagsByIDs(ctx context.Context, ids []string) ([]InterestTagRow, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("interest_tags").
		Select("*", "exact", false).
		In("id", ids).
		Eq("is_active", "true").
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return decodeMany[InterestTagRow](raw)
}
