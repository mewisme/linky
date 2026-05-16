package routes

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"linky-api/src-go/internal/config"
	"linky-api/src-go/internal/httpx"
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
	registerFavoritesRoutes(g.Group("/favorites"))

	vc := g.Group("/video-chat")
	vc.POST("/end-call-unload", notImplementedNoOp)

	registerNotificationsRoutes(g.Group("/notifications"))

	push := g.Group("/push")
	registerPushRoutes(push, cfg)

	s3me := g.Group("/me/s3")
	registerMyS3Routes(s3me)
}

func RegisterAdminAPI(g *echo.Group) {
	registerAdminRoutes(g)
}
