package supax

import (
	"context"
	"errors"
)

func ListAllUserIDs(ctx context.Context) ([]string, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	type row struct {
		ID string `json:"id"`
	}
	raw, _, err := c.From("users").
		Select("id", "exact", false).
		Or("deleted.is.null,deleted.eq.false", "").
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := decodeMany[row](raw)
	if err != nil {
		return nil, err
	}
	out := make([]string, 0, len(rows))
	for _, r := range rows {
		if r.ID != "" {
			out = append(out, r.ID)
		}
	}
	return out, nil
}

func FilterNonDeletedUserIDs(ctx context.Context, userIDs []string) ([]string, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	seen := make(map[string]struct{}, len(userIDs))
	unique := make([]string, 0, len(userIDs))
	for _, id := range userIDs {
		if id == "" {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		unique = append(unique, id)
	}
	if len(unique) == 0 {
		return nil, nil
	}
	type row struct {
		ID string `json:"id"`
	}
	const chunkSize = 100
	out := make([]string, 0, len(unique))
	for start := 0; start < len(unique); start += chunkSize {
		end := start + chunkSize
		if end > len(unique) {
			end = len(unique)
		}
		chunk := unique[start:end]
		raw, _, err := c.From("users").
			Select("id", "exact", false).
			In("id", chunk).
			Or("deleted.is.null,deleted.eq.false", "").
			ExecuteWithContext(ctx)
		if err != nil {
			return nil, err
		}
		rows, err := decodeMany[row](raw)
		if err != nil {
			return nil, err
		}
		for _, r := range rows {
			if r.ID != "" {
				out = append(out, r.ID)
			}
		}
	}
	return out, nil
}
