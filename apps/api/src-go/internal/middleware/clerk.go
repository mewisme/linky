package middleware

import (
	"strings"

	"github.com/labstack/echo/v4"

	"linky-api/src-go/internal/infra/clerkx"
	"linky-api/src-go/internal/httpx"
	"linky-api/src-go/internal/logger"
)

var clerkLog = logger.New("middleware:clerk")

func Clerk() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				clerkLog.Warn().Msg("No authorization header provided")
				return httpx.Unauthorized(c)
			}
			token := strings.TrimPrefix(authHeader, "Bearer ")
			payload, err := clerkx.VerifyToken(c.Request().Context(), token)
			if err != nil {
				clerkLog.Error().Err(err).Msg("Clerk token verification error")
				return httpx.Unauthorized(c)
			}
			httpx.SetAuth(c, &httpx.AuthClaims{Sub: payload.Sub, Raw: payload.Raw})
			return next(c)
		}
	}
}
