package supax

import (
	"context"
	"encoding/json"
	"errors"
	"time"
)

type AdminUsersOptions struct {
	Page    int
	Limit   int
	Role    string
	Deleted *bool
	Search  string
}

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
	r, err := decodeOne[map[string]any](raw)
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
	return decodeOne[UserRow](raw)
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
	return decodeOne[UserRow](raw)
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
	return decodeOne[UserRow](raw)
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
