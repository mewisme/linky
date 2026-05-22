package user

import (
	"context"

	"linky-api/src/internal/infra/supax"
)

func InternalIDFromClerk(ctx context.Context, clerkID string) (string, error) {
	return supax.GetUserInternalID(ctx, clerkID)
}
