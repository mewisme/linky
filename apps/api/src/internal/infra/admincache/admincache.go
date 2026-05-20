package admincache

import (
	"context"
	"errors"
	"sync"
	"time"

	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/logger"
)

const cacheTTL = 5 * time.Minute

var log = logger.New("infra:admin-cache")

type Role string

const (
	RoleAdmin      Role = "admin"
	RoleSuperAdmin Role = "superadmin"
)

type entry struct {
	role      string
	expiresAt time.Time
}

var (
	mu    sync.RWMutex
	cache = make(map[string]entry)
)

func putRole(clerkUserID, role string) {
	mu.Lock()
	cache[clerkUserID] = entry{role: role, expiresAt: time.Now().Add(cacheTTL)}
	mu.Unlock()
}

func lookup(clerkUserID string) (string, bool) {
	mu.RLock()
	e, ok := cache[clerkUserID]
	mu.RUnlock()
	if !ok {
		return "", false
	}
	if time.Now().After(e.expiresAt) {
		mu.Lock()
		delete(cache, clerkUserID)
		mu.Unlock()
		return "", false
	}
	return e.role, true
}

func GetRole(ctx context.Context, clerkUserID string) (string, error) {
	if clerkUserID == "" {
		return "", errors.New("clerk user id required")
	}
	if cached, ok := lookup(clerkUserID); ok {
		switch cached {
		case "admin", "superadmin":
			return cached, nil
		case "user":
			return "", nil
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
	putRole(clerkUserID, cacheValue)
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
		putRole(r.ClerkUserID, val)
	}
	return nil
}

func Invalidate(clerkUserID string) {
	mu.Lock()
	delete(cache, clerkUserID)
	mu.Unlock()
}
