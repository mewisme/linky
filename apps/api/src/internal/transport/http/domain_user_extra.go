package routes

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/app/report"
	"linky-api/src/internal/app/user"
	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/lib/plaintext"
)

func registerUserDetailsRoutes(g *echo.Group) {
	g.GET("/me", handleUserDetailsGet)
	g.PUT("/me", handleUserDetailsPut)
	g.PATCH("/me", handleUserDetailsPatch)
	g.POST("/me/interest-tags", handleAddInterestTags)
	g.DELETE("/me/interest-tags", handleRemoveInterestTags)
	g.PUT("/me/interest-tags", handleReplaceInterestTags)
	g.DELETE("/me/interest-tags/all", handleClearInterestTags)
}

func handleUserDetailsGet(c echo.Context) error {
	clerkID, err := httpx.RequireClerkUser(c)
	if err != nil {
		return err
	}
	uid, _ := user.InternalIDFromClerk(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	details, err := user.GetDetailsWithTags(c.Request().Context(), uid)
	if err != nil {
		return sendUserStatusError(c, err)
	}
	return c.JSON(http.StatusOK, details)
}

func handleUserDetailsPut(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := user.InternalIDFromClerk(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	raw, _ := io.ReadAll(c.Request().Body)
	var body map[string]any
	_ = json.Unmarshal(raw, &body)
	details, err := user.PutDetails(c.Request().Context(), uid, body)
	if err != nil {
		return sendUserStatusError(c, err)
	}
	return c.JSON(http.StatusOK, details)
}

func handleUserDetailsPatch(c echo.Context) error {
	return handleUserDetailsPut(c)
}

func handleAddInterestTags(c echo.Context) error {
	return mutateInterestTagsHandler(c, "add")
}

func handleRemoveInterestTags(c echo.Context) error {
	return mutateInterestTagsHandler(c, "remove")
}

func handleReplaceInterestTags(c echo.Context) error {
	return mutateInterestTagsHandler(c, "replace")
}

func handleClearInterestTags(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := user.InternalIDFromClerk(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	details, err := user.ClearInterestTags(c.Request().Context(), uid)
	if err != nil {
		return sendUserStatusError(c, err)
	}
	return c.JSON(http.StatusOK, details)
}

func mutateInterestTagsHandler(c echo.Context, mode string) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := user.InternalIDFromClerk(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		TagIDs []string `json:"tagIds"`
	}
	_ = json.Unmarshal(rawBody, &input)
	details, err := user.MutateInterestTags(c.Request().Context(), uid, mode, input.TagIDs)
	if err != nil {
		return sendUserStatusError(c, err)
	}
	return c.JSON(http.StatusOK, details)
}

func registerUserSettingsRoutes(g *echo.Group) {
	g.GET("/me", handleUserSettingsGet)
	g.PUT("/me", handleUserSettingsPut)
	g.PATCH("/me", handleUserSettingsPut)
}

func handleUserSettingsGet(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := user.InternalIDFromClerk(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	settings, err := user.GetSettings(c.Request().Context(), uid)
	if err != nil {
		return sendUserStatusError(c, err)
	}
	return c.JSON(http.StatusOK, settings)
}

func handleUserSettingsPut(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := user.InternalIDFromClerk(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	raw, _ := io.ReadAll(c.Request().Body)
	var body map[string]any
	_ = json.Unmarshal(raw, &body)
	out, err := user.PutSettings(c.Request().Context(), uid, body)
	if err != nil {
		return sendUserStatusError(c, err)
	}
	return c.JSON(http.StatusOK, out)
}

func registerUserProfileRoutes(g *echo.Group) {
	g.GET("/me", handleUserProfileGet)
}

func handleUserProfileGet(c echo.Context) error {
	clerkID, err := httpx.RequireClerkUser(c)
	if err != nil {
		return err
	}
	profile, err := user.GetProfileAggregate(c.Request().Context(), clerkID)
	if err != nil {
		return sendUserStatusError(c, err)
	}
	return c.JSON(http.StatusOK, profile)
}

func handleStreakHistory(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := user.InternalIDFromClerk(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("STREAK_LIMIT_RANGE", "limitBetween1And100", "Limit must be between 1 and 100"))
	}
	offset, _ := strconv.Atoi(c.QueryParam("offset"))
	if offset < 0 {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("STREAK_OFFSET_NONNEG", "offsetNonNegative", "Offset must be a non-negative number"))
	}
	rows, count, err := supax.GetUserStreakDays(c.Request().Context(), uid, limit, offset)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_STREAK_HISTORY", "failedFetchStreakHistory", "Failed to fetch user streak history"))
	}
	if rows == nil {
		rows = []supax.UserStreakDayRow{}
	}
	out := make([]map[string]any, 0, len(rows))
	for _, r := range rows {
		out = append(out, map[string]any{
			"id":               r.ID,
			"userId":           r.UserID,
			"date":             r.Date,
			"totalCallSeconds": r.TotalCallSeconds,
			"isValid":          r.IsValid,
			"createdAt":        r.CreatedAt,
		})
	}
	return c.JSON(http.StatusOK, map[string]any{"data": out, "count": count})
}

func handleStreakCalendar(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := user.InternalIDFromClerk(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	year, _ := strconv.Atoi(c.QueryParam("year"))
	month, _ := strconv.Atoi(c.QueryParam("month"))
	if year == 0 {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("YEAR_QUERY_REQUIRED", "yearQueryRequired", "Year query parameter is required and must be a number"))
	}
	if month == 0 {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("MONTH_QUERY_REQUIRED", "monthQueryRequired", "Month query parameter is required and must be a number"))
	}
	if month < 1 || month > 12 {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("MONTH_RANGE", "monthBetween1And12", "Month must be between 1 and 12"))
	}
	rows, err := supax.GetUserStreakDaysByMonth(c.Request().Context(), uid, year, month)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_STREAK_CAL", "failedFetchStreakCalendar", "Failed to fetch user streak calendar"))
	}
	tz, _ := supax.GetUserTimezone(c.Request().Context(), uid)
	if tz == "" {
		tz = "UTC"
	}
	loc, err := time.LoadLocation(tz)
	if err != nil {
		loc = time.UTC
	}
	todayStr := time.Now().In(loc).Format("2006-01-02")
	out := make([]map[string]any, 0, len(rows))
	for _, r := range rows {
		out = append(out, map[string]any{
			"date":             r.Date,
			"isValid":          r.IsValid,
			"totalCallSeconds": r.TotalCallSeconds,
			"isToday":          r.Date == todayStr,
		})
	}
	return c.JSON(http.StatusOK, out)
}

