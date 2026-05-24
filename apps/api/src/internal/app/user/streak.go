package user

import (
	"context"
	"errors"
	"time"

	"linky-api/src/internal/infra/supax"
)

var (
	ErrStreakLimitRange   = errors.New("limit must be between 1 and 100")
	ErrStreakOffsetNonNeg = errors.New("offset must be a non-negative number")
	ErrYearRequired       = errors.New("year is required")
	ErrMonthRequired      = errors.New("month is required")
	ErrMonthRange         = errors.New("month must be between 1 and 12")
)

func StreakHistory(ctx context.Context, uid string, limit, offset int) (map[string]any, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		return nil, ErrStreakLimitRange
	}
	if offset < 0 {
		return nil, ErrStreakOffsetNonNeg
	}
	rows, count, err := supax.GetUserStreakDays(ctx, uid, limit, offset)
	if err != nil {
		return nil, err
	}
	if rows == nil {
		rows = []supax.UserStreakDayRow{}
	}
	out := make([]map[string]any, 0, len(rows))
	for _, r := range rows {
		out = append(out, map[string]any{
			"id":               r.ID,
			"userId":           r.UserID,
			"date":             r.Date,
			"totalCallSeconds": r.TotalCallSeconds,
			"isValid":          r.IsValid,
			"createdAt":        r.CreatedAt,
		})
	}
	return map[string]any{"data": out, "count": count}, nil
}

func StreakCalendar(ctx context.Context, uid string, year, month int) ([]map[string]any, error) {
	if year == 0 {
		return nil, ErrYearRequired
	}
	if month == 0 {
		return nil, ErrMonthRequired
	}
	if month < 1 || month > 12 {
		return nil, ErrMonthRange
	}
	rows, err := supax.GetUserStreakDaysByMonth(ctx, uid, year, month)
	if err != nil {
		return nil, err
	}
	tz, _ := supax.GetUserTimezone(ctx, uid)
	if tz == "" {
		tz = "UTC"
	}
	loc, err := time.LoadLocation(tz)
	if err != nil {
		loc = time.UTC
	}
	todayStr := time.Now().In(loc).Format("2006-01-02")
	out := make([]map[string]any, 0, len(rows))
	for _, r := range rows {
		out = append(out, map[string]any{
			"date":             r.Date,
			"isValid":          r.IsValid,
			"totalCallSeconds": r.TotalCallSeconds,
			"isToday":          r.Date == todayStr,
		})
	}
	return out, nil
}
