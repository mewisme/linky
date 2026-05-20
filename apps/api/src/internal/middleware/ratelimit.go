package middleware

import (
	"strconv"
	"sync"
	"time"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/config"
	"linky-api/src/internal/httpx"
	"linky-api/src/internal/logger"
)

var rateLog = logger.New("middleware:rate-limit")

type bucket struct {
	count   int
	resetAt time.Time
}

type Limiter struct {
	mu         sync.Mutex
	buckets    map[string]*bucket
	windowMs   int
	max        int
	failClosed bool
}

func newLimiter(windowMs, max int, failClosed bool) *Limiter {
	if windowMs <= 0 {
		windowMs = 30000
	}
	if max <= 0 {
		max = 100
	}
	return &Limiter{
		buckets:    make(map[string]*bucket),
		windowMs:   windowMs,
		max:        max,
		failClosed: failClosed,
	}
}

func (l *Limiter) check(key string) (allowed bool, count int, resetAt time.Time) {
	now := time.Now()
	l.mu.Lock()
	defer l.mu.Unlock()
	b, ok := l.buckets[key]
	if !ok || now.After(b.resetAt) {
		b = &bucket{count: 1, resetAt: now.Add(time.Duration(l.windowMs) * time.Millisecond)}
		l.buckets[key] = b
		l.gcLocked(now)
		return true, 1, b.resetAt
	}
	b.count++
	return b.count <= l.max, b.count, b.resetAt
}

func (l *Limiter) gcLocked(now time.Time) {
	if len(l.buckets) <= 4096 {
		return
	}
	for k, b := range l.buckets {
		if now.After(b.resetAt) {
			delete(l.buckets, k)
		}
	}
}

var (
	defaultOnce       sync.Once
	defaultLimiter    *Limiter
	failClosedOnce    sync.Once
	failClosedLimiter *Limiter
)

func defaultRateLimiter(cfg *config.Config) *Limiter {
	defaultOnce.Do(func() {
		defaultLimiter = newLimiter(cfg.RateLimitWindowMs, cfg.RateLimitMaxRequests, false)
	})
	return defaultLimiter
}

func failClosedRateLimiter(cfg *config.Config) *Limiter {
	failClosedOnce.Do(func() {
		failClosedLimiter = newLimiter(cfg.RateLimitWindowMs, cfg.RateLimitMaxRequests, true)
	})
	return failClosedLimiter
}

func RateLimit(cfg *config.Config) echo.MiddlewareFunc {
	return middlewareFor(defaultRateLimiter(cfg), false)
}

func RateLimitFailClosed(cfg *config.Config) echo.MiddlewareFunc {
	return middlewareFor(failClosedRateLimiter(cfg), true)
}

func CustomRateLimit(windowMs, max int, failClosed bool) echo.MiddlewareFunc {
	return middlewareFor(newLimiter(windowMs, max, failClosed), failClosed)
}

func middlewareFor(l *Limiter, _ bool) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			identifier := httpx.MustClerkUserID(c)
			if identifier == "" {
				identifier = httpx.GetClientIP(c)
			}
			if identifier == "" {
				identifier = "unknown"
			}
			allowed, count, resetAt := l.check(identifier)
			c.Response().Header().Set("X-RateLimit-Limit", strconv.Itoa(l.max))
			remaining := l.max - count
			if remaining < 0 {
				remaining = 0
			}
			c.Response().Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
			c.Response().Header().Set("X-RateLimit-Reset", resetAt.UTC().Format(time.RFC3339Nano))
			if !allowed {
				rateLog.Warn().Str("identifier", identifier).Int("count", count).Msg("Rate limit exceeded")
				return httpx.SendError(c, 429, "Too Many Requests",
					httpx.UM("RATE_LIMIT", "rateLimitExceeded", "Rate limit exceeded. Please try again later."))
			}
			return next(c)
		}
	}
}
