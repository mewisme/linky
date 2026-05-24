package routes

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"

	appadmin "linky-api/src/internal/app/admin"
	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/aiconfig"
	"linky-api/src/internal/infra/expbonus"
	"linky-api/src/internal/infra/openaix"
	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/logger"
)

func registerAdminRoutes(g *echo.Group) {
	g.GET("/config", handleAdminConfigList)
	g.GET("/config/:key", handleAdminConfigGet)
	g.POST("/config", handleAdminConfigPost)
	g.PATCH("/config/:key", handleAdminConfigUpsert)
	g.DELETE("/config/:key", handleAdminConfigDelete)

	g.GET("/ai/config", handleAdminAIConfigGet)
	g.PUT("/ai/config", handleAdminAIConfigPut)
	g.GET("/ai/models", handleAdminAIModelsList)

	g.GET("/users", handleAdminUserList)
	g.GET("/users/:id", handleAdminUserGet)
	g.PUT("/users/:id", handleAdminUserPut)
	g.PATCH("/users/:id", handleAdminUserPatch)
	g.PATCH("/users/batch", handleAdminUserBatchPatch)
	g.DELETE("/users/batch", handleAdminUserBatchDelete)
	g.DELETE("/users/:id", handleAdminUserSoftDelete)

	registerAdminClerkUserRoutes(g)

	registerAdminCRUD(g, "/interest-tags", "interest_tags")
	registerAdminCRUD(g, "/exp-bonuses", "exp_bonuses", refreshExpBonusesAfterAdminMutate)

	g.GET("/broadcasts", handleAdminBroadcastsList)
	g.POST("/broadcasts", handleAdminBroadcastsCreate)
	g.POST("/broadcasts/ai-generate", handleAdminBroadcastAIGenerate)

	g.POST("/interest-tags/import", handleAdminImportInterestTags)
	g.DELETE("/interest-tags/:id/hard", handleAdminInterestTagHardDelete)

	g.GET("/embeddings", handleAdminEmbeddings)
	g.POST("/embeddings/regenerate", handleAdminEmbeddingsRegenerate)
	g.POST("/embeddings/sync", handleAdminEmbeddingsSync)
	g.POST("/embeddings/sync-all", handleAdminEmbeddingsSyncAll)
	g.POST("/embeddings/compare", handleAdminEmbeddingsCompare)
	g.POST("/embeddings/similar", handleAdminEmbeddingsSimilar)

	// Legacy POST-based S3 endpoints kept for backwards compatibility, plus
	// the Node-spec endpoints required by the frontend.
	g.POST("/s3/presign-upload", handleAdminS3PresignUpload)
	g.POST("/s3/presign-download", handleAdminS3PresignDownload)
	g.POST("/s3/delete", handleAdminS3Delete)
	g.GET("/s3/presigned/upload", handleAdminS3PresignUploadGET)
	g.GET("/s3/presigned/download", handleAdminS3PresignDownloadGET)
	g.GET("/s3/objects", handleAdminS3ListObjects)
	g.DELETE("/s3/objects/:key", handleAdminS3DeleteObject)
	g.POST("/s3/multipart/start", handleAdminS3MultipartStart)
	g.GET("/s3/multipart/:uploadId/part/:partNumber", handleAdminS3MultipartSignPart)
	g.POST("/s3/multipart/complete", handleAdminS3MultipartComplete)
	g.POST("/s3/multipart/abort", handleAdminS3MultipartAbort)

	g.GET("/reports", handleAdminReportsList)
	g.GET("/reports/:id", handleAdminReportGet)
	g.PATCH("/reports/:id", handleAdminReportPatch)
	g.POST("/reports/:id/ai-summary", handleAdminReportAISummary)
	g.POST("/reports/:id/ai-summary:generate", handleAdminReportAISummary)
}

var adminLog = logger.New("routes:admin")

func handleAdminConfigList(c echo.Context) error {
	rows, err := supax.ListAdminConfig(c.Request().Context())
	if err != nil {
		adminLog.Error().Err(err).Msg("ListAdminConfig failed")
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_ADMIN_CONFIG", "failedFetchAdminConfig", "Failed to fetch admin config"))
	}
	if rows == nil {
		rows = []supax.AdminConfigRow{}
	}
	for i := range rows {
		rows[i].Value = aiconfig.RedactAdminConfigRow(rows[i].Key, rows[i].Value)
	}
	return c.JSON(http.StatusOK, map[string]any{"data": rows})
}

const deprecatedUserEmbeddingsConfigKey = "user_embeddings"

