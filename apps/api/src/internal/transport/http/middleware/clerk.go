package middleware

import (
	"context"
	"time"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/clerkx"
	"linky-api/src/internal/logger"
)

var clerkLog = logger.New("middleware:clerk")

const clerkVerifyTimeout = 10 * time.Second

func Clerk() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			token, ok := clerkx.ExtractBearerToken(c.Request().Header.Get("Authorization"))
			if !ok {
				clerkLog.Warn().Msg("No authorization header provided")
				return httpx.Unauthorized(c)
			}

			verifyCtx, cancel := context.WithTimeout(context.Background(), clerkVerifyTimeout)
			defer cancel()

			payload, err := clerkx.VerifyToken(verifyCtx, token)
			if err != nil {
				clerkLog.Error().Err(err).Msg("Clerk token verification error")
				return httpx.Unauthorized(c)
			}
			expTime := time.Now().Add(time.Duration(payload.Raw["exp"].(int64)-time.Now().Unix()) * time.Second)
			clerkLog.Info().Str("sub", payload.Sub).Time("exp", expTime).Msg("Clerk token verified")

			httpx.SetAuth(c, &httpx.AuthClaims{Sub: payload.Sub, Raw: payload.Raw})
			return next(c)
		}
	}
}
