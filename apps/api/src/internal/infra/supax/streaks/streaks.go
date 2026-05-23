package streaks

import (
	"context"
	"encoding/json"
	"errors"

	"linky-api/src/internal/infra/supax/codec"
	"linky-api/src/internal/infra/supax/pgclient"
)

type UpsertDayResult struct {
	FirstTimeValid bool `json:"first_time_valid"`
	CurrentStreak  int  `json:"current_streak"`
}

func UpsertUserDay(ctx context.Context, userID, dateStr string, totalCallSeconds int) (*UpsertDayResult, error) {
	if totalCallSeconds <= 0 {
		return nil, nil
	}
	if !codec.DateRegex.MatchString(dateStr) {
		return nil, errors.New("date must be YYYY-MM-DD")
	}
	raw, err := pgclient.RPC(ctx, "upsert_user_streak_day", map[string]any{
		"p_user_id":            userID,
		"p_date":               dateStr,
		"p_total_call_seconds": totalCallSeconds,
	})
	if err != nil {
		return nil, err
	}
	var arr []UpsertDayResult
	if err := json.Unmarshal(raw, &arr); err == nil && len(arr) > 0 {
		v := arr[0]
		return &v, nil
	}
	var single UpsertDayResult
	if err := json.Unmarshal(raw, &single); err == nil {
		return &single, nil
	}
	return nil, nil
}

type DayRow struct {
	ID               string `json:"id"`
	UserID           string `json:"user_id"`
	Date             string `json:"date"`
	TotalCallSeconds int    `json:"total_call_seconds"`
	IsValid          bool   `json:"is_valid"`
	CreatedAt        string `json:"created_at"`
}

func GetUserDays(ctx context.Context, userID string, limit, offset int) ([]DayRow, int64, error) {
	c := pgclient.Client()
	if c == nil {
		return nil, 0, errors.New("supabase: not configured")
	}
	raw, count, err := c.From("user_streak_days").
		Select("*", "exact", false).
		Eq("user_id", userID).
		Order("date", codec.OrderDesc).
		Range(offset, offset+limit-1, "").
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, 0, err
	}
	rows, err := codec.DecodeMany[DayRow](raw)
	return rows, count, err
}

func GetUserDaysByMonth(ctx context.Context, userID string, year, month int) ([]DayRow, error) {
	c := pgclient.Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	if month < 1 || month > 12 {
		return nil, errors.New("month must be between 1 and 12")
	}
	startDate := codec.MonthStart(year, month)
	endDate := codec.MonthEnd(year, month)
	raw, _, err := c.From("user_streak_days").
		Select("*", "exact", false).
		Eq("user_id", userID).
		Gte("date", startDate).
		Lte("date", endDate).
		Order("date", codec.OrderAsc).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return codec.DecodeMany[DayRow](raw)
}