func registerReportsRoutes(g *echo.Group) {
	g.GET("", handleListReports)
	g.POST("", handleCreateReport)
}

func handleListReports(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := user.InternalIDFromClerk(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit <= 0 {
		limit = 20
	}
	offset, _ := strconv.Atoi(c.QueryParam("offset"))
	rows, count, err := report.ListReports(c.Request().Context(), uid, limit, offset)
	if err != nil {
		return sendReportStatusError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]any{"data": rows, "count": count})
}

func handleCreateReport(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := user.InternalIDFromClerk(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		ReportedUserID string         `json:"reported_user_id"`
		Reason         string         `json:"reason"`
		Description    string         `json:"description"`
		Metadata       map[string]any `json:"metadata"`
	}
	_ = json.Unmarshal(rawBody, &input)
	row, err := report.CreateReport(c.Request().Context(), report.CreateReportInput{
		ReporterUserID: uid,
		ReportedUserID: input.ReportedUserID,
		Reason:         input.Reason,
		Description:    input.Description,
		Metadata:       input.Metadata,
	})
	if err != nil {
		return sendReportStatusError(c, err)
	}
	if row != nil {
		go report.OnReportCreated(context.Background(), row.ID)
	}
	return c.JSON(http.StatusCreated, row)
}

func registerFavoritesRoutes(g *echo.Group) {
	g.GET("", handleListFavorites)
	g.POST("", handleCreateFavorite)
	g.DELETE("/:favorite_user_id", handleDeleteFavorite)
}

