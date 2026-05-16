package supax

import (
	"context"
	"errors"
	"time"
)

type FavoriteRow struct {
	ID             string `json:"id"`
	UserID         string `json:"user_id"`
	FavoriteUserID string `json:"favorite_user_id"`
	CreatedAt      string `json:"created_at"`
}

type FavoriteWithStatsRow struct {
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

type FavoriteLimitRow struct {
	UserID     string  `json:"user_id"`
	Date       string  `json:"date"`
	UsedCount  int     `json:"used_count"`
	DailyLimit int     `json:"daily_limit"`
	UpdatedAt  *string `json:"updated_at"`
}

const defaultFavoriteDailyLimit = 10

func GetFavoritesByUserID(ctx context.Context, userID string) ([]string, error) {
	c := Client()
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
	rows, err := decodeMany[FavoriteRow](raw)
	if err != nil {
		return nil, err
	}
	out := make([]string, 0, len(rows))
	for _, r := range rows {
		out = append(out, r.FavoriteUserID)
	}
	return out, nil
}

func GetFavoritesWithStats(ctx context.Context, userID string) ([]FavoriteWithStatsRow, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("user_favorites_with_stats").
		Select("*", "exact", false).
		Eq("user_id", userID).
		Order("created_at", orderDesc).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := decodeMany[FavoriteWithStatsRow](raw)
	if err != nil {
		return nil, err
	}
	if rows == nil {
		rows = []FavoriteWithStatsRow{}
	}
	return rows, nil
}

func CheckFavoriteExists(ctx context.Context, userID, favoriteUserID string) (bool, error) {
	c := Client()
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
	row, err := decodeOne[FavoriteRow](raw)
	if err != nil {
		return false, err
	}
	return row != nil, nil
}

func CreateFavorite(ctx context.Context, userID, favoriteUserID string) (*FavoriteRow, error) {
	c := Client()
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
	return decodeOne[FavoriteRow](raw)
}

func DeleteFavorite(ctx context.Context, userID, favoriteUserID string) error {
	c := Client()
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

func GetFavoriteCreationDate(ctx context.Context, userID, favoriteUserID string) (string, error) {
	c := Client()
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
	row, err := decodeOne[FavoriteRow](raw)
	if err != nil || row == nil {
		return "", err
	}
	return row.CreatedAt, nil
}

func getFavoriteLimitForToday(ctx context.Context, userID string) (*FavoriteLimitRow, error) {
	c := Client()
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
	return decodeOne[FavoriteLimitRow](raw)
}

type FavoriteLimitCheck struct {
	Reached bool
	Current int
	Limit   int
}

func CheckDailyFavoriteLimitReached(ctx context.Context, userID string) (FavoriteLimitCheck, error) {
	row, err := getFavoriteLimitForToday(ctx, userID)
	if err != nil {
		return FavoriteLimitCheck{}, err
	}
	if row == nil {
		return FavoriteLimitCheck{Reached: false, Current: 0, Limit: defaultFavoriteDailyLimit}, nil
	}
	return FavoriteLimitCheck{
		Reached: row.UsedCount >= row.DailyLimit,
		Current: row.UsedCount,
		Limit:   row.DailyLimit,
	}, nil
}

func IncrementFavoriteLimit(ctx context.Context, userID string) error {
	c := Client()
	if c == nil {
		return errors.New("supabase: not configured")
	}
	today := time.Now().UTC().Format("2006-01-02")
	existing, err := getFavoriteLimitForToday(ctx, userID)
	if err != nil {
		return err
	}
	if existing == nil {
		body := map[string]any{
			"user_id":     userID,
			"date":        today,
			"used_count":  1,
			"daily_limit": defaultFavoriteDailyLimit,
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

func DecrementFavoriteLimit(ctx context.Context, userID string) error {
	c := Client()
	if c == nil {
		return errors.New("supabase: not configured")
	}
	today := time.Now().UTC().Format("2006-01-02")
	existing, err := getFavoriteLimitForToday(ctx, userID)
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
