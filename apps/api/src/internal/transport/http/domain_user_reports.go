package routes

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/app/report"
	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/supax"
)

func registerReportsRoutes(g *echo.Group) {
	g.GET("", handleListReports)
	g.POST("", handleCreateReport)
}

func handleListReports(c echo.Context) error {
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
	rows, count, err := supax.ListReports(c.Request().Context(), uid, limit, offset)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_REPORTS", "failedFetchReports", "Failed to fetch reports"))
	}
	if rows == nil {
		rows = []supax.ReportRow{}
	}
	return c.JSON(http.StatusOK, map[string]any{"data": rows, "count": count})
}

func handleCreateReport(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
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
	if input.ReportedUserID == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("REPORT_TARGET_REQUIRED", "reportTargetRequired", "reported_user_id is required"))
	}
	if input.Reason == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("REPORT_REASON_REQUIRED", "reportReasonRequired", "reason is required"))
	}
	if input.ReportedUserID == uid {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UMDetail("REPORT_SELF", "Cannot report yourself"))
	}
	body := map[string]any{
		"reporter_user_id": uid,
		"reported_user_id": input.ReportedUserID,
		"reason":           input.Reason,
		"status":           "pending",
	}
	row, err := supax.CreateReport(c.Request().Context(), body)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_CREATE_REPORT", "failedCreateReport", "Failed to create report"))
	}
	if row != nil && input.Metadata != nil {
		_ = supax.CreateReportContext(c.Request().Context(), row.ID, input.Metadata)
	}
	if row != nil {
		go report.OnReportCreated(context.Background(), row.ID)
	}
	return c.JSON(http.StatusCreated, row)
}
