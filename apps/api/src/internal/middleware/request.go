package middleware

import (
	"strings"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"linky-api/src/internal/httpx"
)

func RequestID() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			id := c.Request().Header.Get("X-Request-ID")
			if id == "" {
				id = uuid.NewString()
			}
			httpx.SetRequestID(c, id)
			c.Response().Header().Set("X-Request-ID", id)
			return next(c)
		}
	}
}

func ClientIP() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			ip := c.RealIP()
			if h := c.Request().Header.Get("X-Forwarded-For"); h != "" {
				ip = strings.TrimSpace(strings.Split(h, ",")[0])
			}
			httpx.SetClientIP(c, ip)
			return next(c)
		}
	}
}
