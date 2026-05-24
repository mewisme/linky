package routes

import (
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/supax"
)

func handleStreakHistory(c echo.Context) error {
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
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
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
