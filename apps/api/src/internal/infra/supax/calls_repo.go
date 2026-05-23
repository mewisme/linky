package supax

import (
	"context"
	"errors"
	"time"

	"linky-api/src/internal/infra/supax/pgclient"
)

type CallHistoryRow struct {
	ID              string  `json:"id"`
	CallerID        string  `json:"caller_id"`
	CalleeID        string  `json:"callee_id"`
	CallerCountry   *string `json:"caller_country"`
	CalleeCountry   *string `json:"callee_country"`
	StartedAt       string  `json:"started_at"`
	EndedAt         *string `json:"ended_at"`
	DurationSeconds *int    `json:"duration_seconds"`
	CreatedAt       string  `json:"created_at"`
	UpdatedAt       string  `json:"updated_at"`
}

type CreateCallHistoryParams struct {
	CallerID        string
	CalleeID        string
	CallerCountry   *string
	CalleeCountry   *string
	StartedAt       time.Time
	EndedAt         *time.Time
	DurationSeconds *int
}

func GetCallHistoryByUserID(ctx context.Context, userID string, limit, offset int) ([]CallHistoryRow, int64, error) {
	c := pgclient.Client()
	if c == nil {
		return nil, 0, errors.New("supabase: not configured")
	}
	from := offset
	to := offset + limit - 1
	raw, count, err := c.From("call_history").
		Select("*", "exact", false).
		Or("caller_id.eq."+userID+",callee_id.eq."+userID, "").
		Order("started_at", orderDesc).
		Range(from, to, "").
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, 0, err
	}
	rows, err := decodeMany[CallHistoryRow](raw)
	return rows, count, err
}

func GetCallHistoryByID(ctx context.Context, id string) (*CallHistoryRow, error) {
	c := pgclient.Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("call_history").
		Select("*", "exact", false).
		Eq("id", id).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return decodeOne[CallHistoryRow](raw)
}

func CreateCallHistory(ctx context.Context, p CreateCallHistoryParams) (*CallHistoryRow, error) {
	c := pgclient.Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	body := map[string]any{
		"caller_id":        p.CallerID,
		"callee_id":        p.CalleeID,
		"caller_country":   p.CallerCountry,
		"callee_country":   p.CalleeCountry,
		"started_at":       p.StartedAt.UTC().Format(time.RFC3339Nano),
		"ended_at":         nil,
		"duration_seconds": nil,
	}
	if p.EndedAt != nil {
		body["ended_at"] = p.EndedAt.UTC().Format(time.RFC3339Nano)
	}
	if p.DurationSeconds != nil {
		body["duration_seconds"] = *p.DurationSeconds
	}
	raw, _, err := c.From("call_history").
		Insert(body, false, "", "representation", "exact").
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return decodeOne[CallHistoryRow](raw)
}
