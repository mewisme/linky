package supax

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"

	"linky-api/src/internal/config"
)

var rpcCfg *config.Config

func InitRPC(c *config.Config) {
	rpcCfg = c
}

func RPC(ctx context.Context, fn string, body any) ([]byte, error) {
	if rpcCfg == nil || rpcCfg.SupabaseURL == "" || rpcCfg.SupabaseServiceRoleKey == "" {
		return nil, errors.New("supabase rpc not configured")
	}
	url := rpcCfg.SupabaseURL + "/rest/v1/rpc/" + fn
	buf, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(buf))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", rpcCfg.SupabaseServiceRoleKey)
	req.Header.Set("Authorization", "Bearer "+rpcCfg.SupabaseServiceRoleKey)
	req.Header.Set("Prefer", "return=representation")
	timeout := time.Duration(rpcCfg.SupabaseTimeoutMs) * time.Millisecond
	if timeout <= 0 {
		timeout = 10 * time.Second
	}
	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, errors.New("rpc " + fn + " status " + resp.Status + " body " + string(raw))
	}
	return raw, nil
}
