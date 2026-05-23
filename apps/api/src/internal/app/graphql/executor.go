package graphql

import (
	"context"
	"encoding/json"
)

type Request struct {
	Query         string          `json:"query"`
	Variables     json.RawMessage `json:"variables,omitempty"`
	OperationName string          `json:"operationName,omitempty"`
}

type Executor interface {
	Execute(ctx context.Context, req Request) (statusCode int, body []byte, err error)
}
