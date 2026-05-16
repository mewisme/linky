package config

import (
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port      int
	NodeEnv   string
	CorsOrigin []string

	CloudflareTurnAPIToken string
	CloudflareTurnKeyID    string

	ClerkSecretKey     string
	ClerkWebhookSecret string

	S3Bucket          string
	S3Region          string
	S3Endpoint        string
	S3AccessKeyID     string
	S3SecretAccessKey string

	SupabaseURL            string
	SupabaseServiceRoleKey string

	InternalAPISocketPath string
	InternalAPIPort       int

	RedisURL      string
	RedisPort     string
	RedisUsername string
	RedisPassword string

	UseMemoryMatchmaking bool

	CacheNamespaceVersion string

	ShutdownTimeoutMs       int
	JSONBodySizeLimit       string
	SocketMaxHTTPBufferSize int

	RedisTimeoutMs    int
	SupabaseTimeoutMs int

	RateLimitWindowMs    int
	RateLimitMaxRequests int

	OllamaEmbeddingURL     string
	OllamaEmbeddingModel   string
	OllamaCloudModel       string
	OllamaAPIKey           string
	OllamaEmbeddingTimeout int

	EmbedMaxChunkChars            int
	EmbedChunkOverlapChars        int
	EmbedBatchSize                int
	EmbedMaxChunksPerJob          int
	EmbedMaxTotalInputCharsPerJob int
	EmbedExpectedDimension        int
	EmbedOllamaConcurrency        int
	EmbedRetryCount               int
	EmbedRetryBaseDelayMs         int
	EmbedMaxBatchTotalChars       int

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

	c := &Config{
		Port:                          envInt("PORT", 7270),
		NodeEnv:                       envStr("NODE_ENV", "development"),
		CorsOrigin:                    parseCorsOrigin(os.Getenv("CORS_ORIGIN")),
		CloudflareTurnAPIToken:        os.Getenv("CLOUDFLARE_TURN_API_TOKEN"),
		CloudflareTurnKeyID:           os.Getenv("CLOUDFLARE_TURN_KEY_ID"),
		ClerkSecretKey:                os.Getenv("CLERK_SECRET_KEY"),
		ClerkWebhookSecret:            os.Getenv("CLERK_WEBHOOK_SECRET"),
		S3Bucket:                      os.Getenv("S3_BUCKET"),
		S3Region:                      os.Getenv("S3_REGION"),
		S3Endpoint:                    os.Getenv("S3_ENDPOINT"),
		S3AccessKeyID:                 os.Getenv("S3_ACCESS_KEY_ID"),
		S3SecretAccessKey:             os.Getenv("S3_SECRET_ACCESS_KEY"),
		SupabaseURL:                   os.Getenv("SUPABASE_URL"),
		SupabaseServiceRoleKey:        os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
		InternalAPISocketPath:         os.Getenv("INTERNAL_API_SOCKET_PATH"),
		InternalAPIPort:               envInt("INTERNAL_API_PORT", 7271),
		RedisURL:                      os.Getenv("REDIS_URL"),
		RedisPort:                     os.Getenv("REDIS_PORT"),
		RedisUsername:                 os.Getenv("REDIS_USERNAME"),
		RedisPassword:                 os.Getenv("REDIS_PASSWORD"),
		UseMemoryMatchmaking:          os.Getenv("USE_MEMORY_MATCHMAKING") == "true",
		CacheNamespaceVersion:         envStr("CACHE_NAMESPACE_VERSION", "v1"),
		ShutdownTimeoutMs:             envInt("SHUTDOWN_TIMEOUT", 30000),
		JSONBodySizeLimit:             envStr("JSON_BODY_SIZE_LIMIT", "500kb"),
		SocketMaxHTTPBufferSize:       envInt("SOCKET_MAX_HTTP_BUFFER_SIZE", 8*1024*1024),
		RedisTimeoutMs:                envInt("REDIS_TIMEOUT", 5000),
		SupabaseTimeoutMs:             envInt("SUPABASE_TIMEOUT", 10000),
		RateLimitWindowMs:             envInt("RATE_LIMIT_WINDOW_MS", 30000),
		RateLimitMaxRequests:          envInt("RATE_LIMIT_MAX_REQUESTS", 100),
		OllamaEmbeddingURL:            os.Getenv("OLLAMA_EMBEDDING_URL"),
		OllamaEmbeddingModel:          envStr("OLLAMA_EMBEDDING_MODEL", "bge-m3"),
		OllamaCloudModel:              envStr("OLLAMA_CLOUD_MODEL", "ministral-3:14b"),
		OllamaAPIKey:                  os.Getenv("OLLAMA_API_KEY"),
		OllamaEmbeddingTimeout:        envInt("OLLAMA_EMBEDDING_TIMEOUT", 60000),
		EmbedMaxChunkChars:            clampInt(envInt("EMBED_MAX_CHUNK_CHARS", 1500), 1200, 1800),
		EmbedChunkOverlapChars:        clampInt(envInt("EMBED_CHUNK_OVERLAP_CHARS", 200), 150, 250),
		EmbedBatchSize:                clampInt(envInt("EMBED_BATCH_SIZE", 8), 1, 32),
		EmbedMaxChunksPerJob:          clampInt(envInt("EMBED_MAX_CHUNKS_PER_JOB", 64), 4, 256),
		EmbedMaxTotalInputCharsPerJob: maxInt(envInt("EMBED_MAX_TOTAL_INPUT_CHARS_PER_JOB", 200000), 8192),
		EmbedExpectedDimension:        envInt("EMBED_EXPECTED_DIMENSION", 1024),
		EmbedOllamaConcurrency:        clampInt(envInt("EMBED_OLLAMA_CONCURRENCY", 2), 1, 16),
		EmbedRetryCount:               clampInt(envInt("EMBED_RETRY_COUNT", 2), 0, 5),
		EmbedRetryBaseDelayMs:         maxInt(envInt("EMBED_RETRY_BASE_DELAY_MS", 400), 50),
		EmbedMaxBatchTotalChars:       maxInt(envInt("EMBED_MAX_BATCH_TOTAL_CHARS", 14000), 4096),
		VAPIDSubject:                  os.Getenv("VAPID_SUBJECT"),
		VAPIDPublicKey:                os.Getenv("VAPID_PUBLIC_KEY"),
		VAPIDPrivateKey:               os.Getenv("VAPID_PRIVATE_KEY"),
	}
	loaded = c
	return c
}

func loadDotenv() {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		return
	}
	dir := filepath.Dir(file)
	for i := 0; i < 6; i++ {
		dir = filepath.Dir(dir)
	}
	candidate := filepath.Join(dir, ".env")
	_ = godotenv.Load(candidate)
	_ = godotenv.Load()
}

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
	return out
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
