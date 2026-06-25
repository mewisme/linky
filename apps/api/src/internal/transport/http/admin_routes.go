package routes

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/app/admin"
	"linky-api/src/internal/app/presence"
	"linky-api/src/internal/domain/user/leveling"
	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/aiconfig"
	"linky-api/src/internal/infra/expbonus"
	"linky-api/src/internal/infra/openaix"
	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/jobs"
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
	rows, count, err := admin.ListUsers(c.Request().Context(), supax.AdminUsersOptions{
		Page: page, Limit: limit, Role: role, Search: search, Deleted: deleted,
	})
	if err != nil {
		return sendAdminStatusError(c, err)
	}
	out := make([]map[string]any, 0, len(rows))
	presenceSnap := presence.SnapshotPresence()
	for _, r := range rows {
		out = append(out, mapAdminUserRow(r, presenceSnap))
	}
	return c.JSON(http.StatusOK, map[string]any{"data": out, "count": count})
}

func mapAdminUserRow(row map[string]any, presence map[string]struct {
	State     string
	UpdatedAt time.Time
}) map[string]any {
	id, _ := row["user_id"].(string)
	clerk, _ := row["clerk_user_id"].(string)
	totalExp := toIntFromAny(row["total_exp_seconds"])
	level := leveling.CalculateLevelFromExp(totalExp, leveling.Default).Level

	bio, _ := row["bio"].(string)
	gender, _ := row["gender"].(string)
	dob, _ := row["date_of_birth"].(string)
	hasDetails := bio != "" || gender != "" || dob != "" || row["bio"] != nil || row["gender"] != nil || row["date_of_birth"] != nil
	var details map[string]any
	if hasDetails {
		details = map[string]any{
			"bio":           nullableString(row["bio"]),
			"gender":        nullableString(row["gender"]),
			"date_of_birth": nullableString(row["date_of_birth"]),
		}
	}

	tags := stringSliceFromAny(row["interest_tags"])

	var embedding map[string]any
	if updated, ok := row["embedding_updated_at"].(string); ok && updated != "" {
		hash, _ := row["embedding_source_hash"].(string)
		embedding = map[string]any{
			"model":       nullableString(row["embedding_model"]),
			"source_hash": hash,
			"updated_at":  updated,
		}
	}

	state := "offline"
	if clerk != "" {
		if p, ok := presence[clerk]; ok && p.State != "" {
			state = p.State
		}
	}

	return map[string]any{
		"id":                 id,
		"clerk_user_id":      clerk,
		"email":              row["email"],
		"first_name":         row["first_name"],
		"last_name":          row["last_name"],
		"avatar_url":         row["avatar_url"],
		"role":               row["role"],
		"deleted":            row["deleted"],
		"presence":           state,
		"created_at":         row["created_at"],
		"updated_at":         row["updated_at"],
		"details":            details,
		"interest_tag_names": tags,
		"embedding":          embedding,
		"level":              level,
	}
}

func toIntFromAny(v any) int {
	switch n := v.(type) {
	case int:
		return n
	case int64:
		return int(n)
	case float64:
		return int(n)
	case json.Number:
		i, _ := n.Int64()
		return int(i)
	case string:
		x, _ := strconv.Atoi(n)
		return x
	}
	return 0
}

func nullableString(v any) any {
	if v == nil {
		return nil
	}
	if s, ok := v.(string); ok {
		if s == "" {
			return nil
		}
		return s
	}
	return v
}

func stringSliceFromAny(v any) []string {
	out := []string{}
	if arr, ok := v.([]any); ok {
		for _, item := range arr {
			if s, ok := item.(string); ok {
				out = append(out, s)
			}
		}
	}
	return out
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
	patchByID := func(c echo.Context) error {
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
	}
	sub.PUT("/:id", patchByID)
	sub.PATCH("/:id", patchByID)
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
	if len(input.UserIDs) == 0 {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("USER_IDS_REQUIRED", "userIdsRequired", "user_ids must be a non-empty array"))
	}
	eligible, err := supax.FilterNonDeletedUserIDs(c.Request().Context(), input.UserIDs)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_LIST_USERS", "failedListUsers", "Failed to list users"))
	}
	enqueued, err := jobs.EnqueueUserEmbeddingRegenerateMany(c.Request().Context(), eligible)
	if err != nil {
		adminLog.Warn().Err(err).Msg("EnqueueUserEmbeddingRegenerateMany partial failure")
	}
	return c.JSON(http.StatusAccepted, map[string]any{"enqueued": enqueued})
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
