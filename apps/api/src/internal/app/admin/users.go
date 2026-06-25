package admin

import (
	"context"
	"errors"
	"net/http"

	"linky-api/src/internal/infra/clerkadmin"
	"linky-api/src/internal/infra/supax"
)

var ErrUserNotFound = errors.New("user not found in database")

func SoftDeleteUser(
	ctx context.Context,
	actorClerkID string,
	userID string,
	patchBody map[string]any,
) (*supax.UserRow, error) {
	user, err := supax.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrUserNotFound
	}

	clerkUserID, _ := user["clerk_user_id"].(string)
	if clerkUserID != "" {
		if err := clerkadmin.DeleteUser(ctx, actorClerkID, clerkUserID); err != nil {
			if clerkadmin.HTTPStatus(err) != http.StatusNotFound {
				return nil, err
			}
		}
	}

	if patchBody == nil {
		patchBody = map[string]any{
			"deleted":    true,
			"deleted_at": supax.NowRFC3339(),
		}
	}
	return supax.PatchUser(ctx, userID, patchBody)
}
