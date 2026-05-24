package routes

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"linky-api/src/internal/app/embeddings"
	domainembed "linky-api/src/internal/domain/embeddings"
	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/jobs"
)

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
