package middleware

import (
	"context"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"

	"linky-api/src-go/internal/config"
	"linky-api/src-go/internal/httpx"
	"linky-api/src-go/internal/infra/redisx"
	"linky-api/src-go/internal/logger"
)

var rateLog = logger.New("middleware:rate-limit")

func RateLimit(cfg *config.Config) echo.MiddlewareFunc {
	windowMs := cfg.RateLimitWindowMs
	maxReq := cfg.RateLimitMaxRequests

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			client := redisx.Client()
			if client == nil || !redisx.IsOpen() {
				return next(c)
			}
			identifier := httpx.MustClerkUserID(c)
			if identifier == "" {
				identifier = httpx.GetClientIP(c)
			}
			if identifier == "" {
				identifier = "unknown"
			}
			key := "rate-limit:" + identifier

			ctx, cancel := context.WithTimeout(c.Request().Context(), time.Duration(cfg.RedisTimeoutMs)*time.Millisecond)
			defer cancel()

			count, err := client.Incr(ctx, key).Result()
			if err != nil {
				rateLog.Error().Err(err).Msg("Rate limit check failed")
				return next(c)
			}
			if count == 1 {
				_ = client.Expire(ctx, key, time.Duration(windowMs)*time.Millisecond).Err()
			}

			c.Response().Header().Set("X-RateLimit-Limit", strconv.Itoa(maxReq))
			remaining := maxReq - int(count)
			if remaining < 0 {
				remaining = 0
			}
			c.Response().Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
			c.Response().Header().Set("X-RateLimit-Reset", time.Now().Add(time.Duration(windowMs)*time.Millisecond).UTC().Format(time.RFC3339Nano))

			if count > int64(maxReq) {
				rateLog.Warn().Str("identifier", identifier).Int64("count", count).Msg("Rate limit exceeded")
				return httpx.SendError(c, 429, "Too Many Requests",
					httpx.UM("RATE_LIMIT", "rateLimitExceeded", "Rate limit exceeded. Please try again later."))
			}

			return next(c)
		}
	}
}
