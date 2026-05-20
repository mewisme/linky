package routes

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/config"
	"linky-api/src/internal/httpx"
	"linky-api/src/internal/middleware"
)

func emptyData(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]interface{}{"data": []interface{}{}})
}

func emptyObject(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]interface{}{})
}

func notImplementedNoOp(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]interface{}{"success": true})
}

func notFound(c echo.Context) error {
	return httpx.SendError(c, http.StatusNotFound, "Not Found",
		httpx.UM("ROUTE_NOT_FOUND", "routeNotFound", "Route not found"))
}

func RegisterAPIv1(g *echo.Group, cfg *config.Config) {
	users := g.Group("/users")
	registerUserRoutes(users)

	registerCallHistoryRoutes(g.Group("/call-history"))
	registerReportsRoutes(g.Group("/reports"))
	g.GET("/reports/me", handleListReports)
	registerFavoritesRoutes(g.Group("/favorites"))

	vc := g.Group("/video-chat")
	vc.POST("/end-call-unload", handleEndCallUnload, middleware.CustomRateLimit(10000, 5, true))

	registerRealtimeRoutes(vc.Group("/realtime", middleware.CustomRateLimit(10000, 30, false)))

	registerNotificationsRoutes(g.Group("/notifications"))

	push := g.Group("/push")
	registerPushRoutes(push, cfg)

	s3me := g.Group("/me/s3")
	registerMyS3Routes(s3me)
}

func RegisterAdminAPI(g *echo.Group) {
	registerAdminRoutes(g)
}

var EndCallUnloadHandler = func(socketID string, callerClerkID string) (status int) {
	return http.StatusServiceUnavailable
}

func SetEndCallUnload(fn func(socketID, callerClerkID string) int) {
	if fn == nil {
		return
	}
	EndCallUnloadHandler = fn
}

func handleEndCallUnload(c echo.Context) error {
	raw, _ := io.ReadAll(c.Request().Body)
	var input struct {
		SocketID string `json:"socketId"`
	}
	_ = json.Unmarshal(raw, &input)
	if input.SocketID == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("SOCKET_ID_REQUIRED", "socketIdRequired", "socketId is required"))
	}
	callerClerkID := httpx.MustClerkUserID(c)
	if callerClerkID == "" {
		return httpx.Unauthorized(c)
	}
	status := EndCallUnloadHandler(input.SocketID, callerClerkID)
	switch status {
	case http.StatusOK:
		return httpx.SendUserMessage(c, http.StatusOK, map[string]interface{}{"success": true},
			httpx.UM("API_END_CALL_OK", "endCallProcessed", "End-call processed"))
	case http.StatusNoContent:
		return httpx.SendUserMessage(c, http.StatusOK, map[string]interface{}{"success": true},
			httpx.UM("API_CLEANUP_OK", "cleanupCompleted", "Cleanup completed"))
	case http.StatusForbidden:
		return httpx.SendError(c, http.StatusForbidden, "Forbidden",
			httpx.UM("API_SOCKET_FORBIDDEN", "socketForbidden", "Socket does not belong to caller"))
	default:
		return httpx.SendError(c, http.StatusServiceUnavailable, "Service unavailable",
			httpx.UM("VIDEO_CHAT_UNAVAILABLE", "serviceUnavailable", "Service unavailable"))
	}
}
