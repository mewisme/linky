package routes

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/supax"
)

func registerUserProfileRoutes(g *echo.Group) {
	g.GET("/me", handleUserProfileGet)
}

func handleUserProfileGet(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	if clerkID == "" {
		return httpx.SendError(c, 401, "Unauthorized",
			httpx.UM("USER_ID_NOT_IN_TOKEN", "userIdNotInToken", "User ID not found in authentication token"))
	}
	profile, err := supax.GetUserProfileAggregate(c.Request().Context(), clerkID)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_PROFILE", "failedFetchUserProfile", "Failed to fetch user profile"))
	}
	if profile == nil {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	return c.JSON(http.StatusOK, profile)
}
