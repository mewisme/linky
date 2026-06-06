package routes

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"linky-api/src/internal/app/broadcastai"
	"linky-api/src/internal/app/embeddings"
	domainembed "linky-api/src/internal/domain/embeddings"
	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/aiconfig"
	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/jobs"
)

func handleAdminConfigGet(c echo.Context) error {
	key := c.Param("key")
	if key == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("ADMIN_CONFIG_KEY_REQUIRED", "adminConfigKeyRequired", "key required"))
	}
	rows, err := supax.ListAdminConfig(c.Request().Context())
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_ADMIN_CONFIG", "failedFetchAdminConfig", "Failed to fetch admin config"))
	}
	for _, r := range rows {
		if r.Key == key {
			return c.JSON(http.StatusOK, r)
		}
	}
	return httpx.SendError(c, 404, "Not Found",
		httpx.UM("ADMIN_CONFIG_NOT_FOUND", "adminConfigNotFound", "admin config not found"))
}

func handleAdminConfigPost(c echo.Context) error {
	body, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Key   string         `json:"key"`
		Value map[string]any `json:"value"`
	}
	_ = json.Unmarshal(body, &input)
	if input.Value == nil {
		input.Value = map[string]any{}
	}
	if input.Key == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("ADMIN_CONFIG_KEY_REQUIRED", "adminConfigKeyRequired", "key required"))
	}
	if input.Key == deprecatedUserEmbeddingsConfigKey {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UMDetail("ADMIN_CONFIG_KEY_DEPRECATED", "Use /admin/config/ai (ai.embedding.dimension) instead of user_embeddings"))
	}
	ctx := c.Request().Context()
	value := input.Value
	if input.Key == aiconfig.AdminConfigKey {
		prepared, err := prepareAIConfigMap(ctx, value)
		if err != nil {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UM("AI_CONFIG_INVALID", "aiConfigInvalid", "Invalid AI config JSON"))
		}
		value = prepared
	}
	row, err := supax.UpsertAdminConfig(ctx, input.Key, value)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_UPSERT_ADMIN_CONFIG", "failedUpsertAdminConfig", "Failed to upsert admin config"))
	}
	notifyAdminConfigChanged(ctx, input.Key, value)
	if input.Key == aiconfig.AdminConfigKey && row != nil {
		if v, ok := row["value"].(map[string]any); ok {
			row["value"] = aiconfig.RedactSettingsMap(v)
		}
	}
	return c.JSON(http.StatusCreated, row)
}

func handleAdminConfigDelete(c echo.Context) error {
	key := c.Param("key")
	if key == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("ADMIN_CONFIG_KEY_REQUIRED", "adminConfigKeyRequired", "key required"))
	}
	if err := supax.DeleteAdminConfig(c.Request().Context(), key); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_DELETE_ADMIN_CONFIG", "failedDeleteAdminConfig", "Failed to delete admin config"))
	}
	return c.NoContent(http.StatusNoContent)
}

func handleAdminUserPut(c echo.Context) error {
	id := c.Param("id")
	rawBody, _ := io.ReadAll(c.Request().Body)
	var body map[string]any
	_ = json.Unmarshal(rawBody, &body)
	if body == nil {
		body = map[string]any{}
	}
	if r, _ := body["role"].(string); r == "superadmin" {
		return httpx.SendError(c, 403, "Forbidden",
			httpx.UM("CANNOT_ASSIGN_SUPERADMIN", "cannotAssignSuperadmin", "Cannot assign superadmin role"))
	}
	row, err := supax.PatchUser(c.Request().Context(), id, body)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_UPDATE_USER", "failedUpdateUser", "Failed to update user"))
	}
	return c.JSON(http.StatusOK, row)
}

