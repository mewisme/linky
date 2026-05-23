package supax

import (
	"context"
	"errors"
	"time"

	"linky-api/src/internal/infra/supax/pgclient"
)

type userExpDailyRow struct {
	ExpSeconds int `json:"exp_seconds"`
}

func GetUserExpDaily(ctx context.Context, userID, date string) (int, error) {
	if !dateRegex.MatchString(date) {
		return 0, nil
	}
	c := pgclient.Client()
	if c == nil {
		return 0, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("user_exp_daily").
		Select("exp_seconds", "exact", false).
		Eq("user_id", userID).
		Eq("date", date).
		ExecuteWithContext(ctx)
	if err != nil {
		return 0, err
	}
	row, err := decodeOne[userExpDailyRow](raw)
	if err != nil || row == nil {
		return 0, err
	}
	return row.ExpSeconds, nil
}

type callDurationRow struct {
	EndedAt         *string `json:"ended_at"`
	DurationSeconds *int    `json:"duration_seconds"`
}

func GetCallDurationsForUserOnLocalDate(ctx context.Context, userID, localDateStr, tz string) (int, error) {
	if !dateRegex.MatchString(localDateStr) {
		return 0, nil
	}
	c := pgclient.Client()
	if c == nil {
		return 0, errors.New("supabase: not configured")
	}
	d, err := time.Parse("2006-01-02", localDateStr)
	if err != nil {
		return 0, err
	}
	startUTC := d.AddDate(0, 0, -1).UTC()
	endUTC := d.AddDate(0, 0, 2).UTC()

	loc, err := time.LoadLocation(tz)
	if err != nil {
		loc = time.UTC
	}

	raw, _, err := c.From("call_history").
		Select("ended_at, duration_seconds", "exact", false).
		Or("caller_id.eq."+userID+",callee_id.eq."+userID, "").
		Not("ended_at", "is", "null").
		Not("duration_seconds", "is", "null").
		Gte("ended_at", startUTC.Format(time.RFC3339)).
		Lt("ended_at", endUTC.Format(time.RFC3339)).
		ExecuteWithContext(ctx)
	if err != nil {
		return 0, err
	}
	rows, err := decodeMany[callDurationRow](raw)
	if err != nil {
		return 0, err
	}
	sum := 0
	for _, r := range rows {
		if r.EndedAt == nil || r.DurationSeconds == nil {
			continue
		}
		t, err := time.Parse(time.RFC3339Nano, *r.EndedAt)
		if err != nil {
			t, err = time.Parse(time.RFC3339, *r.EndedAt)
			if err != nil {
				continue
			}
		}
		if t.In(loc).Format("2006-01-02") == localDateStr {
			sum += *r.DurationSeconds
		}
	}
	return sum, nil
}
