package routes

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/domains/user/progress"
	"linky-api/src/internal/domains/user/userservice"
	"linky-api/src/internal/domains/videochat/callservice"
	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/logger"
)

var domainLog = logger.New("api:domain:routes")

func registerUserRoutes(g *echo.Group) {
	g.GET("/me", handleUserMe)
	g.PATCH("/me/country", handleUpdateMeCountry)
	g.PATCH("/timezone", handleUpdateTimezone)
	g.GET("/level/me", handleUserLevelMe)
	g.GET("/streak/me", handleUserStreakMe)
	g.GET("/streak/me/history", handleStreakHistory)
	g.GET("/streak/calendar", handleStreakCalendar)
	g.GET("/progress/me", handleUserProgressMe)
	g.GET("/blocks/me", handleBlocksMe)
	g.POST("/blocks", handleCreateBlock)
	g.DELETE("/blocks/:blocked_user_id", handleDeleteBlock)

	registerUserDetailsRoutes(g.Group("/details"))
	registerUserSettingsRoutes(g.Group("/settings"))
	registerUserProfileRoutes(g.Group("/profile"))
}

func handleEmptyObject(c echo.Context) error { return c.JSON(http.StatusOK, map[string]any{}) }
func handleEmptyArray(c echo.Context) error  { return c.JSON(http.StatusOK, []any{}) }
func handleNoOp(c echo.Context) error        { return c.JSON(http.StatusOK, map[string]any{"success": true}) }
func handleEmptyHistory(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]any{"data": []any{}, "count": 0})
}

func handleUserMe(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	if clerkID == "" {
		return httpx.SendError(c, 401, "Unauthorized",
			httpx.UM("USER_ID_NOT_IN_TOKEN", "userIdNotInToken", "User ID not found in authentication token"))
	}
	user, err := supax.GetUserByClerkID(c.Request().Context(), clerkID)
	if err != nil {
		domainLog.Error().Err(err).Msg("fetch user by clerk id")
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_USER_DATA", "failedFetchUserData", "Failed to fetch user data"))
	}
	if user == nil {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	if user.Country == nil || *user.Country == "" {
		country := strings.TrimSpace(c.Request().Header.Get("cf-ipcountry"))
		if country == "" {
			country = strings.TrimSpace(c.Request().Header.Get("x-cf-ipcountry"))
		}
		if country != "" {
			updated, err := supax.UpdateUserCountry(c.Request().Context(), clerkID, country)
			if err == nil && updated != nil {
				return c.JSON(http.StatusOK, updated)
			}
		}
	}
	return c.JSON(http.StatusOK, user)
}

func handleUpdateMeCountry(c echo.Context) error {
	body, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Country     string `json:"country"`
		ClerkUserID string `json:"clerk_user_id"`
	}
	_ = json.Unmarshal(body, &input)
	if input.ClerkUserID == "" {
		return httpx.SendError(c, 401, "Unauthorized",
			httpx.UM("USER_ID_NOT_IN_TOKEN", "userIdNotInToken", "User ID not found in authentication token"))
	}
	if input.Country == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("COUNTRY_REQUIRED", "countryRequiredString", "Country is required and must be a string"))
	}
	updated, err := supax.UpdateUserCountry(c.Request().Context(), input.ClerkUserID, input.Country)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_UPDATE_COUNTRY", "failedUpdateUserCountry", "Failed to update user country"))
	}
	if updated == nil {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	return c.JSON(http.StatusOK, updated)
}

func handleUpdateTimezone(c echo.Context) error {
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
	body, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Timezone string `json:"timezone"`
	}
	_ = json.Unmarshal(body, &input)
	tz := strings.TrimSpace(input.Timezone)
	if tz == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("TIMEZONE_INVALID", "timezoneInvalidIana", "timezone must be a valid IANA timezone string"))
	}
	return c.JSON(http.StatusOK, map[string]any{"timezone": tz})
}

func handleUserLevelMe(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	data, err := userservice.GetUserLevelData(c.Request().Context(), uid)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_LEVEL", "failedFetchUserLevel", "Failed to fetch user level"))
	}
	if data == nil {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_LEVEL_NOT_FOUND", "userLevelNotFound", "User level data not found"))
	}
	return c.JSON(http.StatusOK, data)
}

func handleUserStreakMe(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	data, err := userservice.GetUserStreakData(c.Request().Context(), uid)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_STREAK", "failedFetchUserStreak", "Failed to fetch user streak"))
	}
	if data == nil {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_STREAK_NOT_FOUND", "userStreakNotFound", "User streak data not found"))
	}
	return c.JSON(http.StatusOK, data)
}

func handleUserProgressMe(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	tz, _ := supax.GetUserTimezone(c.Request().Context(), uid)
	if tz == "" {
		tz = "UTC"
	}
	insights, err := progress.GetInsights(c.Request().Context(), uid, tz)
	if err != nil {
		domainLog.Error().Err(err).Msg("user progress insights failed")
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_PROGRESS", "failedFetchUserProgress", "Failed to fetch user progress"))
	}
	if insights == nil {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_PROGRESS_NOT_FOUND", "userProgressNotFound", "User progress data not found"))
	}
	return c.JSON(http.StatusOK, insights)
}

