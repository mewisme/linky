package api

import (
	"context"
	"io"
	"net"
	"net/http"
	"path/filepath"
	"sync/atomic"
	"testing"
)

func TestNewInternalAPIClient_TCPHasDialContext(t *testing.T) {
	cfg := EnvConfig{InternalAPIBaseURL: "http://example.com"}
	client := newInternalAPIClient(cfg)
	transport, ok := client.Transport.(*http.Transport)
	if !ok {
		t.Fatal("expected *http.Transport")
	}
	if transport.DialContext == nil {
		t.Fatal("expected DialContext to be configured for TCP")
	}
}

func TestInternalAPIURL_PrefersSocket(t *testing.T) {
	socketCfg := EnvConfig{
		InternalAPIBaseURL:    "http://api:7270",
		InternalAPISocketPath: "/var/run/linky-api/api.sock",
	}
	if got := internalAPIURL(socketCfg); got != "http://unix"+internalWorkerJobsPath {
		t.Fatalf("expected unix URL when socket path set, got %q", got)
	}

	tcpCfg := EnvConfig{InternalAPIBaseURL: "http://api:7270/"}
	if got := internalAPIURL(tcpCfg); got != "http://api:7270"+internalWorkerJobsPath {
		t.Fatalf("expected base URL with trailing slash trimmed, got %q", got)
	}
}

func TestNewInternalAPIClient_DialsUnixSocket(t *testing.T) {
	socketPath := filepath.Join(t.TempDir(), "api.sock")

	listener, err := net.Listen("unix", socketPath)
	if err != nil {
		t.Skipf("unix sockets not supported in test env: %v", err)
	}
	defer listener.Close()

	var hits atomic.Int32
	srv := &http.Server{
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			hits.Add(1)
			if r.URL.Path != internalWorkerJobsPath {
				t.Errorf("unexpected path %q", r.URL.Path)
			}
			w.WriteHeader(http.StatusNoContent)
		}),
	}
	go func() { _ = srv.Serve(listener) }()
	defer func() { _ = srv.Shutdown(context.Background()) }()

	cfg := EnvConfig{
		InternalAPISocketPath:       socketPath,
		InternalAPITimeoutMs:        5000,
		InternalAPIMaxRetries:       0,
		InternalAPIRetryBaseDelayMs: 100,
	}

	client := newInternalAPIClient(cfg)
	url := internalAPIURL(cfg)

	req, err := http.NewRequest(http.MethodPost, url, nil)
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("client.Do over unix socket: %v", err)
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, resp.Body)

	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("expected 204 from unix listener, got %d", resp.StatusCode)
	}
	if hits.Load() != 1 {
		t.Fatalf("expected 1 listener hit, got %d", hits.Load())
	}
}
