package routes

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/supax"
)

func registerFavoritesRoutes(g *echo.Group) {
	g.GET("", handleListFavorites)
	g.POST("", handleCreateFavorite)
	g.DELETE("/:favorite_user_id", handleDeleteFavorite)
}

func handleListFavorites(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	if clerkID == "" {
		return httpx.SendError(c, 401, "Unauthorized",
			httpx.UM("USER_ID_NOT_IN_TOKEN", "userIdNotInToken", "User ID not found in authentication token"))
	}
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	rows, err := supax.GetFavoritesWithStats(c.Request().Context(), uid)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_FAVORITES", "failedFetchFavorites", "Failed to fetch favorites"))
	}
	if rows == nil {
		rows = []supax.FavoriteWithStatsRow{}
	}
	return c.JSON(http.StatusOK, map[string]any{
		"data":  rows,
		"count": len(rows),
	})
}

func handleCreateFavorite(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	if clerkID == "" {
		return httpx.SendError(c, 401, "Unauthorized",
			httpx.UM("USER_ID_NOT_IN_TOKEN", "userIdNotInToken", "User ID not found in authentication token"))
	}
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		FavoriteUserID string `json:"favorite_user_id"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if input.FavoriteUserID == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("FAVORITE_USER_ID_REQUIRED", "favoriteUserIdRequired", "favorite_user_id is required"))
	}
	if input.FavoriteUserID == uid {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("CANNOT_FAVORITE_SELF", "cannotFavoriteYourself", "Cannot favorite yourself"))
	}

	limitCheck, err := supax.CheckDailyFavoriteLimitReached(c.Request().Context(), uid)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_ADD_FAVORITE", "failedAddFavorite", "Failed to add favorite"))
	}
	if limitCheck.Reached {
		return httpx.SendErrorExtra(c, 429, "Too Many Requests",
			httpx.UM("DAILY_FAVORITE_LIMIT", "dailyFavoriteLimitReached", "Daily favorite limit reached"),
			map[string]interface{}{"current": limitCheck.Current, "limit": limitCheck.Limit})
	}

	exists, err := supax.CheckFavoriteExists(c.Request().Context(), uid, input.FavoriteUserID)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_ADD_FAVORITE", "failedAddFavorite", "Failed to add favorite"))
	}
	if exists {
		return httpx.SendError(c, 409, "Conflict",
			httpx.UM("ALREADY_IN_FAVORITES", "alreadyInFavorites", "User is already in favorites"))
	}

	row, err := supax.CreateFavorite(c.Request().Context(), uid, input.FavoriteUserID)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_ADD_FAVORITE", "failedAddFavorite", "Failed to add favorite"))
	}
	if err := supax.IncrementFavoriteLimit(c.Request().Context(), uid); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_ADD_FAVORITE", "failedAddFavorite", "Failed to add favorite"))
	}
	return httpx.SendUserMessage(c, http.StatusCreated, map[string]interface{}{"data": row},
		httpx.UM("USER_ADDED_FAVORITES", "userAddedToFavorites", "User added to favorites"))
}

func handleDeleteFavorite(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	if clerkID == "" {
		return httpx.SendError(c, 401, "Unauthorized",
			httpx.UM("USER_ID_NOT_IN_TOKEN", "userIdNotInToken", "User ID not found in authentication token"))
	}
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	target := c.Param("favorite_user_id")
	if target == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("FAVORITE_USER_ID_REQUIRED", "favoriteUserIdRequired", "favorite_user_id is required"))
	}

	exists, err := supax.CheckFavoriteExists(c.Request().Context(), uid, target)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_REMOVE_FAVORITE", "failedRemoveFavorite", "Failed to remove favorite"))
	}
	if !exists {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("FAVORITE_NOT_FOUND", "favoriteNotFound", "Favorite not found"))
	}

	createdAt, _ := supax.GetFavoriteCreationDate(c.Request().Context(), uid, target)
	today := time.Now().UTC().Format("2006-01-02")
	createdDate := ""
	if createdAt != "" {
		if idx := strings.Index(createdAt, "T"); idx > 0 {
			createdDate = createdAt[:idx]
		} else {
			createdDate = createdAt
		}
	}
	isSameDay := createdDate != "" && createdDate == today

	if err := supax.DeleteFavorite(c.Request().Context(), uid, target); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_REMOVE_FAVORITE", "failedRemoveFavorite", "Failed to remove favorite"))
	}

	if isSameDay {
		_ = supax.DecrementFavoriteLimit(c.Request().Context(), uid)
	}

	return httpx.SendUserMessage(c, http.StatusOK, map[string]interface{}{"refunded": isSameDay},
		httpx.UM("FAVORITE_REMOVED", "favoriteRemovedSuccess", "Favorite removed successfully"))
}

func nullable(s string) any {
	if s == "" {
		return nil
	}
	return s
}