func handleBlocksMe(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	rows, err := supax.GetBlockedUsersWithDetails(c.Request().Context(), uid)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_BLOCKED", "failedFetchBlockedUsers", "Failed to fetch blocked users"))
	}
	if rows == nil {
		rows = []map[string]any{}
	}
	return c.JSON(http.StatusOK, map[string]any{"blocked_users": rows})
}

func handleCreateBlock(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	body, _ := io.ReadAll(c.Request().Body)
	var input struct {
		BlockedUserID string `json:"blocked_user_id"`
	}
	_ = json.Unmarshal(body, &input)
	if input.BlockedUserID == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("BLOCKED_USER_ID_REQUIRED", "blockedUserIdRequired", "blocked_user_id is required"))
	}
	if input.BlockedUserID == uid {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UMDetail("BLOCK_VALIDATION", "Cannot block yourself"))
	}
	exists, _ := supax.CheckBlockExists(c.Request().Context(), uid, input.BlockedUserID)
	if exists {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UMDetail("BLOCK_VALIDATION", "User is already blocked"))
	}
	row, err := supax.CreateBlock(c.Request().Context(), uid, input.BlockedUserID)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_BLOCK_USER", "failedBlockUser", "Failed to block user"))
	}
	return c.JSON(http.StatusCreated, row)
}

func handleDeleteBlock(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	blocked := c.Param("blocked_user_id")
	if blocked == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("BLOCKED_USER_ID_REQUIRED", "blockedUserIdRequired", "blocked_user_id is required"))
	}
	exists, _ := supax.CheckBlockExists(c.Request().Context(), uid, blocked)
	if !exists {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UMDetail("NOT_BLOCKED", "User is not blocked"))
	}
	if err := supax.DeleteBlock(c.Request().Context(), uid, blocked); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_UNBLOCK_USER", "failedUnblockUser", "Failed to unblock user"))
	}
	return c.NoContent(http.StatusNoContent)
}

func registerCallHistoryRoutes(g *echo.Group) {
	g.GET("", handleListCallHistory)
	g.GET("/:id", handleGetCallHistoryItem)
	g.POST("", handleCreateCallHistory)
}

func handleListCallHistory(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit <= 0 {
		limit = 50
	}
	offset, _ := strconv.Atoi(c.QueryParam("offset"))
	rows, count, err := callservice.ListCallHistory(c.Request().Context(), uid, limit, offset)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_CALL_HISTORY", "failedFetchCallHistory", "Failed to fetch call history"))
	}
	return c.JSON(http.StatusOK, map[string]any{
		"data":   rows,
		"count":  count,
		"limit":  limit,
		"offset": offset,
	})
}

func handleGetCallHistoryItem(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	id := c.Param("id")
	if id == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("CALL_HISTORY_ID_REQUIRED", "callHistoryIdRequired", "Call history ID is required"))
	}
	row, err := supax.GetCallHistoryByID(c.Request().Context(), id)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_CALL_HISTORY", "failedFetchCallHistory", "Failed to fetch call history"))
	}
	if row == nil {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("CALL_HISTORY_NOT_FOUND", "callHistoryNotFound", "Call history record not found"))
	}
	if row.CallerID != uid && row.CalleeID != uid {
		return httpx.SendError(c, 403, "Forbidden",
			httpx.UM("NO_ACCESS_CALL_HISTORY", "noAccessCallHistory", "You do not have access to this call history record"))
	}
	return c.JSON(http.StatusOK, row)
}

func registerNotificationsRoutes(g *echo.Group) {
	g.GET("/me", handleListNotifications)
	g.GET("/me/unread-count", handleUnreadCount)
	g.PATCH("/:id/read", handleMarkRead)
	g.PATCH("/read-all", handleMarkAllRead)
}

func handleListNotifications(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit <= 0 {
		limit = 20
	}
	offset, _ := strconv.Atoi(c.QueryParam("offset"))
	unreadOnly := c.QueryParam("unread_only") == "true"
	rows, _, err := supax.GetUserNotifications(c.Request().Context(), uid, limit, offset, unreadOnly)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_NOTIFICATIONS", "failedFetchNotifications", "Failed to fetch notifications"))
	}
	if rows == nil {
		rows = []supax.NotificationRow{}
	}
	return c.JSON(http.StatusOK, map[string]any{"notifications": rows})
}

func handleUnreadCount(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	count, err := supax.GetUnreadNotificationCount(c.Request().Context(), uid)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_UNREAD", "failedFetchUnreadCount", "Failed to fetch unread count"))
	}
	return c.JSON(http.StatusOK, map[string]any{"count": count})
}

func handleMarkRead(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	id := c.Param("id")
	if id == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("NOTIFICATION_ID_REQUIRED", "notificationIdRequired", "Notification ID is required"))
	}
	if err := supax.MarkNotificationRead(c.Request().Context(), id, uid); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_MARK_READ", "failedMarkNotificationRead", "Failed to mark notification as read"))
	}
	return c.NoContent(http.StatusNoContent)
}

func handleMarkAllRead(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	if err := supax.MarkAllNotificationsRead(c.Request().Context(), uid); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_MARK_ALL_READ", "failedMarkAllRead", "Failed to mark all notifications as read"))
	}
	return c.NoContent(http.StatusNoContent)
}
