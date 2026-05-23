package gqlx

import (
	"context"

	"github.com/99designs/gqlgen/graphql"
)

func AuthDirective(ctx context.Context, _ any, next graphql.Resolver) (any, error) {
	if err := RequireClerk(ctx); err != nil {
		return nil, err
	}
	return next(ctx)
}

func AdminDirective(ctx context.Context, _ any, next graphql.Resolver) (any, error) {
	if err := RequireAdmin(ctx); err != nil {
		return nil, err
	}
	return next(ctx)
}
