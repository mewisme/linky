package routes

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/app/broadcastai"
	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/supax"
)

func handleAdminBroadcastsList(c echo.Context) error {
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	offset, _ := strconv.Atoi(c.QueryParam("offset"))
	if offset < 0 {
		offset = 0
	}
	rows, count, err := supax.ListBroadcastHistory(c.Request().Context(), limit, offset)
	if err != nil {
		adminLog.Error().Err(err).Msg("ListBroadcastHistory failed")
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_BROADCASTS", "failedFetchBroadcasts", "Failed to fetch broadcasts"))
	}
	if rows == nil {
		rows = []supax.BroadcastHistoryRow{}
	}
	totalPages := int64(0)
	if limit > 0 {
		totalPages = (count + int64(limit) - 1) / int64(limit)
	}
	return c.JSON(http.StatusOK, map[string]any{
		"data": rows,
		"pagination": map[string]any{
			"limit":      limit,
			"offset":     offset,
			"total":      count,
			"totalPages": totalPages,
		},
	})
}

func handleAdminBroadcastsCreate(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Message      string `json:"message"`
		Title        string `json:"title"`
		DeliveryMode string `json:"deliveryMode"`
		URL          string `json:"url"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if input.Message == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("BROADCAST_MESSAGE_REQUIRED", "broadcastMessageRequired", "message is required"))
	}
	clerkID := httpx.MustClerkUserID(c)
	if clerkID == "" {
		return httpx.Unauthorized(c)
	}
	creatorID, err := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if err != nil {
		adminLog.Error().Err(err).Msg("GetUserInternalID failed")
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_USER", "failedFetchUser", "Failed to fetch user"))
	}
	if creatorID == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	row, err := supax.InsertBroadcastHistory(c.Request().Context(), creatorID, input.Title, input.Message)
	if err != nil {
		adminLog.Error().Err(err).Msg("InsertBroadcastHistory failed")
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_CREATE_BROADCAST", "failedCreateBroadcast", "Failed to create broadcast"))
	}
	if row == nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_CREATE_BROADCAST", "failedCreateBroadcast", "Failed to create broadcast"))
	}
	return c.JSON(http.StatusCreated, map[string]any{
		"message": "Broadcast saved",
		"sent":    0,
		"row":     row,
	})
}

func handleAdminBroadcastAIGenerate(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Audience  string `json:"audience"`
		KeyPoints string `json:"key_points"`
	}
	_ = json.Unmarshal(rawBody, &input)
	clerkID := httpx.MustClerkUserID(c)
	if clerkID == "" {
		return httpx.Unauthorized(c)
	}
	out, err := broadcastai.Generate(c.Request().Context(), broadcastai.GenerateParams{
		Audience:        strings.TrimSpace(input.Audience),
		KeyPoints:       strings.TrimSpace(input.KeyPoints),
		CreatedByUserID: clerkID,
	})
	if err != nil {
		if err == broadcastai.ErrInProgress {
			return httpx.SendError(c, 429, "Too Many Requests",
				httpx.UM("BROADCAST_AI_BUSY", "broadcastAiBusy", "Broadcast AI generation already in progress. Please retry shortly."))
		}
		return httpx.SendError(c, 502, "Bad Gateway",
			httpx.UM("BROADCAST_AI_FAILED", "broadcastAiFailed", err.Error()))
	}
	return c.JSON(http.StatusOK, out)
}
