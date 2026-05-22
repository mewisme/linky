package supax

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"time"

	"github.com/supabase-community/postgrest-go"

	"linky-api/src/internal/logger"
)

var repoLog = logger.New("infra:supabase:repositories")

var orderDesc = &postgrest.OrderOpts{Ascending: false}
var orderAsc = &postgrest.OrderOpts{Ascending: true}

func decodeOne[T any](raw []byte) (*T, error) {
	if len(raw) == 0 {
		return nil, nil
	}
	var arr []T
	if err := json.Unmarshal(raw, &arr); err == nil {
		if len(arr) == 0 {
			return nil, nil
		}
		v := arr[0]
		return &v, nil
	}
	var single T
	if err := json.Unmarshal(raw, &single); err != nil {
		return nil, err
	}
	return &single, nil
}

func decodeMany[T any](raw []byte) ([]T, error) {
	if len(raw) == 0 {
		return nil, nil
	}
	var arr []T
	if err := json.Unmarshal(raw, &arr); err != nil {
		return nil, err
	}
	return arr, nil
}

type UserRow struct {
	ID          string  `json:"id"`
	ClerkUserID string  `json:"clerk_user_id"`
	Email       *string `json:"email"`
	FirstName   *string `json:"first_name"`
	LastName    *string `json:"last_name"`
	AvatarURL   *string `json:"avatar_url"`
	Role        *string `json:"role"`
	Country     *string `json:"country"`
	Deleted     *bool   `json:"deleted"`
	DeletedAt   *string `json:"deleted_at"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

func GetUserByClerkID(ctx context.Context, clerkUserID string) (*UserRow, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("users").
		Select("*", "exact", false).
		Eq("clerk_user_id", clerkUserID).
		ExecuteWithContext(ctx)
	if err != nil {
		repoLog.Error().Err(err).Msg("Error fetching user by clerk id")
		return nil, err
	}
	return decodeOne[UserRow](raw)
}

func GetUserInternalID(ctx context.Context, clerkUserID string) (string, error) {
	u, err := GetUserByClerkID(ctx, clerkUserID)
	if err != nil {
		return "", err
	}
	if u == nil {
		return "", nil
	}
	return u.ID, nil
}

func UpdateUserCountry(ctx context.Context, clerkUserID, country string) (*UserRow, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	body := map[string]any{
		"country":    country,
		"updated_at": time.Now().UTC().Format(time.RFC3339Nano),
	}
	raw, _, err := c.From("users").
		Update(body, "representation", "exact").
		Eq("clerk_user_id", clerkUserID).
		ExecuteWithContext(ctx)
	if err != nil {
		repoLog.Error().Err(err).Msg("Error updating user country")
		return nil, err
	}
	return decodeOne[UserRow](raw)
}

type BlockedUserRow struct {
	ID            string `json:"id"`
	BlockedUserID string `json:"blocked_user_id"`
	CreatedAt     string `json:"created_at"`
}

func GetBlockedUserIDs(ctx context.Context, userID string) ([]string, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("user_blocks").
		Select("blocked_user_id", "exact", false).
		Eq("blocker_user_id", userID).
		ExecuteWithContext(ctx)
	if err != nil {
		repoLog.Error().Err(err).Msg("Error fetching blocked users")
		return nil, err
	}
	rows, err := decodeMany[BlockedUserRow](raw)
	if err != nil {
		return nil, err
	}
	out := make([]string, 0, len(rows))
	for _, r := range rows {
		out = append(out, r.BlockedUserID)
	}
	return out, nil
}

func GetBlockedUsersWithDetails(ctx context.Context, userID string) ([]map[string]any, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("user_blocks").
		Select("id, blocked_user_id, created_at, users!user_blocks_blocked_fkey(first_name, last_name, avatar_url)", "exact", false).
		Eq("blocker_user_id", userID).
		Order("created_at", orderDesc).
		ExecuteWithContext(ctx)
	if err != nil {
		repoLog.Error().Err(err).Msg("Error fetching blocked users with details")
		return nil, err
	}
	var out []map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func CreateBlock(ctx context.Context, blockerID, blockedID string) (map[string]any, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	body := map[string]any{
		"blocker_user_id": blockerID,
		"blocked_user_id": blockedID,
	}
	raw, _, err := c.From("user_blocks").
		Insert(body, false, "", "representation", "exact").
		ExecuteWithContext(ctx)
	if err != nil {
		repoLog.Error().Err(err).Msg("Error creating block")
		return nil, err
	}
	res, err := decodeOne[map[string]any](raw)
	if err != nil || res == nil {
		return nil, err
	}
	return *res, nil
}

func DeleteBlock(ctx context.Context, blockerID, blockedID string) error {
	c := Client()
	if c == nil {
		return errors.New("supabase: not configured")
	}
	_, _, err := c.From("user_blocks").
		Delete("", "exact").
		Eq("blocker_user_id", blockerID).
		Eq("blocked_user_id", blockedID).
		ExecuteWithContext(ctx)
	if err != nil {
		repoLog.Error().Err(err).Msg("Error deleting block")
		return err
	}
	return nil
}

func CheckBlockExists(ctx context.Context, blockerID, blockedID string) (bool, error) {
	c := Client()
	if c == nil {
		return false, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("user_blocks").
		Select("id", "exact", false).
		Eq("blocker_user_id", blockerID).
		Eq("blocked_user_id", blockedID).
		ExecuteWithContext(ctx)
	if err != nil {
		return false, err
	}
	rows, _ := decodeMany[map[string]any](raw)
	return len(rows) > 0, nil
}

func GetUserCountry(ctx context.Context, userID string) (*string, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("users").
		Select("country", "exact", false).
		Eq("id", userID).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	type row struct {
		Country *string `json:"country"`
	}
	r, err := decodeOne[row](raw)
	if err != nil || r == nil {
		return nil, err
	}
	return r.Country, nil
}

type InterestTagRow struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
	Icon        *string `json:"icon"`
	Category    *string `json:"category"`
	IsActive    bool    `json:"is_active"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

func GetInterestTags(ctx context.Context, category, search string, isActiveOnly bool, limit, offset int) ([]InterestTagRow, int64, error) {
	c := Client()
	if c == nil {
		return nil, 0, errors.New("supabase: not configured")
	}
	q := c.From("interest_tags").
		Select("id, name, description, icon, category, is_active, created_at, updated_at", "exact", false)
	if isActiveOnly {
		q = q.Eq("is_active", "true")
	}
	if category != "" {
		q = q.Eq("category", category)
	}
	if search != "" {
		q = q.Or("name.ilike.%"+search+"%,description.ilike.%"+search+"%", "")
	}
	q = q.Order("name", orderAsc).Range(offset, offset+limit-1, "")
	raw, count, err := q.ExecuteWithContext(ctx)
	if err != nil {
		return nil, 0, err
	}
	rows, err := decodeMany[InterestTagRow](raw)
	return rows, count, err
}

func GetInterestTagByID(ctx context.Context, id string) (*InterestTagRow, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("interest_tags").
		Select("*", "exact", false).
		Eq("id", id).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return decodeOne[InterestTagRow](raw)
}

type UserLevelRow struct {
	ID              string `json:"id"`
	UserID          string `json:"user_id"`
	TotalExpSeconds int    `json:"total_exp_seconds"`
	CreatedAt       string `json:"created_at"`
	UpdatedAt       string `json:"updated_at"`
}

func GetUserLevel(ctx context.Context, userID string) (*UserLevelRow, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("user_levels").
		Select("*", "exact", false).
		Eq("user_id", userID).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return decodeOne[UserLevelRow](raw)
}

func IncrementUserExp(ctx context.Context, userID string, seconds int) error {
	if seconds <= 0 {
		return nil
	}
	if userID == "" {
		return errors.New("user id required")
	}
	body := map[string]any{
		"p_user_id": userID,
		"p_seconds": seconds,
	}
	if _, err := RPC(ctx, "increment_user_exp", body); err != nil {
		repoLog.Error().Err(err).Str("userId", userID).Int("seconds", seconds).Msg("increment_user_exp RPC failed")
		return err
	}
	return nil
}

func IncrementUserExpDaily(ctx context.Context, userID, localDate string, seconds int) error {
	if seconds <= 0 || userID == "" || localDate == "" {
		return nil
	}
	if !dateRegex.MatchString(localDate) {
		return nil
	}
	body := map[string]any{
		"p_user_id":      userID,
		"p_date":         localDate,
		"p_exp_seconds":  seconds,
	}
	if _, err := RPC(ctx, "increment_user_exp_daily", body); err != nil {
		repoLog.Error().Err(err).Str("userId", userID).Str("date", localDate).Int("seconds", seconds).Msg("increment_user_exp_daily RPC failed")
		return err
	}
	return nil
}

type UserStreakRow struct {
	ID                         string  `json:"id"`
	UserID                     string  `json:"user_id"`
	CurrentStreak              int     `json:"current_streak"`
	LongestStreak              int     `json:"longest_streak"`
	LastValidDate              *string `json:"last_valid_date"`
	LastContinuationUsedFreeze *bool   `json:"last_continuation_used_freeze"`
	UpdatedAt                  string  `json:"updated_at"`
}

func GetUserStreak(ctx context.Context, userID string) (*UserStreakRow, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("user_streaks").
		Select("*", "exact", false).
		Eq("user_id", userID).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return decodeOne[UserStreakRow](raw)
}

type PushSubscriptionRow struct {
	ID        string `json:"id"`
	UserID    string `json:"user_id"`
	Endpoint  string `json:"endpoint"`
	P256DH    string `json:"p256dh"`
	Auth      string `json:"auth"`
	CreatedAt string `json:"created_at"`
}

func UpsertPushSubscription(ctx context.Context, userID, endpoint, p256dh, auth string) (*PushSubscriptionRow, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	body := map[string]any{
		"user_id":  userID,
		"endpoint": endpoint,
		"p256dh":   p256dh,
		"auth":     auth,
	}
	raw, _, err := c.From("push_subscriptions").
		Upsert(body, "endpoint", "representation", "exact").
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return decodeOne[PushSubscriptionRow](raw)
}

func DeletePushSubscription(ctx context.Context, userID, endpoint string) error {
	c := Client()
	if c == nil {
		return errors.New("supabase: not configured")
	}
	_, _, err := c.From("push_subscriptions").
		Delete("", "exact").
		Eq("user_id", userID).
		Eq("endpoint", endpoint).
		ExecuteWithContext(ctx)
	return err
}

type NotificationRow struct {
	ID        string                 `json:"id"`
	UserID    string                 `json:"user_id"`
	Type      string                 `json:"type"`
	Title     string                 `json:"title"`
	Body      *string                `json:"body"`
	Data      map[string]interface{} `json:"data"`
	IsRead    bool                   `json:"is_read"`
	ReadAt    *string                `json:"read_at"`
	CreatedAt string                 `json:"created_at"`
}

func GetUserNotifications(ctx context.Context, userID string, limit, offset int, unreadOnly bool) ([]NotificationRow, int64, error) {
	c := Client()
	if c == nil {
		return nil, 0, errors.New("supabase: not configured")
	}
	q := c.From("notifications").
		Select("*", "exact", false).
		Eq("user_id", userID)
	if unreadOnly {
		q = q.Eq("is_read", "false")
	}
	q = q.Order("created_at", orderDesc).Range(offset, offset+limit-1, "")
	raw, count, err := q.ExecuteWithContext(ctx)
	if err != nil {
		return nil, 0, err
	}
	rows, err := decodeMany[NotificationRow](raw)
	return rows, count, err
}

func GetUnreadNotificationCount(ctx context.Context, userID string) (int64, error) {
	c := Client()
	if c == nil {
		return 0, errors.New("supabase: not configured")
	}
	_, count, err := c.From("notifications").
		Select("id", "exact", true).
		Eq("user_id", userID).
		Eq("is_read", "false").
		ExecuteWithContext(ctx)
	return count, err
}

func MarkNotificationRead(ctx context.Context, notificationID, userID string) error {
	c := Client()
	if c == nil {
		return errors.New("supabase: not configured")
	}
	body := map[string]any{
		"is_read": true,
		"read_at": time.Now().UTC().Format(time.RFC3339Nano),
	}
	_, _, err := c.From("notifications").
		Update(body, "", "exact").
		Eq("id", notificationID).
		Eq("user_id", userID).
		ExecuteWithContext(ctx)
	return err
}

func MarkAllNotificationsRead(ctx context.Context, userID string) error {
	c := Client()
	if c == nil {
		return errors.New("supabase: not configured")
	}
	body := map[string]any{
		"is_read": true,
		"read_at": time.Now().UTC().Format(time.RFC3339Nano),
	}
	_, _, err := c.From("notifications").
		Update(body, "", "exact").
		Eq("user_id", userID).
		Eq("is_read", "false").
		ExecuteWithContext(ctx)
	return err
}

func itoa(i int) string { return strconv.Itoa(i) }
