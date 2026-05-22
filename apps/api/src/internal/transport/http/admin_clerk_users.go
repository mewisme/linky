package routes

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/clerkadmin"
)

func registerAdminClerkUserRoutes(g *echo.Group) {
	g.GET("/users/clerk", handleAdminClerkUserList)
	g.PATCH("/users/clerk/batch", handleAdminClerkUserBatchPatch)
	g.DELETE("/users/clerk/batch", handleAdminClerkUserBatchDelete)
	g.POST("/users/clerk/:id/password/set-compromised", handleAdminClerkUserSetPasswordCompromised)
	g.GET("/users/clerk/:id", handleAdminClerkUserGet)
	g.PUT("/users/clerk/:id", handleAdminClerkUserPut)
	g.PATCH("/users/clerk/:id", handleAdminClerkUserPatch)
	g.DELETE("/users/clerk/:id", handleAdminClerkUserDelete)
}

func adminClerkActor(c echo.Context) string {
	return httpx.MustClerkUserID(c)
}

func handleAdminClerkUserList(c echo.Context) error {
	page, _ := strconv.Atoi(c.QueryParam("page"))
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit <= 0 {
		limit = 50
	}
	if limit > 500 {
		limit = 500
	}
	offset := 0
	if page > 0 {
		offset = (page - 1) * limit
	}
	search := c.QueryParam("search")
	if search == "" {
		search = c.QueryParam("query")
	}
	var banned *bool
	if b := c.QueryParam("banned"); b != "" {
		v := b == "true"
		banned = &v
	}
	ctx := c.Request().Context()
	list, err := clerkadmin.ListUsers(ctx, adminClerkActor(c), clerkadmin.ListUsersOptions{
		Limit:  limit,
		Offset: offset,
		Query:  search,
		Banned: banned,
	})
	if err != nil {
		return sendClerkAdminError(c, err, "FAILED_FETCH_CLERK_USERS", "failedFetchClerkUsers", "Failed to fetch users from Clerk")
	}
	return c.JSON(http.StatusOK, map[string]any{"data": list.Data, "count": list.TotalCount})
}

func handleAdminClerkUserGet(c echo.Context) error {
	id := c.Param("id")
	u, err := clerkadmin.GetUser(c.Request().Context(), adminClerkActor(c), id)
	if err != nil {
		return sendClerkAdminError(c, err, "FAILED_FETCH_CLERK_USER", "failedFetchClerkUser", "Failed to fetch user from Clerk")
	}
	return c.JSON(http.StatusOK, u)
}

func handleAdminClerkUserPut(c echo.Context) error {
	return handleAdminClerkUserUpdate(c)
}

func handleAdminClerkUserPatch(c echo.Context) error {
	return handleAdminClerkUserUpdate(c)
}

func handleAdminClerkUserUpdate(c echo.Context) error {
	id := c.Param("id")
	body, err := readJSONBodyMap(c)
	if err != nil {
		return httpx.SendError(c, http.StatusBadRequest, "Bad Request",
			httpx.UMDetail("INVALID_BODY", err.Error()))
	}
	u, err := clerkadmin.UpdateUser(c.Request().Context(), adminClerkActor(c), id, body)
	if err != nil {
		return sendClerkAdminError(c, err, "FAILED_UPDATE_CLERK_USER", "failedUpdateClerkUser", "Failed to update user in Clerk")
	}
	return c.JSON(http.StatusOK, u)
}

func handleAdminClerkUserDelete(c echo.Context) error {
	id := c.Param("id")
	if err := clerkadmin.DeleteUser(c.Request().Context(), adminClerkActor(c), id); err != nil {
		return sendClerkAdminError(c, err, "FAILED_DELETE_CLERK_USER", "failedDeleteClerkUser", "Failed to delete user in Clerk")
	}
	return c.NoContent(http.StatusNoContent)
}

func handleAdminClerkUserSetPasswordCompromised(c echo.Context) error {
	id := c.Param("id")
	rawBody, _ := io.ReadAll(c.Request().Body)
	var params clerkadmin.SetPasswordCompromisedParams
	if len(rawBody) > 0 {
		_ = json.Unmarshal(rawBody, &params)
	}
	out, err := clerkadmin.SetPasswordCompromised(c.Request().Context(), adminClerkActor(c), id, params)
	if err != nil {
		return sendClerkAdminError(c, err, "FAILED_SET_PASSWORD_COMPROMISED", "failedSetPasswordCompromised", "Failed to set password as compromised in Clerk")
	}
	if out == nil {
		return c.NoContent(http.StatusOK)
	}
	return c.JSON(http.StatusOK, out)
}

func handleAdminClerkUserBatchPatch(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		IDs  []string       `json:"ids"`
		Body map[string]any `json:"body"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if len(input.IDs) == 0 {
		return httpx.SendError(c, http.StatusBadRequest, "Bad Request",
			httpx.UM("CLERK_USER_IDS_REQUIRED", "clerkUserIdsRequired", "ids must be a non-empty array"))
	}
	body := input.Body
	if body == nil {
		var flat map[string]any
		_ = json.Unmarshal(rawBody, &flat)
		delete(flat, "ids")
		if len(flat) > 0 {
			body = flat
		}
	}
	if body == nil {
		body = map[string]any{}
	}
	if len(body) == 0 {
		return c.JSON(http.StatusOK, map[string]any{"updated": 0})
	}
	ctx := c.Request().Context()
	actor := adminClerkActor(c)
	updated := 0
	for _, id := range input.IDs {
		if _, err := clerkadmin.UpdateUser(ctx, actor, id, body); err == nil {
			updated++
		}
	}
	return c.JSON(http.StatusOK, map[string]any{"updated": updated})
}

func handleAdminClerkUserBatchDelete(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		IDs []string `json:"ids"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if len(input.IDs) == 0 {
		return httpx.SendError(c, http.StatusBadRequest, "Bad Request",
			httpx.UM("CLERK_USER_IDS_REQUIRED", "clerkUserIdsRequired", "ids must be a non-empty array"))
	}
	ctx := c.Request().Context()
	actor := adminClerkActor(c)
	deleted := 0
	for _, id := range input.IDs {
		if err := clerkadmin.DeleteUser(ctx, actor, id); err == nil {
			deleted++
		}
	}
	return c.JSON(http.StatusOK, map[string]any{"deleted": deleted})
}

func readJSONBodyMap(c echo.Context) (map[string]any, error) {
	rawBody, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return nil, err
	}
	var body map[string]any
	if err := json.Unmarshal(rawBody, &body); err != nil {
		return nil, err
	}
	if body == nil {
		body = map[string]any{}
	}
	return body, nil
}

func sendClerkAdminError(c echo.Context, err error, code, key, fallback string) error {
	if err == clerkadmin.ErrForbidden {
		return httpx.Forbidden(c)
	}
	if err == clerkadmin.ErrActorRequired {
		return httpx.Unauthorized(c)
	}
	if clerkadmin.IsNotConfigured(err) {
		return httpx.SendError(c, http.StatusServiceUnavailable, "Service Unavailable",
			httpx.UM("CLERK_NOT_CONFIGURED", "clerkNotConfigured", "Clerk is not configured on the server"))
	}
	status := clerkadmin.HTTPStatus(err)
	if status == 0 {
		status = http.StatusBadGateway
	}
	msg := clerkadmin.ErrorMessage(err)
	if msg == "" {
		msg = fallback
	}
	return httpx.SendError(c, status, http.StatusText(status),
		httpx.UMDetail(code, msg))
}
