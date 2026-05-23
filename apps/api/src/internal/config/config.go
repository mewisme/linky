package config

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/joho/godotenv"

	"linky-api/src/internal/lib/corsorigin"
)

type Config struct {
	Port      int
	NodeEnv   string
	CorsOrigin []string

	// Cloudflare Realtime SFU
	CloudflareRealtimeAppID     string
	CloudflareRealtimeAppSecret string
	CloudflareRealtimeBaseURL   string
	CloudflareAccountID         string

	ClerkSecretKey     string
	ClerkWebhookSecret string

	S3Bucket          string
	S3Region          string
	S3Endpoint        string
	S3AccessKeyID     string
	S3SecretAccessKey string

	SupabaseURL            string
	SupabaseServiceRoleKey string

	// Redis (worker queue only). REDIS_URL is the full URL, optionally with
	// embedded creds. REDIS_USERNAME / REDIS_PASSWORD override on top.
	RedisURL      string
	RedisPort     string
	RedisUsername string
	RedisPassword string

	ShutdownTimeoutMs       int
	JSONBodySizeLimit       string
	SocketMaxHTTPBufferSize int

	SupabaseTimeoutMs int

	RateLimitWindowMs    int
	RateLimitMaxRequests int

	// In-process Redis-backed job queue
	JobWorkerConcurrency int

	OpenAIBaseURL            string
	OpenAIAPIKey             string
	OpenAIEmbeddingModel     string
	OpenAIBroadcastModel     string
	OpenAIReportSummaryModel string
	OpenAIRequestTimeoutMs   int
	OpenAIEmbeddingTimeoutMs int

	EmbedMaxContextTokens         int
	EmbedMaxChunkTokens           int
	EmbedChunkOverlapTokens       int
	EmbedTiktokenModel            string
	EmbedBatchSize                int
	EmbedUserAPIBatchSize         int
	EmbedMaxChunksPerJob          int
	EmbedMaxTotalInputTokensPerJob int
	EmbedExpectedDimension        int
	EmbedRetryCount               int
	EmbedRetryBaseDelayMs         int
	EmbedMaxBatchTotalTokens      int

	VAPIDSubject    string
	VAPIDPublicKey  string
	VAPIDPrivateKey string
}

var loaded *Config

