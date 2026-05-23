package graphql

import (
	"context"
	"errors"
	"net/http"
)

var ErrNativeNotImplemented = errors.New("graphql: native backend not implemented")

type NativeExecutor struct{}

func (NativeExecutor) Execute(ctx context.Context, req Request) (int, []byte, error) {
	_ = ctx
	_ = req
	return http.StatusServiceUnavailable, nil, ErrNativeNotImplemented
}
