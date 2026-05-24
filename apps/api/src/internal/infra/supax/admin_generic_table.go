package supax

import (
	"context"
	"encoding/json"
	"errors"
	"time"
)

func ListGenericTable(ctx context.Context, table string, limit, offset int) ([]map[string]any, int64, error) {
	c := Client()
	if c == nil {
		return nil, 0, errors.New("supabase: not configured")
	}
	q := c.From(table).Select("*", "exact", false)
	if limit > 0 {
		q = q.Range(offset, offset+limit-1, "")
	}
	q = q.Order("created_at", orderDesc)
	raw, count, err := q.ExecuteWithContext(ctx)
	if err != nil {
		return nil, 0, err
	}
	var out []map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, 0, err
	}
	return out, count, nil
}

func InsertGeneric(ctx context.Context, table string, body map[string]any) (map[string]any, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From(table).
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

func PatchGeneric(ctx context.Context, table, id string, body map[string]any) (map[string]any, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	body["updated_at"] = time.Now().UTC().Format(time.RFC3339Nano)
	raw, _, err := c.From(table).
		Update(body, "representation", "exact").
		Eq("id", id).
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

func DeleteGeneric(ctx context.Context, table, id string) error {
	c := Client()
	if c == nil {
		return errors.New("supabase: not configured")
	}
	_, _, err := c.From(table).
		Delete("", "exact").
		Eq("id", id).
		ExecuteWithContext(ctx)
	return err
}

func GetGeneric(ctx context.Context, table, id string) (map[string]any, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From(table).
		Select("*", "exact", false).
		Eq("id", id).
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