func Load() *Config {
	if loaded != nil {
		return loaded
	}
	loadDotenv()

	nodeEnv := envStr("NODE_ENV", "development")
	corsOrigin, err := parseCorsOriginStrict(os.Getenv("CORS_ORIGIN"), nodeEnv)
	if err != nil {
		panic(err)
	}

	port := envInt("PORT", 7270)
	if argPort := parsePortArg(); argPort > 0 {
		port = argPort
	}

	embedCtxLimit := clampInt(envInt("EMBED_MAX_CONTEXT_TOKENS", 8192), 256, 1<<20)
	defaultEmbedChunk := 7680
	if defaultEmbedChunk > embedCtxLimit-32 {
		defaultEmbedChunk = embedCtxLimit - 32
	}
	if defaultEmbedChunk < 8 {
		defaultEmbedChunk = 8
	}
	embedChunkTokens := clampInt(envInt("EMBED_MAX_CHUNK_TOKENS", defaultEmbedChunk), 8, embedCtxLimit-1)
	embedOverlapDef := 256
	if embedChunkTokens <= 256 {
		embedOverlapDef = maxInt(embedChunkTokens/4, 0)
	}
	if embedOverlapDef >= embedChunkTokens {
		embedOverlapDef = maxInt(embedChunkTokens-1, 0)
	}
	embedOverlapTokens := clampInt(envInt("EMBED_CHUNK_OVERLAP_TOKENS", embedOverlapDef), 0, maxInt(embedChunkTokens-1, 0))

	mustEnv := func(key string) string {
		v := strings.TrimSpace(os.Getenv(key))
		if v == "" {
			panic("required environment variable " + key + " is not set or empty")
		}
		return v
	}

	c := &Config{
		Port:                          port,
		NodeEnv:                       nodeEnv,
		CorsOrigin:                    corsOrigin,
		CloudflareRealtimeAppID:       os.Getenv("CLOUDFLARE_REALTIME_APP_ID"),
		CloudflareRealtimeAppSecret:   os.Getenv("CLOUDFLARE_REALTIME_APP_SECRET"),
		CloudflareRealtimeBaseURL:     envStr("CLOUDFLARE_REALTIME_BASE_URL", "https://rtc.live.cloudflare.com/v1"),
		CloudflareAccountID:           os.Getenv("CLOUDFLARE_ACCOUNT_ID"),
		ClerkSecretKey:                os.Getenv("CLERK_SECRET_KEY"),
		ClerkWebhookSecret:            os.Getenv("CLERK_WEBHOOK_SECRET"),
		S3Bucket:                      os.Getenv("S3_BUCKET"),
		S3Region:                      os.Getenv("S3_REGION"),
		S3Endpoint:                    os.Getenv("S3_ENDPOINT"),
		S3AccessKeyID:                 os.Getenv("S3_ACCESS_KEY_ID"),
		S3SecretAccessKey:             os.Getenv("S3_SECRET_ACCESS_KEY"),
		SupabaseURL:                   os.Getenv("SUPABASE_URL"),
		SupabaseServiceRoleKey:        os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
		RedisURL:                      os.Getenv("REDIS_URL"),
		RedisPort:                     os.Getenv("REDIS_PORT"),
		RedisUsername:                 os.Getenv("REDIS_USERNAME"),
		RedisPassword:                 os.Getenv("REDIS_PASSWORD"),
		ShutdownTimeoutMs:             envInt("SHUTDOWN_TIMEOUT", 30000),
		JSONBodySizeLimit:             envStr("JSON_BODY_SIZE_LIMIT", "500kb"),
		SocketMaxHTTPBufferSize:       envInt("SOCKET_MAX_HTTP_BUFFER_SIZE", 8*1024*1024),
		SupabaseTimeoutMs:             envInt("SUPABASE_TIMEOUT", 10000),
		RateLimitWindowMs:             envInt("RATE_LIMIT_WINDOW_MS", 30000),
		RateLimitMaxRequests:          envInt("RATE_LIMIT_MAX_REQUESTS", 100),
		JobWorkerConcurrency:          envInt("JOB_WORKER_CONCURRENCY", 4),
		OpenAIBaseURL:                 mustEnv("OPENAI_BASE_URL"),
		OpenAIAPIKey:                  mustEnv("OPENAI_API_KEY"),
		OpenAIEmbeddingModel:          os.Getenv("OPENAI_EMBEDDING_MODEL"),
		OpenAIBroadcastModel:          os.Getenv("OPENAI_BROADCAST_MODEL"),
		OpenAIReportSummaryModel:      os.Getenv("OPENAI_REPORT_SUMMARY_MODEL"),
		OpenAIRequestTimeoutMs:         envInt("OPENAI_REQUEST_TIMEOUT_MS", 60000),
		OpenAIEmbeddingTimeoutMs:       envInt("OPENAI_EMBEDDING_TIMEOUT_MS", 60000),
		EmbedMaxContextTokens:          embedCtxLimit,
		EmbedMaxChunkTokens:            embedChunkTokens,
		EmbedChunkOverlapTokens:        embedOverlapTokens,
		EmbedTiktokenModel:             os.Getenv("EMBED_TIKTOKEN_MODEL"),
		EmbedBatchSize:                 clampInt(envInt("EMBED_BATCH_SIZE", 8), 1, 32),
		EmbedUserAPIBatchSize:          clampInt(envInt("EMBED_USER_API_BATCH_SIZE", 8), 5, 10),
		EmbedMaxChunksPerJob:           clampInt(envInt("EMBED_MAX_CHUNKS_PER_JOB", 64), 4, 256),
		EmbedMaxTotalInputTokensPerJob: maxInt(envInt("EMBED_MAX_TOTAL_INPUT_TOKENS_PER_JOB", 2097152), 4096),
		EmbedExpectedDimension:         envInt("EMBED_EXPECTED_DIMENSION", 1536),
		EmbedRetryCount:                clampInt(envInt("EMBED_RETRY_COUNT", 2), 0, 5),
		EmbedRetryBaseDelayMs:          maxInt(envInt("EMBED_RETRY_BASE_DELAY_MS", 400), 50),
		EmbedMaxBatchTotalTokens:       maxInt(envInt("EMBED_MAX_BATCH_TOTAL_TOKENS", 131072), 1024),
		VAPIDSubject:                  os.Getenv("VAPID_SUBJECT"),
		VAPIDPublicKey:                os.Getenv("VAPID_PUBLIC_KEY"),
		VAPIDPrivateKey:               os.Getenv("VAPID_PRIVATE_KEY"),
	}
	loaded = c
	return c
}

