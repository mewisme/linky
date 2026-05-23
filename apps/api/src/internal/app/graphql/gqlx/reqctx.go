package gqlx

import (
	"context"
	"sync"

	"linky-api/src/internal/app/user"
)

type ctxKey int

const (
	ctxKeyClerkUserID ctxKey = iota + 1
	ctxKeyCFCountry
	ctxKeyInternalUserID
	ctxKeyRole
)

func WithRequestContext(ctx context.Context, clerkUserID, cfCountry, role string) context.Context {
	ctx = context.WithValue(ctx, ctxKeyClerkUserID, clerkUserID)
	ctx = context.WithValue(ctx, ctxKeyCFCountry, cfCountry)
	ctx = context.WithValue(ctx, ctxKeyRole, role)
	return ctx
}

func ClerkUserID(ctx context.Context) string {
	v, _ := ctx.Value(ctxKeyClerkUserID).(string)
	return v
}

func CFCountry(ctx context.Context) string {
	v, _ := ctx.Value(ctxKeyCFCountry).(string)
	return v
}

func UserRole(ctx context.Context) string {
	v, _ := ctx.Value(ctxKeyRole).(string)
	if v == "" {
		return "user"
	}
	return v
}

func IsAdmin(ctx context.Context) bool {
	switch UserRole(ctx) {
	case "admin", "superadmin":
		return true
	default:
		return false
	}
}

var internalIDCache sync.Map

func InternalUserID(ctx context.Context) (string, error) {
	if v, ok := ctx.Value(ctxKeyInternalUserID).(string); ok && v != "" {
		return v, nil
	}
	clerkID := ClerkUserID(ctx)
	if clerkID == "" {
		return "", nil
	}
	if cached, ok := internalIDCache.Load(clerkID); ok {
		return cached.(string), nil
	}
	uid, err := user.InternalIDFromClerk(ctx, clerkID)
	if err != nil {
		return "", err
	}
	if uid != "" {
		internalIDCache.Store(clerkID, uid)
	}
	return uid, nil
}

func RequireClerk(ctx context.Context) error {
	if ClerkUserID(ctx) == "" {
		return ErrUnauthorized()
	}
	return nil
}

func RequireInternalUser(ctx context.Context) (string, error) {
	if err := RequireClerk(ctx); err != nil {
		return "", err
	}
	uid, err := InternalUserID(ctx)
	if err != nil {
		return "", ErrInternal("FAILED_FETCH_USER_DATA", "failedFetchUserData", "Failed to fetch user data", err)
	}
	if uid == "" {
		return "", ErrNotFound("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database")
	}
	return uid, nil
}

func RequireAdmin(ctx context.Context) error {
	if err := RequireClerk(ctx); err != nil {
		return err
	}
	if !IsAdmin(ctx) {
		return ErrForbidden("FORBIDDEN", "forbidden", "Forbidden")
	}
	return nil
}

func ClearInternalIDCacheForTests() {
	internalIDCache = sync.Map{}
}
