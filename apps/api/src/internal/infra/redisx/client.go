package redisx

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"io"
	"net"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"

	"linky-api/src/internal/config"
	"linky-api/src/internal/lib/staleproc"
	"linky-api/src/internal/logger"
)

const (
	// BLMOVE in the job pool blocks up to 5s; go-redis defaults ReadTimeout to 3s,
	// which closes the socket mid-block and surfaces as EOF / broken pipe.
	blockingReadTimeout = 60 * time.Second
	reconnectCooldown   = 2 * time.Second
)

var (
	cfg            *config.Config
	client         *redis.Client
	clientReady    bool
	clientMu       sync.RWMutex
	lastReconnect  time.Time
	reconnectMu    sync.Mutex
	log            = logger.New("infra:redis")
)

func Init(c *config.Config) {
	cfg = c
}

func Connect(ctx context.Context) error {
	clientMu.Lock()
	defer clientMu.Unlock()
	return connectLocked(ctx)
}

func connectLocked(ctx context.Context) error {
	if cfg == nil {
		return errors.New("redisx: config not initialized")
	}
	opts, err := buildOptions()
	if err != nil {
		return err
	}
	if opts == nil {
		return errors.New("redisx: REDIS_URL is empty; queue disabled")
	}
	if client != nil {
		_ = client.Close()
		client = nil
		clientReady = false
	}
	c := redis.NewClient(opts)
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := c.Ping(pingCtx).Err(); err != nil {
		_ = c.Close()
		return wrapConnectError(opts, err)
	}
	client = c
	clientReady = true
	log.Info().Str("addr", opts.Addr).Bool("tls", opts.TLSConfig != nil).
		Dur("readTimeout", opts.ReadTimeout).Int("poolSize", opts.PoolSize).Msg("Redis connected")
	return nil
}

func Reconnect(ctx context.Context) error {
	reconnectMu.Lock()
	defer reconnectMu.Unlock()
	if time.Since(lastReconnect) < reconnectCooldown {
		return nil
	}
	lastReconnect = time.Now()

	clientMu.Lock()
	defer clientMu.Unlock()
	log.Warn().Msg("Redis connection lost; reconnecting")
	return connectLocked(ctx)
}

func IsConnError(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, io.EOF) || errors.Is(err, io.ErrUnexpectedEOF) ||
		errors.Is(err, net.ErrClosed) || errors.Is(err, syscall.EPIPE) ||
		errors.Is(err, syscall.ECONNRESET) || errors.Is(err, syscall.ECONNABORTED) {
		return true
	}
	if errors.Is(err, redis.ErrClosed) {
		return true
	}
	var netErr net.Error
	if errors.As(err, &netErr) && netErr.Timeout() {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "broken pipe") ||
		strings.Contains(msg, "connection reset") ||
		strings.Contains(msg, "use of closed network connection")
}

func applyClientOptions(o *redis.Options) {
	o.ReadTimeout = blockingReadTimeout
	if o.WriteTimeout == 0 {
		o.WriteTimeout = 10 * time.Second
	}
	size := poolSizeFor(cfg)
	o.PoolSize = size
	o.MinIdleConns = 0
	o.MaxIdleConns = size / 2
	if o.MaxIdleConns < 1 {
		o.MaxIdleConns = 1
	}
	o.ConnMaxIdleTime = 3 * time.Minute
}

func poolSizeFor(c *config.Config) int {
	if c == nil {
		return 6
	}
	conc := c.JobWorkerConcurrency
	if conc <= 0 {
		conc = 4
	}
	size := conc + 2
	if size > 10 {
		size = 10
	}
	return size
}

func wrapConnectError(opts *redis.Options, err error) error {
	if err == nil {
		return nil
	}
	if isMaxClientsError(opts, err) {
		return fmt.Errorf("%w: %s", err, staleproc.FormatMaxClientsHint())
	}
	return err
}

func isMaxClientsError(opts *redis.Options, err error) bool {
	if !IsConnError(err) {
		return false
	}
	msg, probeErr := probeRedisError(opts)
	if probeErr != nil {
		return false
	}
	return strings.Contains(strings.ToLower(msg), "max number of clients")
}

func probeRedisError(opts *redis.Options) (string, error) {
	if opts == nil {
		return "", errors.New("no options")
	}
	dialer := &net.Dialer{Timeout: 3 * time.Second}
	conn, err := dialer.Dial("tcp", opts.Addr)
	if err != nil {
		return "", err
	}
	defer conn.Close()

	if opts.TLSConfig != nil {
		tlsCfg := opts.TLSConfig.Clone()
		if tlsCfg.ServerName == "" {
			host, _, splitErr := net.SplitHostPort(opts.Addr)
			if splitErr == nil {
				tlsCfg.ServerName = host
			}
		}
		conn = tls.Client(conn, tlsCfg)
	}

	if err := conn.SetDeadline(time.Now().Add(3 * time.Second)); err != nil {
		return "", err
	}
	if _, err := conn.Write([]byte("*1\r\n$4\r\nPING\r\n")); err != nil {
		return "", err
	}
	buf := make([]byte, 256)
	n, err := conn.Read(buf)
	if err != nil {
		return "", err
	}
	return string(buf[:n]), nil
}

func buildOptions() (*redis.Options, error) {
	url := strings.TrimSpace(cfg.RedisURL)
	if url == "" {
		return nil, nil
	}

	if strings.HasPrefix(url, "redis://") || strings.HasPrefix(url, "rediss://") {
		o, err := redis.ParseURL(url)
		if err != nil {
			return nil, fmt.Errorf("redisx: invalid REDIS_URL: %w", err)
		}
		if cfg.RedisUsername != "" {
			o.Username = cfg.RedisUsername
		}
		if cfg.RedisPassword != "" {
			o.Password = cfg.RedisPassword
		}
		applyClientOptions(o)
		return o, nil
	}

	host := url
	port, _ := strconv.Atoi(cfg.RedisPort)
	if port == 0 {
		port = 6379
	}
	o := &redis.Options{
		Addr:     fmt.Sprintf("%s:%d", host, port),
		Username: cfg.RedisUsername,
		Password: cfg.RedisPassword,
	}
	applyClientOptions(o)
	return o, nil
}

func Client() *redis.Client {
	clientMu.RLock()
	defer clientMu.RUnlock()
	return client
}

func IsOpen() bool {
	clientMu.RLock()
	defer clientMu.RUnlock()
	return clientReady && client != nil
}

func Close() error {
	clientMu.Lock()
	defer clientMu.Unlock()
	if client == nil {
		return nil
	}
	err := client.Close()
	client = nil
	clientReady = false
	return err
}
