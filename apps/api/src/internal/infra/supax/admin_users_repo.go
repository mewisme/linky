package supax

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"linky-api/src/internal/infra/supax/codec"
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
	rows, err := codec.DecodeMany[row](raw)
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
	rows, err := codec.DecodeMany[AdminConfigRow](raw)
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
	r, err := codec.DecodeOne[map[string]any](raw)
	if err != nil || r == nil {
		return nil, err
	}
	return *r, nil
}

type AdminUsersOptions struct {
	Page    int
	Limit   int
	Role    string
	Deleted *bool
	Search  string
}

// Deprecated: use ListAdminUsersUnified instead.
func ListAdminUsers(ctx context.Context, opts AdminUsersOptions) ([]map[string]any, int64, error) {
	c := Client()
	if c == nil {
		return nil, 0, errors.New("supabase: not configured")
	}
	page := opts.Page
	if page < 1 {
		page = 1
	}
	limit := opts.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	offset := (page - 1) * limit
	q := c.From("users").Select("*", "exact", false)
	if opts.Role == "admin" || opts.Role == "member" || opts.Role == "superadmin" {
		q = q.Eq("role", opts.Role)
	}
	if opts.Deleted != nil {
		v := "false"
		if *opts.Deleted {
			v = "true"
		}
		q = q.Eq("deleted", v)
	}
	if opts.Search != "" {
		q = q.Or("email.ilike.%"+opts.Search+"%,first_name.ilike.%"+opts.Search+"%,last_name.ilike.%"+opts.Search+"%", "")
	}
	q = q.Order("created_at", orderDesc).Range(offset, offset+limit-1, "")
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

func ListAdminUsersUnified(ctx context.Context, opts AdminUsersOptions) ([]map[string]any, int64, error) {
	c := Client()
	if c == nil {
		return nil, 0, errors.New("supabase: not configured")
	}
	page := opts.Page
	if page < 1 {
		page = 1
	}
	limit := opts.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	offset := (page - 1) * limit
	q := c.From("admin_users_unified").Select("*", "exact", false)
	if opts.Role == "admin" || opts.Role == "member" || opts.Role == "superadmin" {
		q = q.Eq("role", opts.Role)
	}
	if opts.Deleted != nil {
		v := "false"
		if *opts.Deleted {
			v = "true"
		}
		q = q.Eq("deleted", v)
	}
	if opts.Search != "" {
		q = q.Or("email.ilike.%"+opts.Search+"%,first_name.ilike.%"+opts.Search+"%,last_name.ilike.%"+opts.Search+"%", "")
	}
	q = q.Order("created_at", orderDesc).Range(offset, offset+limit-1, "")
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

func GetUserByID(ctx context.Context, id string) (map[string]any, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("users").
		Select("*", "exact", false).
		Eq("id", id).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	r, err := codec.DecodeOne[map[string]any](raw)
	if err != nil || r == nil {
		return nil, err
	}
	return *r, nil
}

func GetUserByEmail(ctx context.Context, email string) (*UserRow, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("users").
		Select("*", "exact", false).
		Eq("email", email).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return codec.DecodeOne[UserRow](raw)
}

func PatchUser(ctx context.Context, id string, body map[string]any) (*UserRow, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	body["updated_at"] = time.Now().UTC().Format(time.RFC3339Nano)
	raw, _, err := c.From("users").
		Update(body, "representation", "exact").
		Eq("id", id).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return codec.DecodeOne[UserRow](raw)
}

func CreateUser(ctx context.Context, payload map[string]any) (*UserRow, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("users").
		Insert(payload, false, "", "representation", "exact").
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return codec.DecodeOne[UserRow](raw)
}

func SoftDeleteUserByClerkID(ctx context.Context, clerkUserID string) error {
	c := Client()
	if c == nil {
		return errors.New("supabase: not configured")
	}
	body := map[string]any{
		"deleted":    true,
		"deleted_at": time.Now().UTC().Format(time.RFC3339Nano),
	}
	_, _, err := c.From("users").
		Update(body, "", "exact").
		Eq("clerk_user_id", clerkUserID).
		ExecuteWithContext(ctx)
	return err
}

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
	r, err := codec.DecodeOne[map[string]any](raw)
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
	r, err := codec.DecodeOne[map[string]any](raw)
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
	r, err := codec.DecodeOne[map[string]any](raw)
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
	rows, err := codec.DecodeMany[row](raw)
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
		rows, err := codec.DecodeMany[row](raw)
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
