package env

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	RedisURL                   string
	RedisPort                  string
	RedisUsername              string
	RedisPassword              string
	InternalAPIBaseURL         string
	InternalWorkerSecret       string
	InternalAPITimeoutMs       int
	InternalAPIMaxRetries      int
	InternalAPIRetryBaseDelayMs int
	NodeEnv                    string
}

func Parse() (*Config, error) {
	cfg := &Config{
		RedisURL:                   getEnv("REDIS_URL", ""),
		RedisPort:                  getEnv("REDIS_PORT", ""),
		RedisUsername:              getEnv("REDIS_USERNAME", ""),
		RedisPassword:              getEnv("REDIS_PASSWORD", ""),
		InternalAPIBaseURL:         getEnv("INTERNAL_API_BASE_URL", ""),
		InternalWorkerSecret:       getEnv("INTERNAL_WORKER_SECRET", ""),
		InternalAPITimeoutMs:       getEnvInt("INTERNAL_API_TIMEOUT_MS", 120000),
		InternalAPIMaxRetries:      getEnvInt("INTERNAL_API_MAX_RETRIES", 3),
		InternalAPIRetryBaseDelayMs: getEnvInt("INTERNAL_API_RETRY_BASE_DELAY_MS", 500),
		NodeEnv:                    getEnv("NODE_ENV", "development"),
	}

	if cfg.InternalAPIBaseURL == "" {
		return nil, fmt.Errorf("INTERNAL_API_BASE_URL is required")
	}
	if cfg.InternalWorkerSecret == "" {
		return nil, fmt.Errorf("INTERNAL_WORKER_SECRET is required")
	}

	return cfg, nil
}

func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	v := os.Getenv(key)
	if v == "" {
		return defaultVal
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return defaultVal
	}
	return n
}
