package middleware

import (
	"github.com/labstack/echo/v4"

	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/admincache"
	"linky-api/src/internal/logger"
)

var adminLog = logger.New("middleware:admin")

func Admin() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			sub := httpx.MustClerkUserID(c)
			if sub == "" {
				return httpx.Unauthorized(c)
			}
			ok, err := admincache.IsAdmin(c.Request().Context(), sub)
			if err != nil {
				adminLog.Error().Err(err).Msg("Admin middleware error")
				return httpx.Internal(c, "internal server error")
			}
			if !ok {
				adminLog.Warn().Str("clerkUserId", sub).Msg("Non-admin attempted admin access")
				return httpx.Forbidden(c)
			}
			return next(c)
		}
	}
}
