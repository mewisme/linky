package routes

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/app/presence"
	"linky-api/src/internal/domain/user/leveling"
	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/supax"
)

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
	rows, count, err := supax.ListAdminUsersUnified(c.Request().Context(), supax.AdminUsersOptions{
		Page: page, Limit: limit, Role: role, Search: search, Deleted: deleted,
	})
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_USERS", "failedFetchUsers", "Failed to fetch users"))
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
	updated := 0
	for _, id := range input.IDs {
		if _, err := supax.PatchUser(c.Request().Context(), id, body); err == nil {
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