func handleAdminConfigUpsert(c echo.Context) error {
	key := c.Param("key")
	if key == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("ADMIN_CONFIG_KEY_REQUIRED", "adminConfigKeyRequired", "key required"))
	}
	if key == deprecatedUserEmbeddingsConfigKey {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UMDetail("ADMIN_CONFIG_KEY_DEPRECATED", "Use /admin/config/ai (ai.embedding.dimension) instead of user_embeddings"))
	}
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Value map[string]any `json:"value"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if input.Value == nil {
		input.Value = map[string]any{}
	}
	ctx := c.Request().Context()
	value := input.Value
	if key == aiconfig.AdminConfigKey {
		prepared, err := prepareAIConfigMap(ctx, value)
		if err != nil {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UM("AI_CONFIG_INVALID", "aiConfigInvalid", "Invalid AI config JSON"))
		}
		value = prepared
	}
	row, err := supax.UpsertAdminConfig(ctx, key, value)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_UPSERT_ADMIN_CONFIG", "failedUpsertAdminConfig", "Failed to upsert admin config"))
	}
	notifyAdminConfigChanged(ctx, key, value)
	if key == aiconfig.AdminConfigKey && row != nil {
		if v, ok := row["value"].(map[string]any); ok {
			row["value"] = aiconfig.RedactSettingsMap(v)
		}
	}
	return c.JSON(http.StatusOK, row)
}

func prepareAIConfigMap(ctx context.Context, value map[string]any) (map[string]any, error) {
	incoming, err := aiconfig.SettingsFromMap(value)
	if err != nil {
		return nil, err
	}
	existing := aiconfig.AdminSettings()
	if raw, err := supax.GetAdminConfigValue(ctx, aiconfig.AdminConfigKey); err == nil && len(raw) > 0 {
		if prev, err := aiconfig.SettingsMapFromRaw(raw); err == nil {
			existing = prev
		}
	}
	return aiconfig.SettingsToMap(aiconfig.MergeSettingsForUpsert(incoming, existing))
}

func notifyAdminConfigChanged(ctx context.Context, key string, value map[string]any) {
	aiconfig.NotifyConfigChanged(ctx, key, value)
	if key == aiconfig.AdminConfigKey {
		openaix.TriggerModelsRefreshAsync()
	}
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
	out, err := appadmin.ListUsers(c.Request().Context(), appadmin.ListUsersOptions{
		Page: page, Limit: limit, Role: role, Search: search, Deleted: deleted,
	})
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_USERS", "failedFetchUsers", "Failed to fetch users"))
	}
	return c.JSON(http.StatusOK, out)
}

func handleAdminUserGet(c echo.Context) error {
	id := c.Param("id")
	row, err := appadmin.GetUser(c.Request().Context(), id)
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
	row, err := appadmin.PatchUser(c.Request().Context(), id, body, false)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_UPDATE_USER", "failedUpdateUser", "Failed to update user"))
	}
	return c.JSON(http.StatusOK, row)
}

func handleAdminUserSoftDelete(c echo.Context) error {
	id := c.Param("id")
	if err := appadmin.SoftDeleteUser(c.Request().Context(), id); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_DELETE_USER", "failedDeleteUser", "Failed to delete user"))
	}
	return c.NoContent(http.StatusNoContent)
}

func refreshExpBonusesAfterAdminMutate(ctx context.Context) {
	if err := expbonus.Reload(ctx); err != nil {
		adminLog.Warn().Err(err).Msg("EXP bonus reload after admin mutate failed")
	}
}

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

func handleAdminImportInterestTags(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Tags  []map[string]any `json:"tags"`
		Items []struct {
			DisplayName string  `json:"display_name"`
			Category    *string `json:"category"`
			Icon        *string `json:"icon"`
			Description *string `json:"description"`
			IsActive    *bool   `json:"is_active"`
		} `json:"items"`
	}
	_ = json.Unmarshal(rawBody, &input)

	tags := input.Tags
	if len(tags) == 0 {
		for _, item := range input.Items {
			name := strings.TrimSpace(item.DisplayName)
			if name == "" {
				continue
			}
			row := map[string]any{"name": name, "is_active": true}
			if item.Category != nil && *item.Category != "" {
				row["category"] = *item.Category
			}
			if item.Icon != nil && *item.Icon != "" {
				row["icon"] = *item.Icon
			}
			if item.Description != nil && *item.Description != "" {
				row["description"] = *item.Description
			}
			if item.IsActive != nil {
				row["is_active"] = *item.IsActive
			}
			tags = append(tags, row)
		}
	}

	total := len(input.Items)
	if total == 0 {
		total = len(tags)
	}
	if len(tags) == 0 {
		return c.JSON(http.StatusOK, map[string]any{
			"total":           total,
			"created":         0,
			"updated":         0,
			"skipped_invalid": total,
		})
	}

	created := 0
	for _, t := range tags {
		name, _ := t["name"].(string)
		if strings.TrimSpace(name) == "" {
			continue
		}
		if _, err := supax.InsertGeneric(c.Request().Context(), "interest_tags", t); err == nil {
			created++
		}
	}
	skipped := total - created
	if skipped < 0 {
		skipped = 0
	}
	return c.JSON(http.StatusOK, map[string]any{
		"total":           total,
		"created":         created,
		"updated":         0,
		"skipped_invalid": skipped,
	})
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
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		UserIDs []string `json:"user_ids"`
	}
	_ = json.Unmarshal(rawBody, &input)
	result, err := appadmin.RegenerateEmbeddings(c.Request().Context(), input.UserIDs)
	if err != nil {
		if errors.Is(err, appadmin.ErrUserIDsRequired) {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UM("USER_IDS_REQUIRED", "userIdsRequired", "user_ids must be a non-empty array"))
		}
		adminLog.Warn().Err(err).Msg("RegenerateEmbeddings failed")
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_LIST_USERS", "failedListUsers", "Failed to list users"))
	}
	return c.JSON(http.StatusAccepted, map[string]any{"enqueued": result.Enqueued})
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
	row, err := appadmin.PatchReport(c.Request().Context(), c.Param("id"), body)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_UPDATE_REPORT", "failedUpdateReport", "Failed to update report"))
	}
	return c.JSON(http.StatusOK, row)
}

func handleAdminReportAISummary(c echo.Context) error {
	id := c.Param("id")
	result, err := appadmin.EnqueueReportAISummary(c.Request().Context(), id)
	if err != nil {
		if errors.Is(err, appadmin.ErrReportIDRequired) {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UM("REPORT_ID_REQUIRED", "reportIdRequired", "id required"))
		}
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("REPORT_AI_ENQUEUE_FAIL", "reportAiEnqueueFail", "Failed to enqueue AI summary job"))
	}
	return c.JSON(http.StatusAccepted, map[string]any{"queued": result.Queued})
}
