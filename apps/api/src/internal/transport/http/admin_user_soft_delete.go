package routes

import (
	"context"
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/app/admin"
	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/clerkadmin"
	"linky-api/src/internal/infra/supax"
)

var errAdminUserNotFound = admin.ErrUserNotFound

func adminSoftDeleteUser(
	ctx context.Context,
	actorClerkID string,
	userID string,
	patchBody map[string]any,
) (*supax.UserRow, error) {
	return admin.SoftDeleteUser(ctx, actorClerkID, userID, patchBody)
}

func sendAdminSoftDeleteError(c echo.Context, err error) error {
	if errors.Is(err, errAdminUserNotFound) {
		return httpx.SendError(c, http.StatusNotFound, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	if err == clerkadmin.ErrForbidden {
		return httpx.Forbidden(c)
	}
	if err == clerkadmin.ErrActorRequired {
		return httpx.Unauthorized(c)
	}
	if clerkadmin.IsNotConfigured(err) {
		return httpx.SendError(c, http.StatusServiceUnavailable, "Service Unavailable",
			httpx.UM("CLERK_NOT_CONFIGURED", "clerkNotConfigured", "Clerk is not configured on the server"))
	}
	if clerkadmin.HTTPStatus(err) != 0 {
		return sendClerkAdminError(c, err, "FAILED_DELETE_CLERK_USER", "failedDeleteClerkUser", "Failed to delete user in Clerk")
	}
	return httpx.SendError(c, http.StatusInternalServerError, "Internal Server Error",
		httpx.UM("FAILED_DELETE_USER", "failedDeleteUser", "Failed to delete user"))
}
