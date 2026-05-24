package routes

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/supax"
)

func RegisterVideoFilterPresetsPublic(g *echo.Group) {
	g.GET("", func(c echo.Context) error {
		limit, _ := strconv.Atoi(c.QueryParam("limit"))
		if limit <= 0 || limit > 200 {
			limit = 100
		}
		offset, _ := strconv.Atoi(c.QueryParam("offset"))
		rows, count, err := supax.GetVideoFilterPresets(c.Request().Context(), limit, offset)
		if err != nil {
			return httpx.SendError(c, http.StatusInternalServerError, "Internal Server Error",
				httpx.UM("FAILED_FETCH_VIDEO_FILTER_PRESETS", "failedFetchVideoFilterPresets", "Failed to fetch video filter presets"))
		}
		if rows == nil {
			rows = []supax.VideoFilterPresetPublicRow{}
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
		row, err := supax.GetVideoFilterPresetByID(c.Request().Context(), c.Param("id"))
		if err != nil {
			return httpx.SendError(c, http.StatusInternalServerError, "Internal Server Error",
				httpx.UM("FAILED_FETCH_VIDEO_FILTER_PRESET", "failedFetchVideoFilterPreset", "Failed to fetch video filter preset"))
		}
		if row == nil {
			return httpx.SendError(c, http.StatusNotFound, "Not Found",
				httpx.UM("VIDEO_FILTER_PRESET_NOT_FOUND", "videoFilterPresetNotFound", "Video filter preset not found"))
		}
		return c.JSON(http.StatusOK, row)
	})
}
