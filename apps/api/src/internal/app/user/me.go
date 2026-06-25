package user

import (
	"context"
	"strings"

	"linky-api/src/internal/infra/supax"
)

func GetMe(ctx context.Context, clerkID, cfCountryHint string) (*supax.UserRow, error) {
	u, err := supax.GetUserByClerkID(ctx, clerkID)
	if err != nil {
		return nil, err
	}
	if u == nil {
		return nil, nil
	}
	if u.Country == nil || *u.Country == "" {
		country := strings.TrimSpace(cfCountryHint)
		if country != "" {
			updated, err := supax.UpdateUserCountry(ctx, clerkID, country)
			if err == nil && updated != nil {
				return updated, nil
			}
		}
	}
	return u, nil
}

func UpdateCountry(ctx context.Context, clerkUserID, country string) (*supax.UserRow, error) {
	return supax.UpdateUserCountry(ctx, clerkUserID, country)
}

// Deprecated: stub only; timezone persistence not implemented.
func SetTimezoneOnce(ctx context.Context, clerkID, timezone string) (string, error) {
	uid, err := supax.GetUserInternalID(ctx, clerkID)
	if err != nil || uid == "" {
		return "", err
	}
	return strings.TrimSpace(timezone), nil
}
