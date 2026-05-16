package routes

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"linky-api/src-go/internal/config"
	"linky-api/src-go/internal/httpx"
	"linky-api/src-go/internal/infra/supax"
	"linky-api/src-go/internal/logger"
)

var iceLog = logger.New("routes:media:ice-servers")

func RegisterICE(g *echo.Group, cfg *config.Config) {
	g.GET("/ice-servers", func(c echo.Context) error {
		if cfg.CloudflareTurnAPIToken == "" || cfg.CloudflareTurnKeyID == "" {
			iceLog.Error().Msg("Cloudflare TURN credentials not configured")
			return httpx.SendError(c, http.StatusInternalServerError, "ICE server configuration not available",
				httpx.UM("ICE_SERVER_CONFIG", "serverConfigError", "Server configuration error"))
		}
		url := "https://rtc.live.cloudflare.com/v1/turn/keys/" + cfg.CloudflareTurnKeyID + "/credentials/generate-ice-servers"
		body, _ := json.Marshal(map[string]int{"ttl": 300})
		req, err := http.NewRequestWithContext(c.Request().Context(), "POST", url, bytes.NewReader(body))
		if err != nil {
			return httpx.SendError(c, http.StatusInternalServerError, "Internal server error",
				httpx.UM("FAILED_FETCH_ICE", "failedFetchIceServers", "Failed to fetch ICE servers"))
		}
		req.Header.Set("Authorization", "Bearer "+cfg.CloudflareTurnAPIToken)
		req.Header.Set("Content-Type", "application/json")
		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			ne := &netErr{}
			if errors.As(err, &ne) || strings.Contains(err.Error(), "timeout") || strings.Contains(err.Error(), "deadline exceeded") {
				return httpx.SendError(c, http.StatusGatewayTimeout, "Request timeout",
					httpx.UM("ICE_REQUEST_TIMEOUT", "iceRequestTimeout", "ICE server request timed out"))
			}
			iceLog.Error().Err(err).Msg("Error fetching ICE servers")
			return httpx.SendError(c, http.StatusInternalServerError, "Internal server error",
				httpx.UM("FAILED_FETCH_ICE", "failedFetchIceServers", "Failed to fetch ICE servers"))
		}
		defer resp.Body.Close()
		raw, _ := io.ReadAll(resp.Body)
		if resp.StatusCode >= 400 {
			iceLog.Error().Int("status", resp.StatusCode).Str("body", string(raw)).Msg("Cloudflare TURN API error")
			return httpx.SendError(c, resp.StatusCode, "Failed to fetch ICE servers",
				httpx.UM("EXTERNAL_API_ERROR", "externalApiError", "External API error"))
		}
		c.Response().Header().Set("Content-Type", "application/json")
		return c.JSONBlob(http.StatusOK, raw)
	})
}

type netErr struct{}

func (n *netErr) Error() string { return "" }

func RegisterInterestTagsPublic(g *echo.Group) {
	g.GET("", func(c echo.Context) error {
		category := c.QueryParam("category")
		search := c.QueryParam("search")
		limit, _ := strconv.Atoi(c.QueryParam("limit"))
		if limit == 0 || limit > 200 {
			limit = 100
		}
		offset, _ := strconv.Atoi(c.QueryParam("offset"))
		rows, count, err := supax.GetInterestTags(c.Request().Context(), category, search, true, limit, offset)
		if err != nil {
			return httpx.SendError(c, http.StatusInternalServerError, "Internal Server Error",
				httpx.UM("FAILED_FETCH_INTEREST_TAGS", "failedFetchInterestTags", "Failed to fetch interest tags"))
		}
		if rows == nil {
			rows = []supax.InterestTagRow{}
		}
		totalPages := int64(0)
		if limit > 0 {
			totalPages = (count + int64(limit) - 1) / int64(limit)
		}
		return c.JSON(http.StatusOK, map[string]interface{}{
			"data": rows,
			"pagination": map[string]interface{}{
				"limit":      limit,
				"offset":     offset,
				"total":      count,
				"totalPages": totalPages,
			},
		})
	})
	g.GET("/:id", func(c echo.Context) error {
		row, err := supax.GetInterestTagByID(c.Request().Context(), c.Param("id"))
		if err != nil {
			return httpx.SendError(c, http.StatusInternalServerError, "Internal Server Error",
				httpx.UM("FAILED_FETCH_INTEREST_TAG", "failedFetchInterestTag", "Failed to fetch interest tag"))
		}
		if row == nil || !row.IsActive {
			return httpx.SendError(c, http.StatusNotFound, "Not Found",
				httpx.UM("INTEREST_TAG_NOT_FOUND", "interestTagNotFound", "Interest tag not found"))
		}
		return c.JSON(http.StatusOK, row)
	})
}

func RegisterQueueStatus(g *echo.Group, cfg *config.Config) {
	g.GET("/queue-status", func(c echo.Context) error {
		size := QueueSizeFn()
		var wait *int
		if size >= 2 {
			est := 30 - size*3
			if est < 5 {
				est = 5
			}
			wait = &est
		}
		return c.JSON(http.StatusOK, map[string]interface{}{
			"queueSize":            size,
			"estimatedWaitSeconds": wait,
		})
	})
}

var QueueSizeFn = func() int { return 0 }
