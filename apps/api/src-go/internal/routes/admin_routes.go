package routes

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	"linky-api/src-go/internal/httpx"
	"linky-api/src-go/internal/infra/supax"
)

func registerAdminRoutes(g *echo.Group) {
	g.GET("/config", handleAdminConfigList)
	g.PATCH("/config/:key", handleAdminConfigUpsert)

	g.GET("/users", handleAdminUserList)
	g.GET("/users/:id", handleAdminUserGet)
	g.PATCH("/users/:id", handleAdminUserPatch)
	g.DELETE("/users/:id", handleAdminUserSoftDelete)

	registerAdminCRUD(g, "/interest-tags", "interest_tags")
	registerAdminCRUD(g, "/level-rewards", "level_rewards")
	registerAdminCRUD(g, "/level-feature-unlocks", "level_feature_unlocks")
	registerAdminCRUD(g, "/streak-exp-bonuses", "streak_exp_bonuses")
	registerAdminCRUD(g, "/broadcasts", "broadcasts")
	registerAdminCRUD(g, "/media", "admin_media")

	g.POST("/interest-tags/import", handleAdminImportInterestTags)

	g.GET("/embeddings", handleAdminEmbeddings)
	g.POST("/embeddings/regenerate", handleAdminEmbeddingsRegenerate)

	g.POST("/s3/presign-upload", handleAdminS3PresignUpload)
	g.POST("/s3/presign-download", handleAdminS3PresignDownload)
	g.POST("/s3/delete", handleAdminS3Delete)

	g.GET("/reports", handleAdminReportsList)
	g.GET("/reports/:id", handleAdminReportGet)
	g.PATCH("/reports/:id", handleAdminReportPatch)
	g.POST("/reports/:id/ai-summary", handleAdminReportAISummary)
}

func handleAdminConfigList(c echo.Context) error {
	rows, err := supax.ListAdminConfig(c.Request().Context())
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_ADMIN_CONFIG", "failedFetchAdminConfig", "Failed to fetch admin config"))
	}
	if rows == nil {
		rows = []supax.AdminConfigRow{}
	}
	return c.JSON(http.StatusOK, map[string]any{"data": rows})
}

func handleAdminConfigUpsert(c echo.Context) error {
	key := c.Param("key")
	if key == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("ADMIN_CONFIG_KEY_REQUIRED", "adminConfigKeyRequired", "key required"))
	}
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Value map[string]any `json:"value"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if input.Value == nil {
		input.Value = map[string]any{}
	}
	row, err := supax.UpsertAdminConfig(c.Request().Context(), key, input.Value)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_UPSERT_ADMIN_CONFIG", "failedUpsertAdminConfig", "Failed to upsert admin config"))
	}
	return c.JSON(http.StatusOK, row)
}

func handleAdminUserList(c echo.Context) error {
	page, _ := strconv.Atoi(c.QueryParam("page"))
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	role := c.QueryParam("role")
	search := c.QueryParam("search")
	deletedQ := c.QueryParam("deleted")
	var deleted *bool
	if deletedQ != "" {
		v := deletedQ == "true"
		deleted = &v
	}
	rows, count, err := supax.ListAdminUsers(c.Request().Context(), supax.AdminUsersOptions{
		Page: page, Limit: limit, Role: role, Search: search, Deleted: deleted,
	})
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_USERS", "failedFetchUsers", "Failed to fetch users"))
	}
	if rows == nil {
		rows = []map[string]any{}
	}
	return c.JSON(http.StatusOK, map[string]any{"data": rows, "count": count})
}

func handleAdminUserGet(c echo.Context) error {
	id := c.Param("id")
	row, err := supax.GetUserByID(c.Request().Context(), id)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_USER", "failedFetchUser", "Failed to fetch user"))
	}
	if row == nil {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	return c.JSON(http.StatusOK, row)
}

func handleAdminUserPatch(c echo.Context) error {
	id := c.Param("id")
	rawBody, _ := io.ReadAll(c.Request().Body)
	var body map[string]any
	_ = json.Unmarshal(rawBody, &body)
	if body == nil {
		body = map[string]any{}
	}
	row, err := supax.PatchUser(c.Request().Context(), id, body)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_UPDATE_USER", "failedUpdateUser", "Failed to update user"))
	}
	return c.JSON(http.StatusOK, row)
}

func handleAdminUserSoftDelete(c echo.Context) error {
	id := c.Param("id")
	body := map[string]any{
		"deleted":    true,
		"deleted_at": supax.NowRFC3339(),
	}
	if _, err := supax.PatchUser(c.Request().Context(), id, body); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_DELETE_USER", "failedDeleteUser", "Failed to delete user"))
	}
	return c.NoContent(http.StatusNoContent)
}

func registerAdminCRUD(g *echo.Group, prefix, table string) {
	sub := g.Group(prefix)
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
	sub.POST("", func(c echo.Context) error {
		rawBody, _ := io.ReadAll(c.Request().Body)
		var body map[string]any
		_ = json.Unmarshal(rawBody, &body)
		row, err := supax.InsertGeneric(c.Request().Context(), table, body)
		if err != nil {
			return httpx.SendError(c, 500, "Internal Server Error",
				httpx.UM("FAILED_INSERT_RECORD", "failedInsertRecord", "Failed to insert record"))
		}
		return c.JSON(http.StatusCreated, row)
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
		return c.JSON(http.StatusOK, row)
	})
	sub.DELETE("/:id", func(c echo.Context) error {
		if err := supax.DeleteGeneric(c.Request().Context(), table, c.Param("id")); err != nil {
			return httpx.SendError(c, 500, "Internal Server Error",
				httpx.UM("FAILED_DELETE_RECORD", "failedDeleteRecord", "Failed to delete record"))
		}
		return c.NoContent(http.StatusNoContent)
	})
}

func handleAdminImportInterestTags(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Tags []map[string]any `json:"tags"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if len(input.Tags) == 0 {
		return c.JSON(http.StatusOK, map[string]any{"inserted": 0})
	}
	inserted := 0
	for _, t := range input.Tags {
		if _, err := supax.InsertGeneric(c.Request().Context(), "interest_tags", t); err == nil {
			inserted++
		}
	}
	return c.JSON(http.StatusOK, map[string]any{"inserted": inserted})
}

