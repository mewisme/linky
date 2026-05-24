package admin

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"time"

	"linky-api/src/internal/app/presence"
	"linky-api/src/internal/domain/user/leveling"
	"linky-api/src/internal/infra/supax"
)

var ErrCannotAssignSuperadmin = errors.New("cannot assign superadmin role")

type ListUsersOptions struct {
	Page    int
	Limit   int
	Role    string
	Search  string
	Deleted *bool
}

func ListUsers(ctx context.Context, opts ListUsersOptions) (map[string]any, error) {
	rows, count, err := supax.ListAdminUsersUnified(ctx, supax.AdminUsersOptions{
		Page: opts.Page, Limit: opts.Limit, Role: opts.Role, Search: opts.Search, Deleted: opts.Deleted,
	})
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, 0, len(rows))
	presenceSnap := presence.SnapshotPresence()
	for _, r := range rows {
		out = append(out, MapUserRow(r, presenceSnap))
	}
	return map[string]any{"data": out, "count": count}, nil
}

func GetUser(ctx context.Context, id string) (map[string]any, error) {
	return supax.GetUserByID(ctx, id)
}

func PatchUser(ctx context.Context, id string, body map[string]any, enforceSuperadminGuard bool) (*supax.UserRow, error) {
	if enforceSuperadminGuard {
		if r, _ := body["role"].(string); r == "superadmin" {
			return nil, ErrCannotAssignSuperadmin
		}
	}
	return supax.PatchUser(ctx, id, body)
}

func SoftDeleteUser(ctx context.Context, id string) error {
	body := map[string]any{
		"deleted":    true,
		"deleted_at": supax.NowRFC3339(),
	}
	_, err := supax.PatchUser(ctx, id, body)
	return err
}

func MapUserRow(row map[string]any, presence map[string]struct {
	State     string
	UpdatedAt time.Time
}) map[string]any {
	id, _ := row["user_id"].(string)
	clerk, _ := row["clerk_user_id"].(string)
	totalExp := toIntFromAny(row["total_exp_seconds"])
	level := leveling.CalculateLevelFromExp(totalExp, leveling.Default).Level

	bio, _ := row["bio"].(string)
	gender, _ := row["gender"].(string)
	dob, _ := row["date_of_birth"].(string)
	hasDetails := bio != "" || gender != "" || dob != "" || row["bio"] != nil || row["gender"] != nil || row["date_of_birth"] != nil
	var details map[string]any
	if hasDetails {
		details = map[string]any{
			"bio":           nullableString(row["bio"]),
			"gender":        nullableString(row["gender"]),
			"date_of_birth": nullableString(row["date_of_birth"]),
		}
	}

	tags := stringSliceFromAny(row["interest_tags"])

	var embedding map[string]any
	if updated, ok := row["embedding_updated_at"].(string); ok && updated != "" {
		hash, _ := row["embedding_source_hash"].(string)
		embedding = map[string]any{
			"model":       nullableString(row["embedding_model"]),
			"source_hash": hash,
			"updated_at":  updated,
		}
	}

	state := "offline"
	if clerk != "" {
		if p, ok := presence[clerk]; ok && p.State != "" {
			state = p.State
		}
	}

	return map[string]any{
		"id":                 id,
		"clerk_user_id":      clerk,
		"email":              row["email"],
		"first_name":         row["first_name"],
		"last_name":          row["last_name"],
		"avatar_url":         row["avatar_url"],
		"role":               row["role"],
		"deleted":            row["deleted"],
		"presence":           state,
		"created_at":         row["created_at"],
		"updated_at":         row["updated_at"],
		"details":            details,
		"interest_tag_names": tags,
		"embedding":          embedding,
		"level":              level,
	}
}

func toIntFromAny(v any) int {
	switch n := v.(type) {
	case int:
		return n
	case int64:
		return int(n)
	case float64:
		return int(n)
	case json.Number:
		i, _ := n.Int64()
		return int(i)
	case string:
		x, _ := strconv.Atoi(n)
		return x
	}
	return 0
}

func nullableString(v any) any {
	if v == nil {
		return nil
	}
	if s, ok := v.(string); ok {
		if s == "" {
			return nil
		}
		return s
	}
	return v
}

func stringSliceFromAny(v any) []string {
	out := []string{}
	if arr, ok := v.([]any); ok {
		for _, item := range arr {
			if s, ok := item.(string); ok {
				out = append(out, s)
			}
		}
	}
	return out
}
