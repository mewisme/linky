package graphql

import (
	"context"
	"encoding/json"

	"linky-api/src/internal/infra/supax/graphqlclient"
)

type SupabaseProxyExecutor struct{}

func (SupabaseProxyExecutor) Execute(ctx context.Context, req Request) (int, []byte, error) {
	raw, err := json.Marshal(req)
	if err != nil {
		return 0, nil, err
	}
	return graphqlclient.Execute(ctx, raw)
}
