package favorites

import (
	"context"
	"errors"
	"time"

	"linky-api/src/internal/infra/supax/client"
	"linky-api/src/internal/infra/supax/codec"
)

type Row struct {
	ID             string `json:"id"`
	UserID         string `json:"user_id"`
	FavoriteUserID string `json:"favorite_user_id"`
	CreatedAt      string `json:"created_at"`
}

type WithStatsRow struct {
	ID              string  `json:"id"`
	UserID          string  `json:"user_id"`
	FavoriteUserID  string  `json:"favorite_user_id"`
	CreatedAt       *string `json:"created_at"`
	ClerkUserID     *string `json:"clerk_user_id"`
	Email           *string `json:"email"`
	FirstName       *string `json:"first_name"`
	LastName        *string `json:"last_name"`
	AvatarURL       *string `json:"avatar_url"`
	Country         *string `json:"country"`
	MatchCount      int64   `json:"match_count"`
	TotalDuration   int64   `json:"total_duration"`
	AverageDuration int64   `json:"average_duration"`
}

type LimitRow struct {
	UserID     string  `json:"user_id"`
	Date       string  `json:"date"`
	UsedCount  int     `json:"used_count"`
	DailyLimit int     `json:"daily_limit"`
	UpdatedAt  *string `json:"updated_at"`
}

const defaultDailyLimit = 10

func GetByUserID(ctx context.Context, userID string) ([]string, error) {
	c := client.Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("user_favorites").
		Select("favorite_user_id", "exact", false).
		Eq("user_id", userID).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := codec.DecodeMany[Row](raw)
	if err != nil {
		return nil, err
	}
	out := make([]string, 0, len(rows))
	for _, r := range rows {
		out = append(out, r.FavoriteUserID)
	}
	return out, nil
}

func GetWithStats(ctx context.Context, userID string) ([]WithStatsRow, error) {
	c := client.Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("user_favorites_with_stats").
		Select("*", "exact", false).
		Eq("user_id", userID).
		Order("created_at", codec.OrderDesc).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := codec.DecodeMany[WithStatsRow](raw)
	if err != nil {
		return nil, err
	}
	if rows == nil {
		rows = []WithStatsRow{}
	}
	return rows, nil
}

func Exists(ctx context.Context, userID, favoriteUserID string) (bool, error) {
	c := client.Client()
	if c == nil {
		return false, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("user_favorites").
		Select("id", "exact", false).
		Eq("user_id", userID).
		Eq("favorite_user_id", favoriteUserID).
		ExecuteWithContext(ctx)
	if err != nil {
		return false, err
	}
	row, err := codec.DecodeOne[Row](raw)
	if err != nil {
		return false, err
	}
	return row != nil, nil
}

func Create(ctx context.Context, userID, favoriteUserID string) (*Row, error) {
	c := client.Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	body := map[string]any{
		"user_id":          userID,
		"favorite_user_id": favoriteUserID,
	}
	raw, _, err := c.From("user_favorites").
		Insert(body, false, "", "representation", "exact").
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return codec.DecodeOne[Row](raw)
}

func Delete(ctx context.Context, userID, favoriteUserID string) error {
	c := client.Client()
	if c == nil {
		return errors.New("supabase: not configured")
	}
	_, _, err := c.From("user_favorites").
		Delete("", "exact").
		Eq("user_id", userID).
		Eq("favorite_user_id", favoriteUserID).
		ExecuteWithContext(ctx)
	return err
}

func CreationDate(ctx context.Context, userID, favoriteUserID string) (string, error) {
	c := client.Client()
	if c == nil {
		return "", errors.New("supabase: not configured")
	}
	raw, _, err := c.From("user_favorites").
		Select("created_at", "exact", false).
		Eq("user_id", userID).
		Eq("favorite_user_id", favoriteUserID).
		ExecuteWithContext(ctx)
	if err != nil {
		return "", err
	}
	row, err := codec.DecodeOne[Row](raw)
	if err != nil || row == nil {
		return "", err
	}
	return row.CreatedAt, nil
}

func getLimitForToday(ctx context.Context, userID string) (*LimitRow, error) {
	c := client.Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	today := time.Now().UTC().Format("2006-01-02")
	raw, _, err := c.From("user_favorite_limits").
		Select("*", "exact", false).
		Eq("user_id", userID).
		Eq("date", today).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return codec.DecodeOne[LimitRow](raw)
}

type LimitCheck struct {
	Reached bool
	Current int
	Limit   int
}

func CheckDailyLimitReached(ctx context.Context, userID string) (LimitCheck, error) {
	row, err := getLimitForToday(ctx, userID)
	if err != nil {
		return LimitCheck{}, err
	}
	if row == nil {
		return LimitCheck{Reached: false, Current: 0, Limit: defaultDailyLimit}, nil
	}
	return LimitCheck{
		Reached: row.UsedCount >= row.DailyLimit,
		Current: row.UsedCount,
		Limit:   row.DailyLimit,
	}, nil
}

func IncrementLimit(ctx context.Context, userID string) error {
	c := client.Client()
	if c == nil {
		return errors.New("supabase: not configured")
	}
	today := time.Now().UTC().Format("2006-01-02")
	existing, err := getLimitForToday(ctx, userID)
	if err != nil {
		return err
	}
	if existing == nil {
		body := map[string]any{
			"user_id":     userID,
			"date":        today,
			"used_count":  1,
			"daily_limit": defaultDailyLimit,
		}
		_, _, err := c.From("user_favorite_limits").
			Insert(body, false, "", "representation", "exact").
			ExecuteWithContext(ctx)
		return err
	}
	body := map[string]any{
		"used_count": existing.UsedCount + 1,
	}
	_, _, err = c.From("user_favorite_limits").
		Update(body, "representation", "exact").
		Eq("user_id", userID).
		Eq("date", today).
		ExecuteWithContext(ctx)
	return err
}

func DecrementLimit(ctx context.Context, userID string) error {
	c := client.Client()
	if c == nil {
		return errors.New("supabase: not configured")
	}
	today := time.Now().UTC().Format("2006-01-02")
	existing, err := getLimitForToday(ctx, userID)
	if err != nil {
		return err
	}
	if existing == nil || existing.UsedCount <= 0 {
		return nil
	}
	next := existing.UsedCount - 1
	if next < 0 {
		next = 0
	}
	body := map[string]any{
		"used_count": next,
	}
	_, _, err = c.From("user_favorite_limits").
		Update(body, "representation", "exact").
		Eq("user_id", userID).
		Eq("date", today).
		ExecuteWithContext(ctx)
	return err
}
