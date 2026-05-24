package resolver

import (
	"context"

	"linky-api/src/internal/app/graphql/generated"
	"linky-api/src/internal/app/graphql/gqlx"
	"linky-api/src/internal/infra/supax"
)

func (r *adminResolver) adminGenericTable(ctx context.Context, table string, limit *int, offset *int) (*generated.GenericTablePage, error) {
	lim := gqlx.IntDefault(limit, 50)
	off := gqlx.IntDefault(offset, 0)
	rows, count, err := supax.ListGenericTable(ctx, table, lim, off)
	if err != nil {
		return nil, gqlx.AsGraphQLError(gqlx.ErrInternal("FAILED_FETCH_TABLE", "failedFetchTable", "Failed to fetch records", err))
	}
	if rows == nil {
		rows = []map[string]any{}
	}
	data, err := gqlx.ToAny(rows)
	if err != nil {
		return nil, gqlx.AsGraphQLError(err)
	}
	return &generated.GenericTablePage{
		Data:  data,
		Count: int(count),
	}, nil
}
