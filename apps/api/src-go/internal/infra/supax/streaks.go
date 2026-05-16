package supax

import (
	"context"
	"encoding/json"
	"errors"
)

type UpsertStreakDayResult struct {
	FirstTimeValid bool `json:"first_time_valid"`
	CurrentStreak  int  `json:"current_streak"`
}

func UpsertUserStreakDay(ctx context.Context, userID, dateStr string, totalCallSeconds int) (*UpsertStreakDayResult, error) {
	if totalCallSeconds <= 0 {
		return nil, nil
	}
	if !dateRegex.MatchString(dateStr) {
		return nil, errors.New("date must be YYYY-MM-DD")
	}
	raw, err := RPC(ctx, "upsert_user_streak_day", map[string]any{
		"p_user_id":            userID,
		"p_date":               dateStr,
		"p_total_call_seconds": totalCallSeconds,
	})
	if err != nil {
		return nil, err
	}
	var arr []UpsertStreakDayResult
	if err := json.Unmarshal(raw, &arr); err == nil && len(arr) > 0 {
		v := arr[0]
		return &v, nil
	}
	var single UpsertStreakDayResult
	if err := json.Unmarshal(raw, &single); err == nil {
		return &single, nil
	}
	return nil, nil
}

type UserStreakDayRow struct {
	ID               string `json:"id"`
	UserID           string `json:"user_id"`
	Date             string `json:"date"`
	TotalCallSeconds int    `json:"total_call_seconds"`
	IsValid          bool   `json:"is_valid"`
	CreatedAt        string `json:"created_at"`
}

func GetUserStreakDays(ctx context.Context, userID string, limit, offset int) ([]UserStreakDayRow, int64, error) {
	c := Client()
	if c == nil {
		return nil, 0, errors.New("supabase: not configured")
	}
	raw, count, err := c.From("user_streak_days").
		Select("*", "exact", false).
		Eq("user_id", userID).
		Order("date", orderDesc).
		Range(offset, offset+limit-1, "").
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, 0, err
	}
	rows, err := decodeMany[UserStreakDayRow](raw)
	return rows, count, err
}

func GetUserStreakDaysByMonth(ctx context.Context, userID string, year, month int) ([]UserStreakDayRow, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	if month < 1 || month > 12 {
		return nil, errors.New("month must be between 1 and 12")
	}
	startDate := monthStart(year, month)
	endDate := monthEnd(year, month)
	raw, _, err := c.From("user_streak_days").
		Select("*", "exact", false).
		Eq("user_id", userID).
		Gte("date", startDate).
		Lte("date", endDate).
		Order("date", orderAsc).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return decodeMany[UserStreakDayRow](raw)
}
