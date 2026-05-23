package graphql

import (
	"context"
	"errors"
	"strings"

	"linky-api/src/internal/config"
	"linky-api/src/internal/logger"
)

var errNotInitialized = errors.New("graphql: not initialized")

var (
	defaultCtx *Context
	log        = logger.New("app:graphql")
)

type Context struct {
	exec Executor
}

func Init(cfg *config.Config) {
	var exec Executor
	switch strings.ToLower(strings.TrimSpace(cfg.GraphQLBackend)) {
	case "native":
		exec = NativeExecutor{}
		log.Info().Msg("GraphQL backend: native (gqlgen placeholder)")
	default:
		exec = SupabaseProxyExecutor{}
		log.Info().Msg("GraphQL backend: supabase proxy")
	}
	defaultCtx = &Context{exec: exec}
}

func Default() *Context {
	return defaultCtx
}

func (c *Context) Execute(ctx context.Context, req Request) (int, []byte, error) {
	if c == nil || c.exec == nil {
		return 0, nil, errNotInitialized
	}
	return c.exec.Execute(ctx, req)
}
