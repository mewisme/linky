package supax

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"linky-api/src/internal/infra/supax/pgclient"
)

type UserDetailsRow struct {
	UserID         string   `json:"user_id"`
	Bio            *string  `json:"bio"`
	Gender         *string  `json:"gender"`
	DateOfBirth    *string  `json:"date_of_birth"`
	Timezone       *string  `json:"timezone"`
	InterestTags   []string `json:"interest_tags"`
	CreatedAt      string   `json:"created_at"`
	UpdatedAt      string   `json:"updated_at"`
}

func GetUserDetailsByUserID(ctx context.Context, userID string) (*UserDetailsRow, error) {
	c := pgclient.Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("user_details").
		Select("*", "exact", false).
		Eq("user_id", userID).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return decodeOne[UserDetailsRow](raw)
}

func GetUserDetailsWithTags(ctx context.Context, userID string) (map[string]any, error) {
	c := pgclient.Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("user_details_expanded").
		Select("*", "exact", false).
		Eq("user_id", userID).
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

func GetUserTimezone(ctx context.Context, userID string) (string, error) {
	row, err := GetUserDetailsByUserID(ctx, userID)
	if err != nil || row == nil || row.Timezone == nil {
		return "", err
	}
	return *row.Timezone, nil
}

type SetTimezoneOnceResult struct {
	Set        bool
	AlreadySet bool
}

func SetUserTimezoneOnce(ctx context.Context, userID, timezone string) (SetTimezoneOnceResult, error) {
	c := pgclient.Client()
	if c == nil {
		return SetTimezoneOnceResult{}, errors.New("supabase: not configured")
	}
	existing, err := GetUserDetailsByUserID(ctx, userID)
	if err != nil {
		return SetTimezoneOnceResult{}, err
	}
	if existing != nil && existing.Timezone != nil && *existing.Timezone != "" {
		return SetTimezoneOnceResult{AlreadySet: true}, nil
	}
	if existing == nil {
		body := map[string]any{"user_id": userID, "timezone": timezone}
		_, _, err := c.From("user_details").
			Insert(body, false, "", "representation", "exact").
			ExecuteWithContext(ctx)
		if err != nil {
			return SetTimezoneOnceResult{}, err
		}
		return SetTimezoneOnceResult{Set: true}, nil
	}
	body := map[string]any{"timezone": timezone}
	raw, _, err := c.From("user_details").
		Update(body, "representation", "exact").
		Eq("user_id", userID).
		Is("timezone", "null").
		ExecuteWithContext(ctx)
	if err != nil {
		return SetTimezoneOnceResult{}, err
	}
	var arr []map[string]any
	_ = json.Unmarshal(raw, &arr)
	if len(arr) > 0 {
		return SetTimezoneOnceResult{Set: true}, nil
	}
	return SetTimezoneOnceResult{AlreadySet: true}, nil
}

func UpsertUserDetails(ctx context.Context, userID string, body map[string]any) (*UserDetailsRow, error) {
	c := pgclient.Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	existing, err := GetUserDetailsByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		body["user_id"] = userID
		raw, _, err := c.From("user_details").
			Insert(body, false, "", "representation", "exact").
			ExecuteWithContext(ctx)
		if err != nil {
			return nil, err
		}
		return decodeOne[UserDetailsRow](raw)
	}
	body["updated_at"] = time.Now().UTC().Format(time.RFC3339Nano)
	raw, _, err := c.From("user_details").
		Update(body, "representation", "exact").
		Eq("user_id", userID).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return decodeOne[UserDetailsRow](raw)
}

type UserSettingsRow struct {
	UserID    string         `json:"user_id"`
	Settings  map[string]any `json:"settings,omitempty"`
	Theme     *string        `json:"theme"`
	Language  *string        `json:"language"`
	CreatedAt string         `json:"created_at"`
	UpdatedAt string         `json:"updated_at"`
}

