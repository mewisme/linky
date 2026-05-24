package routes

import (
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/supax"
)

func handleCreateCallHistory(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
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