func handleAdminEmbeddings(c echo.Context) error {
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit <= 0 {
		limit = 50
	}
	offset, _ := strconv.Atoi(c.QueryParam("offset"))
	rows, count, err := supax.ListGenericTable(c.Request().Context(), "user_embeddings", limit, offset)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_EMBEDDINGS", "failedFetchEmbeddings", "Failed to fetch embeddings"))
	}
	if rows == nil {
		rows = []map[string]any{}
	}
	return c.JSON(http.StatusOK, map[string]any{"data": rows, "count": count})
}

func handleAdminEmbeddingsRegenerate(c echo.Context) error {
	return c.JSON(http.StatusAccepted, map[string]any{
		"queued":  true,
		"message": "Embedding regeneration is enqueued via internal worker; this admin endpoint requires the Ollama pipeline (deferred)",
	})
}

func handleAdminS3PresignUpload(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Key         string `json:"key"`
		ContentType string `json:"contentType"`
		Expires     int    `json:"expires"`
	}
	_ = json.Unmarshal(rawBody, &input)
	url, fields, err := s3PresignUpload(c.Request().Context(), input.Key, input.ContentType, input.Expires)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_PRESIGN_FAIL", err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]any{"url": url, "fields": fields})
}

func handleAdminS3PresignDownload(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Key     string `json:"key"`
		Expires int    `json:"expires"`
	}
	_ = json.Unmarshal(rawBody, &input)
	url, err := s3PresignDownload(c.Request().Context(), input.Key, input.Expires)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_PRESIGN_FAIL", err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]any{"url": url})
}

func handleAdminS3Delete(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Key string `json:"key"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if err := s3Delete(c.Request().Context(), input.Key); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_DELETE_FAIL", err.Error()))
	}
	return c.NoContent(http.StatusNoContent)
}

func handleAdminReportsList(c echo.Context) error {
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit <= 0 {
		limit = 50
	}
	offset, _ := strconv.Atoi(c.QueryParam("offset"))
	status := c.QueryParam("status")
	rows, count, err := supax.ListAdminReports(c.Request().Context(), status, limit, offset)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_REPORTS", "failedFetchReports", "Failed to fetch reports"))
	}
	if rows == nil {
		rows = []supax.ReportRow{}
	}
	return c.JSON(http.StatusOK, map[string]any{"data": rows, "count": count})
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
	return c.JSON(http.StatusAccepted, map[string]any{
		"queued":  true,
		"message": "AI summary requires the Ollama Cloud pipeline (deferred)",
	})
}
