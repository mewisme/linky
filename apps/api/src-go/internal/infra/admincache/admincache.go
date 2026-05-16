package admincache

import (
	"context"
	"errors"
	"time"

	"linky-api/src-go/internal/infra/redisx"
	"linky-api/src-go/internal/infra/supax"
	"linky-api/src-go/internal/logger"
)

const cacheTTL = 5 * time.Minute

var log = logger.New("infra:admin-cache")

type Role string

const (
	RoleAdmin      Role = "admin"
	RoleSuperAdmin Role = "superadmin"
)

func cacheKey(clerkUserID string) string {
	return "admin:role:" + clerkUserID
}

func GetRole(ctx context.Context, clerkUserID string) (string, error) {
	if clerkUserID == "" {
		return "", errors.New("clerk user id required")
	}
	c := redisx.Client()
	key := cacheKey(clerkUserID)

	if c != nil {
		if cached, err := c.Get(ctx, key).Result(); err == nil {
			switch cached {
			case "admin", "superadmin":
				return cached, nil
			case "user":
				return "", nil
			}
		}
	}

	sb := supax.Client()
	if sb == nil {
		return "", errors.New("supabase not configured")
	}

	type row struct {
		Role *string `json:"role"`
	}
	var rows []row
	if _, err := sb.From("users").Select("role", "exact", false).Eq("clerk_user_id", clerkUserID).ExecuteTo(&rows); err != nil {
		log.Error().Err(err).Msg("Error checking admin role")
		return "", err
	}
	role := ""
	if len(rows) > 0 && rows[0].Role != nil {
		if *rows[0].Role == "admin" || *rows[0].Role == "superadmin" {
			role = *rows[0].Role
		}
	}
	cacheValue := role
	if cacheValue == "" {
		cacheValue = "user"
	}
	if c != nil {
		_ = c.Set(ctx, key, cacheValue, cacheTTL).Err()
	}
	return role, nil
}

func IsAdmin(ctx context.Context, clerkUserID string) (bool, error) {
	role, err := GetRole(ctx, clerkUserID)
	if err != nil {
		return false, err
	}
	return role == "admin" || role == "superadmin", nil
}

func Initialize(ctx context.Context) error {
	sb := supax.Client()
	if sb == nil {
		return nil
	}
	c := redisx.Client()
	if c == nil {
		return nil
	}
	type row struct {
		ClerkUserID string  `json:"clerk_user_id"`
		Role        *string `json:"role"`
	}
	var rows []row
	if _, err := sb.From("users").Select("clerk_user_id, role", "exact", false).In("role", []string{"admin", "superadmin"}).ExecuteTo(&rows); err != nil {
		log.Error().Err(err).Msg("Error refreshing admin cache")
		return err
	}
	for _, r := range rows {
		if r.Role == nil {
			continue
		}
		val := "admin"
		if *r.Role == "superadmin" {
			val = "superadmin"
		}
		_ = c.Set(ctx, cacheKey(r.ClerkUserID), val, cacheTTL).Err()
	}
	return nil
}
