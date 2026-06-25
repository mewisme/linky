package supax

import (
	"context"
	"errors"

	"linky-api/src/internal/infra/supax/codec"
)

// BroadcastHistoryRow matches the `broadcast_history` table joined with the
// creator's `users` row for the admin list view.
type BroadcastHistoryRow struct {
	ID               string  `json:"id"`
	CreatedByUserID  string  `json:"created_by_user_id"`
	Title            *string `json:"title"`
	Message          string  `json:"message"`
	CreatedAt        string  `json:"created_at"`
	CreatorFirstName *string `json:"creator_first_name"`
	CreatorLastName  *string `json:"creator_last_name"`
	CreatorEmail     *string `json:"creator_email"`
}

func ListBroadcastHistory(ctx context.Context, limit, offset int) ([]BroadcastHistoryRow, int64, error) {
	c := Client()
	if c == nil {
		return nil, 0, errors.New("supabase: not configured")
	}
	if limit <= 0 {
		limit = 50
	}
	raw, count, err := c.From("broadcast_history").
		Select("id, created_by_user_id, title, message, created_at, users:created_by_user_id(first_name, last_name, email)", "exact", false).
		Order("created_at", orderDesc).
		Range(offset, offset+limit-1, "").
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, 0, err
	}
	type joined struct {
		ID              string  `json:"id"`
		CreatedByUserID string  `json:"created_by_user_id"`
		Title           *string `json:"title"`
		Message         string  `json:"message"`
		CreatedAt       string  `json:"created_at"`
		Users           *struct {
			FirstName *string `json:"first_name"`
			LastName  *string `json:"last_name"`
			Email     *string `json:"email"`
		} `json:"users"`
	}
	rows, err := codec.DecodeMany[joined](raw)
	if err != nil {
		return nil, 0, err
	}
	out := make([]BroadcastHistoryRow, 0, len(rows))
	for _, r := range rows {
		row := BroadcastHistoryRow{
			ID:              r.ID,
			CreatedByUserID: r.CreatedByUserID,
			Title:           r.Title,
			Message:         r.Message,
			CreatedAt:       r.CreatedAt,
		}
		if r.Users != nil {
			row.CreatorFirstName = r.Users.FirstName
			row.CreatorLastName = r.Users.LastName
			row.CreatorEmail = r.Users.Email
		}
		out = append(out, row)
	}
	return out, count, nil
}

func InsertBroadcastHistory(ctx context.Context, createdByUserID, title, message string) (*BroadcastHistoryRow, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	body := map[string]any{
		"created_by_user_id": createdByUserID,
		"message":            message,
	}
	if title != "" {
		body["title"] = title
	}
	raw, _, err := c.From("broadcast_history").
		Insert(body, false, "", "representation", "exact").
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return codec.DecodeOne[BroadcastHistoryRow](raw)
}
