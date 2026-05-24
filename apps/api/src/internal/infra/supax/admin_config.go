package supax

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
)

type AdminConfigRow struct {
	Key   string          `json:"key"`
	Value json.RawMessage `json:"value"`
}

func GetAdminConfigValue(ctx context.Context, key string) (json.RawMessage, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("admin_config").
		Select("value", "exact", false).
		Eq("key", key).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	type row struct {
		Value json.RawMessage `json:"value"`
	}
	rows, err := decodeMany[row](raw)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, nil
	}
	return rows[0].Value, nil
}

func ListAdminConfig(ctx context.Context) ([]AdminConfigRow, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("admin_config").
		Select("*", "exact", false).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := decodeMany[AdminConfigRow](raw)
	if err != nil {
		return nil, fmt.Errorf("admin_config decode failed: %w", err)
	}
	return rows, nil
}

func UpsertAdminConfig(ctx context.Context, key string, value map[string]any) (map[string]any, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	body := map[string]any{
		"key":   key,
		"value": value,
	}
	raw, _, err := c.From("admin_config").
		Upsert(body, "key", "representation", "exact").
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

func DeleteAdminConfig(ctx context.Context, key string) error {
	c := Client()
	if c == nil {
		return errors.New("supabase: not configured")
	}
	_, _, err := c.From("admin_config").
		Delete("", "exact").
		Eq("key", key).
		ExecuteWithContext(ctx)
	return err
}