func handleAdminUserBatchPatch(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		IDs       []string `json:"ids"`
		Deleted   *bool    `json:"deleted"`
		DeletedAt *string  `json:"deleted_at"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if len(input.IDs) == 0 {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("USER_IDS_REQUIRED", "userIdsRequired", "ids must be a non-empty array"))
	}
	body := map[string]any{}
	if input.Deleted != nil {
		body["deleted"] = *input.Deleted
		if *input.Deleted && input.DeletedAt == nil {
			body["deleted_at"] = supax.NowRFC3339()
		}
	}
	if input.DeletedAt != nil {
		body["deleted_at"] = *input.DeletedAt
	}
	if len(body) == 0 {
		return c.JSON(http.StatusOK, map[string]any{"updated": 0})
	}
	ctx := c.Request().Context()
	actor := httpx.MustClerkUserID(c)
	updated := 0
	if input.Deleted != nil && *input.Deleted {
		for _, id := range input.IDs {
			if _, err := adminSoftDeleteUser(ctx, actor, id, body); err == nil {
				updated++
			}
		}
		return c.JSON(http.StatusOK, map[string]any{"updated": updated})
	}
	for _, id := range input.IDs {
		if _, err := supax.PatchUser(ctx, id, body); err == nil {
			updated++
		}
	}
	return c.JSON(http.StatusOK, map[string]any{"updated": updated})
}

func handleAdminUserBatchDelete(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		IDs []string `json:"ids"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if len(input.IDs) == 0 {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("USER_IDS_REQUIRED", "userIdsRequired", "ids must be a non-empty array"))
	}
	deleted := 0
	for _, id := range input.IDs {
		if err := supax.DeleteGeneric(c.Request().Context(), "users", id); err == nil {
			deleted++
		}
	}
	return c.JSON(http.StatusOK, map[string]any{"deleted": deleted})
}

func handleAdminInterestTagHardDelete(c echo.Context) error {
	id := c.Param("id")
	if err := supax.DeleteGeneric(c.Request().Context(), "interest_tags", id); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_DELETE_TAG", "failedDeleteInterestTag", "Failed to delete interest tag"))
	}
	return c.NoContent(http.StatusNoContent)
}

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

func handleAdminEmbeddingsSync(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		UserIDs []string `json:"user_ids"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if len(input.UserIDs) == 0 {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("USER_IDS_REQUIRED", "userIdsRequired", "user_ids must be a non-empty array"))
	}
	enqueued := 0
	for _, id := range input.UserIDs {
		if _, err := uuid.Parse(id); err != nil {
			continue
		}
		if err := jobs.EnqueueUserEmbeddingRegenerate(c.Request().Context(), id); err == nil {
			enqueued++
		}
	}
	return c.JSON(http.StatusAccepted, map[string]any{"enqueued": enqueued})
}

func handleAdminEmbeddingsSyncAll(c echo.Context) error {
	ids, err := supax.ListAllUserIDs(c.Request().Context())
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_LIST_USERS", "failedListUsers", "Failed to list users"))
	}
	go func() {
		ctx := context.Background()
		for _, id := range ids {
			_ = jobs.EnqueueUserEmbeddingRegenerate(ctx, id)
		}
	}()
	return c.JSON(http.StatusAccepted, map[string]any{"scheduled": len(ids)})
}

func handleAdminEmbeddingsCompare(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		UserA string `json:"user_id_a"`
		UserB string `json:"user_id_b"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if input.UserA == "" || input.UserB == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("USER_IDS_REQUIRED", "userIdsRequired", "user_id_a and user_id_b are required"))
	}
	emb, err := supax.ListUserEmbeddings(c.Request().Context(), []string{input.UserA, input.UserB})
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_EMBEDDINGS", "failedFetchEmbeddings", "Failed to fetch embeddings"))
	}
	a, ok1 := emb[input.UserA]
	b, ok2 := emb[input.UserB]
	if !ok1 || !ok2 {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("EMBEDDING_MISSING", "embeddingMissing", "Embedding not found for one or both users"))
	}
	score := domainembed.CosineSimilarity(a, b)
	return c.JSON(http.StatusOK, map[string]any{
		"user_id_a":  input.UserA,
		"user_id_b":  input.UserB,
		"similarity": score,
	})
}