func handleListFavorites(c echo.Context) error {
	clerkID, err := httpx.RequireClerkUser(c)
	if err != nil {
		return err
	}
	uid, _ := user.InternalIDFromClerk(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	rows, err := user.ListFavorites(c.Request().Context(), uid)
	if err != nil {
		return sendUserStatusError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]any{
		"data":  rows,
		"count": len(rows),
	})
}

func handleCreateFavorite(c echo.Context) error {
	clerkID, err := httpx.RequireClerkUser(c)
	if err != nil {
		return err
	}
	uid, _ := user.InternalIDFromClerk(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		FavoriteUserID string `json:"favorite_user_id"`
	}
	_ = json.Unmarshal(rawBody, &input)
	payload, err := user.CreateFavorite(c.Request().Context(), uid, input.FavoriteUserID)
	if err != nil {
		return sendUserStatusError(c, err)
	}
	return httpx.SendUserMessage(c, http.StatusCreated, payload,
		httpx.UM("USER_ADDED_FAVORITES", "userAddedToFavorites", "User added to favorites"))
}

func handleDeleteFavorite(c echo.Context) error {
	clerkID, err := httpx.RequireClerkUser(c)
	if err != nil {
		return err
	}
	uid, _ := user.InternalIDFromClerk(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	target := c.Param("favorite_user_id")
	refunded, err := user.DeleteFavorite(c.Request().Context(), uid, target)
	if err != nil {
		return sendUserStatusError(c, err)
	}
	return httpx.SendUserMessage(c, http.StatusOK, map[string]interface{}{"refunded": refunded},
		httpx.UM("FAVORITE_REMOVED", "favoriteRemovedSuccess", "Favorite removed successfully"))
}

func handleCreateCallHistory(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := user.InternalIDFromClerk(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		CallerID        string `json:"caller_id"`
		CalleeID        string `json:"callee_id"`
		StartedAt       string `json:"started_at"`
		EndedAt         string `json:"ended_at"`
		DurationSeconds *int   `json:"duration_seconds"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if input.CallerID == "" || input.CalleeID == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("CALLER_CALLEE_REQUIRED", "callerCalleeRequired", "caller_id and callee_id are required"))
	}
	if input.CallerID != uid && input.CalleeID != uid {
		return httpx.SendError(c, 403, "Forbidden",
			httpx.UM("CALL_HISTORY_SELF_ONLY", "callHistorySelfOnly", "You can only create call history records for yourself"))
	}
	startedAt := time.Now()
	if input.StartedAt != "" {
		if t, err := time.Parse(time.RFC3339, input.StartedAt); err == nil {
			startedAt = t
		}
	}
	var endedAt *time.Time
	if input.EndedAt != "" {
		if t, err := time.Parse(time.RFC3339, input.EndedAt); err == nil {
			endedAt = &t
		}
	}
	callerCountry, _ := supax.GetUserCountry(c.Request().Context(), input.CallerID)
	calleeCountry, _ := supax.GetUserCountry(c.Request().Context(), input.CalleeID)
	row, err := supax.CreateCallHistory(c.Request().Context(), supax.CreateCallHistoryParams{
		CallerID:        input.CallerID,
		CalleeID:        input.CalleeID,
		CallerCountry:   callerCountry,
		CalleeCountry:   calleeCountry,
		StartedAt:       startedAt,
		EndedAt:         endedAt,
		DurationSeconds: input.DurationSeconds,
	})
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_CREATE_CALL_HISTORY", "failedCreateCallHistory", "Failed to create call history"))
	}
	return c.JSON(http.StatusCreated, row)
}

func nullable(s string) any {
	if s == "" {
		return nil
	}
	return s
}
