package routes

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/config"
	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/supax"
)

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

func RegisterQueueStatus(g *echo.Group, _ *config.Config) {
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