func GetUserSettings(ctx context.Context, userID string) (map[string]any, error) {
	c := pgclient.Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("user_settings").
		Select("*", "exact", false).
		Eq("user_id", userID).
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

func UpsertUserSettings(ctx context.Context, userID string, body map[string]any) (map[string]any, error) {
	c := pgclient.Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	existing, err := GetUserSettings(ctx, userID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		body["user_id"] = userID
		raw, _, err := c.From("user_settings").
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
	body["updated_at"] = time.Now().UTC().Format(time.RFC3339Nano)
	raw, _, err := c.From("user_settings").
		Update(body, "representation", "exact").
		Eq("user_id", userID).
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

func GetUserProfileAggregate(ctx context.Context, clerkUserID string) (map[string]any, error) {
	user, err := GetUserByClerkID(ctx, clerkUserID)
	if err != nil || user == nil {
		return nil, err
	}
	details, _ := GetUserDetailsWithTags(ctx, user.ID)
	settings, _ := GetUserSettings(ctx, user.ID)
	out := map[string]any{
		"user":     user,
		"details":  details,
		"settings": settings,
	}
	return out, nil
}

func GetInterestTagsByIDs(ctx context.Context, ids []string) ([]InterestTagRow, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	c := pgclient.Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("interest_tags").
		Select("*", "exact", false).
		In("id", ids).
		Eq("is_active", "true").
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return decodeMany[InterestTagRow](raw)
}

type ReportRow struct {
	ID                  string         `json:"id"`
	ReporterUserID      string         `json:"reporter_user_id"`
	ReportedUserID      string         `json:"reported_user_id"`
	Reason              string         `json:"reason"`
	Description         *string        `json:"description,omitempty"`
	Status              string         `json:"status"`
	Metadata            map[string]any `json:"metadata,omitempty"`
	AdminNotes          *string        `json:"admin_notes,omitempty"`
	ReviewedBy          *string        `json:"reviewed_by,omitempty"`
	ReviewedAt          *string        `json:"reviewed_at,omitempty"`
	CreatedAt           string         `json:"created_at"`
	UpdatedAt           *string        `json:"updated_at,omitempty"`
	ReporterFirstName   *string        `json:"reporter_first_name,omitempty"`
	ReporterLastName    *string        `json:"reporter_last_name,omitempty"`
	ReporterAvatarURL   *string        `json:"reporter_avatar_url,omitempty"`
	ReporterEmail       *string        `json:"reporter_email,omitempty"`
	ReportedFirstName   *string        `json:"reported_first_name,omitempty"`
	ReportedLastName    *string        `json:"reported_last_name,omitempty"`
	ReportedAvatarURL   *string        `json:"reported_avatar_url,omitempty"`
	ReportedEmail       *string        `json:"reported_email,omitempty"`
	ReviewedByFirstName *string        `json:"reviewed_by_first_name,omitempty"`
	ReviewedByLastName  *string        `json:"reviewed_by_last_name,omitempty"`
	ReviewedByAvatarURL *string        `json:"reviewed_by_avatar_url,omitempty"`
}

func CreateReport(ctx context.Context, body map[string]any) (*ReportRow, error) {
	c := pgclient.Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("reports").
		Insert(body, false, "", "representation", "exact").
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return decodeOne[ReportRow](raw)
}

func CreateReportContext(ctx context.Context, reportID string, metadata map[string]any) error {
	if reportID == "" || len(metadata) == 0 {
		return nil
	}
	c := pgclient.Client()
	if c == nil {
		return errors.New("supabase: not configured")
	}
	body := map[string]any{"report_id": reportID}
	if v, ok := metadata["call_id"].(string); ok && v != "" {
		body["call_id"] = v
	}
	if v, ok := metadata["room_id"].(string); ok && v != "" {
		body["room_id"] = v
	}
	if v, ok := metadata["behavior_flags"]; ok && v != nil {
		body["behavior_flags"] = v
	}
	if len(body) == 1 {
		return nil
	}
	_, _, err := c.From("report_contexts").
		Insert(body, false, "", "", "exact").
		ExecuteWithContext(ctx)
	return err
}

func ListReports(ctx context.Context, userID string, limit, offset int) ([]ReportRow, int64, error) {
	c := pgclient.Client()
	if c == nil {
		return nil, 0, errors.New("supabase: not configured")
	}
	raw, count, err := c.From("admin_reports_unified").
		Select("*", "exact", false).
		Eq("reporter_user_id", userID).
		Order("created_at", orderDesc).
		Range(offset, offset+limit-1, "").
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, 0, err
	}
	rows, err := decodeMany[ReportRow](raw)
	return rows, count, err
}

func ListAdminReports(ctx context.Context, status, reporterUserID, reportedUserID string, limit, offset int) ([]ReportRow, int64, error) {
	c := pgclient.Client()
	if c == nil {
		return nil, 0, errors.New("supabase: not configured")
	}
	if limit <= 0 {
		limit = 50
	}
	q := c.From("admin_reports_unified").Select("*", "exact", false)
	if status != "" {
		q = q.Eq("status", status)
	}
	if reporterUserID != "" {
		q = q.Eq("reporter_user_id", reporterUserID)
	}
	if reportedUserID != "" {
		q = q.Eq("reported_user_id", reportedUserID)
	}
	q = q.Order("created_at", orderDesc).Range(offset, offset+limit-1, "")
	raw, count, err := q.ExecuteWithContext(ctx)
	if err != nil {
		return nil, 0, err
	}
	rows, err := decodeMany[ReportRow](raw)
	return rows, count, err
}

type AdminConfigRow struct {
	Key   string          `json:"key"`
	Value json.RawMessage `json:"value"`
}

func GetAdminConfigValue(ctx context.Context, key string) (json.RawMessage, error) {
	c := pgclient.Client()
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
	c := pgclient.Client()
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
	c := pgclient.Client()
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

type AdminUsersOptions struct {
	Page     int
	Limit    int
	Role     string
	Deleted  *bool
	Search   string
}

func ListAdminUsers(ctx context.Context, opts AdminUsersOptions) ([]map[string]any, int64, error) {
	c := pgclient.Client()
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
	c := pgclient.Client()
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
	c := pgclient.Client()
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
	c := pgclient.Client()
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
	c := pgclient.Client()
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
	c := pgclient.Client()
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
	c := pgclient.Client()
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
	c := pgclient.Client()
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
	c := pgclient.Client()
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
	c := pgclient.Client()
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
	c := pgclient.Client()
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
	c := pgclient.Client()
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

func DeleteAdminConfig(ctx context.Context, key string) error {
	c := pgclient.Client()
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
	c := pgclient.Client()
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
	c := pgclient.Client()
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
	c := pgclient.Client()
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
	rows, err := decodeMany[joined](raw)
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
	c := pgclient.Client()
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
	return decodeOne[BroadcastHistoryRow](raw)
}

func PatchReport(ctx context.Context, id string, body map[string]any) (*ReportRow, error) {
	c := pgclient.Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("reports").
		Update(body, "representation", "exact").
		Eq("id", id).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return decodeOne[ReportRow](raw)
}

func GetReport(ctx context.Context, id string) (*ReportRow, error) {
	c := pgclient.Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("admin_reports_unified").
		Select("*", "exact", false).
		Eq("id", id).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return decodeOne[ReportRow](raw)
}
