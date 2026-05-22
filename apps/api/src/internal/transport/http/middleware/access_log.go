package middleware

import (
	"strconv"
	"time"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/httpx"
	"linky-api/src/internal/logger"
)

var accessLog = logger.New("api:http")

func AccessLog() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			start := time.Now()
			err := next(c)
			if err != nil {
				c.Error(err)
			}
			req := c.Request()
			res := c.Response()
			latency := time.Since(start)
			ev := accessLog.Info()
			if res.Status >= 500 {
				ev = accessLog.Warn()
			} else if res.Status >= 400 {
				ev = accessLog.Info()
			}
			ev.
				Str("method", req.Method).
				Str("path", req.URL.RequestURI()).
				Int("status", res.Status).
				Int64("bytes", res.Size).
				Dur("latency", latency).
				Str("latencyHuman", latency.String()).
				Str("ip", httpx.GetClientIP(c)).
				Str("ua", strFirst(req.Header.Get("User-Agent"))).
				Str("requestId", httpx.GetRequestID(c))
			if err != nil {
				ev = ev.Err(err)
			}
			ev.Msg("http " + strconv.Itoa(res.Status))
			return err
		}
	}
}

func strFirst(s string) string {
	if len(s) > 256 {
		return s[:256]
	}
	return s
}