// loadDotenv loads a single file named `.env`. It first tries `<repo-root>/.env`
// (walking up from the process working directory for pnpm-workspace.yaml /
// .git / turbo.json). If that file is missing, it falls back to `godotenv.Load()`
// which reads `./.env` from the current working directory.
//
// godotenv does NOT override existing environment variables, so envs already
// set by docker-compose or the shell take precedence over the .env file.
func loadDotenv() {
	if path, ok := findRepoRootDotenv(); ok {
		if err := godotenv.Load(path); err == nil {
			return
		}
	}
	_ = godotenv.Load()
}

func findRepoRootDotenv() (string, bool) {
	cwd, err := os.Getwd()
	if err != nil {
		return "", false
	}
	dir := cwd
	for i := 0; i < 8; i++ {
		if isRepoRoot(dir) {
			candidate := filepath.Join(dir, ".env")
			if _, err := os.Stat(candidate); err == nil {
				return candidate, true
			}
			return "", false
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", false
		}
		dir = parent
	}
	return "", false
}

func isRepoRoot(dir string) bool {
	for _, marker := range []string{"pnpm-workspace.yaml", ".git", "turbo.json"} {
		if _, err := os.Stat(filepath.Join(dir, marker)); err == nil {
			return true
		}
	}
	return false
}

// parsePortArg parses --port / -p from os.Args. Returns 0 if absent or
// invalid. Mirrors the Node API's `--port|-p <n>` behaviour.
func parsePortArg() int {
	fs := flag.NewFlagSet("api", flag.ContinueOnError)
	fs.SetOutput(noopWriter{})
	port := fs.Int("port", 0, "")
	short := fs.Int("p", 0, "")
	_ = fs.Parse(os.Args[1:])
	if *port > 0 && *port < 65536 {
		return *port
	}
	if *short > 0 && *short < 65536 {
		return *short
	}
	return 0
}

type noopWriter struct{}

func (noopWriter) Write(p []byte) (int, error) { return len(p), nil }

func envStr(key, def string) string {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	return v
}

func envInt(key string, def int) int {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return def
	}
	return n
}

func parseCorsOrigin(raw string) []string {
	if raw == "" {
		return []string{"http://localhost:3000"}
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	if len(out) == 0 {
		return []string{"http://localhost:3000"}
	}
	return corsorigin.NormalizeList(out)
}

// parseCorsOriginStrict mirrors the TS helper in apps/api/src/utils/cors.ts.
//
// In production, refuse to start when CORS_ORIGIN is unset, the global wildcard "*",
// or an empty allowlist. Host patterns like *.mewis.me are allowed. Outside
// production, fall back to parseCorsOrigin's permissive default for local dev.
func parseCorsOriginStrict(raw, nodeEnv string) ([]string, error) {
	trimmed := strings.TrimSpace(raw)
	isWildcard := trimmed == "*" || strings.EqualFold(trimmed, "wildcard")

	if nodeEnv == "production" {
		if trimmed == "" || isWildcard {
			return nil, fmt.Errorf("CORS_ORIGIN must be set to an explicit allowlist in production (wildcard '*' is not allowed)")
		}
		parts := strings.Split(trimmed, ",")
		out := make([]string, 0, len(parts))
		for _, p := range parts {
			p = strings.TrimSpace(p)
			if p != "" {
				out = append(out, p)
			}
		}
		if len(out) == 0 {
			return nil, fmt.Errorf("CORS_ORIGIN must be set to an explicit allowlist in production (wildcard '*' is not allowed)")
		}
		return corsorigin.NormalizeList(out), nil
	}

	if isWildcard {
		return []string{"*"}, nil
	}
	return parseCorsOrigin(raw), nil
}

func clampInt(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