func handleAdminEmbeddingsSimilar(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		UserID    string  `json:"user_id"`
		Limit     int     `json:"limit"`
		Threshold float64 `json:"threshold"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if input.UserID == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("USER_ID_REQUIRED", "userIdRequired", "user_id is required"))
	}
	if input.Limit <= 0 {
		input.Limit = 25
	}
	results, err := embeddings.FindSimilar(c.Request().Context(), input.UserID, input.Limit, input.Threshold)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FIND_SIMILAR", "failedFindSimilar", "Failed to find similar users"))
	}
	return c.JSON(http.StatusOK, map[string]any{"results": results})
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

func handleAdminS3PresignUploadGET(c echo.Context) error {
	key := c.QueryParam("key")
	expires := atoiDefault(c.QueryParam("expires"), 600)
	contentType := c.QueryParam("contentType")
	if key == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("S3_KEY_REQUIRED", "s3KeyRequired", "key is required"))
	}
	url, fields, err := s3PresignUpload(c.Request().Context(), key, contentType, expires)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_PRESIGN_FAIL", err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]any{"url": url, "fields": fields})
}

func handleAdminS3PresignDownloadGET(c echo.Context) error {
	key := c.QueryParam("key")
	expires := atoiDefault(c.QueryParam("expires"), 600)
	if key == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("S3_KEY_REQUIRED", "s3KeyRequired", "key is required"))
	}
	url, err := s3PresignDownload(c.Request().Context(), key, expires)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_PRESIGN_FAIL", err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]any{"url": url})
}

func handleAdminS3ListObjects(c echo.Context) error {
	prefix := c.QueryParam("prefix")
	objs, err := s3ListObjects(c.Request().Context(), prefix)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_LIST_FAIL", err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]any{"objects": objs})
}

func handleAdminS3DeleteObject(c echo.Context) error {
	key := c.Param("key")
	if key == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("S3_KEY_REQUIRED", "s3KeyRequired", "key is required"))
	}
	if err := s3Delete(c.Request().Context(), key); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_DELETE_FAIL", err.Error()))
	}
	return c.NoContent(http.StatusNoContent)
}

func handleAdminS3MultipartStart(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Key         string `json:"key"`
		ContentType string `json:"contentType"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if input.Key == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("S3_KEY_REQUIRED", "s3KeyRequired", "key is required"))
	}
	uploadID, err := s3CreateMultipart(c.Request().Context(), input.Key, input.ContentType)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_MULTIPART_INIT_FAIL", err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]any{"uploadId": uploadID, "key": input.Key})
}

func handleAdminS3MultipartSignPart(c echo.Context) error {
	uploadID := c.Param("uploadId")
	partNumber, _ := atoiAny(c.Param("partNumber"))
	key := c.QueryParam("key")
	expires := atoiDefault(c.QueryParam("expires"), 3600)
	if key == "" || uploadID == "" || partNumber <= 0 {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("S3_PART_INVALID", "s3PartInvalid", "key, uploadId and partNumber are required"))
	}
	url, err := s3PresignPart(c.Request().Context(), key, uploadID, partNumber, expires)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_PRESIGN_FAIL", err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]any{"url": url})
}

func handleAdminS3MultipartComplete(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Key      string          `json:"key"`
		UploadID string          `json:"uploadId"`
		Parts    []multipartPart `json:"parts"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if input.Key == "" || input.UploadID == "" || len(input.Parts) == 0 {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("S3_COMPLETE_INVALID", "s3CompleteInvalid", "key, uploadId and parts are required"))
	}
	if err := s3CompleteMultipart(c.Request().Context(), input.Key, input.UploadID, input.Parts); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_COMPLETE_FAIL", err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]any{"key": input.Key})
}

func handleAdminS3MultipartAbort(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Key      string `json:"key"`
		UploadID string `json:"uploadId"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if input.Key == "" || input.UploadID == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("S3_ABORT_INVALID", "s3AbortInvalid", "key and uploadId are required"))
	}
	if err := s3AbortMultipart(c.Request().Context(), input.Key, input.UploadID); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_ABORT_FAIL", err.Error()))
	}
	return c.NoContent(http.StatusNoContent)
}

func atoiDefault(v string, def int) int {
	n, ok := atoiAny(v)
	if !ok {
		return def
	}
	return n
}
