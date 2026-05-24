package routes

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/jobs"
)

func handleAdminReportsList(c echo.Context) error {
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit <= 0 {
		limit = 50
	}
	offset, _ := strconv.Atoi(c.QueryParam("offset"))
	status := c.QueryParam("status")
	reporterUserID := c.QueryParam("reporter_user_id")
	reportedUserID := c.QueryParam("reported_user_id")
	rows, count, err := supax.ListAdminReports(
		c.Request().Context(),
		status,
		reporterUserID,
		reportedUserID,
		limit,
		offset,
	)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_REPORTS", "failedFetchReports", "Failed to fetch reports"))
	}
	if rows == nil {
		rows = []supax.ReportRow{}
	}
	return c.JSON(http.StatusOK, map[string]any{
		"data":   rows,
		"count":  count,
		"limit":  limit,
		"offset": offset,
	})
}

func handleAdminReportGet(c echo.Context) error {
	row, err := supax.GetReport(c.Request().Context(), c.Param("id"))
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_REPORT", "failedFetchReport", "Failed to fetch report"))
	}
	if row == nil {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("REPORT_NOT_FOUND", "reportNotFound", "Report not found"))
	}
	return c.JSON(http.StatusOK, row)
}

func handleAdminReportPatch(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var body map[string]any
	_ = json.Unmarshal(rawBody, &body)
	row, err := supax.PatchReport(c.Request().Context(), c.Param("id"), body)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_UPDATE_REPORT", "failedUpdateReport", "Failed to update report"))
	}
	return c.JSON(http.StatusOK, row)
}

func handleAdminReportAISummary(c echo.Context) error {
	id := c.Param("id")
	if id == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("REPORT_ID_REQUIRED", "reportIdRequired", "id required"))
	}
	if err := jobs.EnqueueReportAISummary(c.Request().Context(), id, true); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("REPORT_AI_ENQUEUE_FAIL", "reportAiEnqueueFail", "Failed to enqueue AI summary job"))
	}
	return c.JSON(http.StatusAccepted, map[string]any{
		"queued": true,
	})
}
