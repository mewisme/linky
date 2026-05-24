package routes

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/expbonus"
	"linky-api/src/internal/infra/supax"
)

func registerAdminCRUD(g *echo.Group, prefix, table string, afterMutate ...func(context.Context)) {
	sub := g.Group(prefix)
	runAfterMutate := func(c echo.Context) {
		for _, fn := range afterMutate {
			if fn != nil {
				fn(c.Request().Context())
			}
		}
	}
	sub.GET("", func(c echo.Context) error {
		limit, _ := strconv.Atoi(c.QueryParam("limit"))
		if limit <= 0 {
			limit = 50
		}
		offset, _ := strconv.Atoi(c.QueryParam("offset"))
		rows, count, err := supax.ListGenericTable(c.Request().Context(), table, limit, offset)
		if err != nil {
			return httpx.SendError(c, 500, "Internal Server Error",
				httpx.UM("FAILED_FETCH_TABLE", "failedFetchTable", "Failed to fetch records"))
		}
		if rows == nil {
			rows = []map[string]any{}
		}
		return c.JSON(http.StatusOK, map[string]any{"data": rows, "count": count})
	})
	sub.GET("/:id", func(c echo.Context) error {
		row, err := supax.GetGeneric(c.Request().Context(), table, c.Param("id"))
		if err != nil {
			return httpx.SendError(c, 500, "Internal Server Error",
				httpx.UM("FAILED_FETCH_RECORD", "failedFetchRecord", "Failed to fetch record"))
		}
		if row == nil {
			return httpx.SendError(c, 404, "Not Found",
				httpx.UM("RECORD_NOT_FOUND", "recordNotFound", "Record not found"))
		}
		return c.JSON(http.StatusOK, row)
	})
	sub.POST("", func(c echo.Context) error {
		rawBody, _ := io.ReadAll(c.Request().Body)
		var body map[string]any
		_ = json.Unmarshal(rawBody, &body)
		row, err := supax.InsertGeneric(c.Request().Context(), table, body)
		if err != nil {
			return httpx.SendError(c, 500, "Internal Server Error",
				httpx.UM("FAILED_INSERT_RECORD", "failedInsertRecord", "Failed to insert record"))
		}
		runAfterMutate(c)
		return c.JSON(http.StatusCreated, row)
	})
	sub.PUT("/:id", func(c echo.Context) error {
		rawBody, _ := io.ReadAll(c.Request().Body)
		var body map[string]any
		_ = json.Unmarshal(rawBody, &body)
		row, err := supax.PatchGeneric(c.Request().Context(), table, c.Param("id"), body)
		if err != nil {
			return httpx.SendError(c, 500, "Internal Server Error",
				httpx.UM("FAILED_PATCH_RECORD", "failedPatchRecord", "Failed to update record"))
		}
		runAfterMutate(c)
		return c.JSON(http.StatusOK, row)
	})
	sub.PATCH("/:id", func(c echo.Context) error {
		rawBody, _ := io.ReadAll(c.Request().Body)
		var body map[string]any
		_ = json.Unmarshal(rawBody, &body)
		row, err := supax.PatchGeneric(c.Request().Context(), table, c.Param("id"), body)
		if err != nil {
			return httpx.SendError(c, 500, "Internal Server Error",
				httpx.UM("FAILED_PATCH_RECORD", "failedPatchRecord", "Failed to update record"))
		}
		runAfterMutate(c)
		return c.JSON(http.StatusOK, row)
	})
	sub.DELETE("/:id", func(c echo.Context) error {
		if err := supax.DeleteGeneric(c.Request().Context(), table, c.Param("id")); err != nil {
			return httpx.SendError(c, 500, "Internal Server Error",
				httpx.UM("FAILED_DELETE_RECORD", "failedDeleteRecord", "Failed to delete record"))
		}
		runAfterMutate(c)
		return c.NoContent(http.StatusNoContent)
	})
}

func refreshExpBonusesAfterAdminMutate(ctx context.Context) {
	if err := expbonus.Reload(ctx); err != nil {
		adminLog.Warn().Err(err).Msg("EXP bonus reload after admin mutate failed")
	}
}
