package graphql

import (
	"context"
	"errors"

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

func Init() {
	defaultCtx = &Context{exec: NativeExecutor{}}
	log.Info().Msg("GraphQL: gqlgen (Clerk auth, Supabase user roles)")
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
