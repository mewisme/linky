package pgclient

import "context"

func RPC(ctx context.Context, fn string, body any) ([]byte, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	c, err := RequireClient()
	if err != nil {
		return nil, err
	}
	raw, err := c.RpcWithError(fn, "", body)
	if err != nil {
		return nil, err
	}
	return []byte(raw), nil
}
