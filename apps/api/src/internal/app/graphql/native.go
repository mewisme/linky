package graphql

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"sync"

	"github.com/99designs/gqlgen/graphql/handler"

	"linky-api/src/internal/app/graphql/generated"
	"linky-api/src/internal/app/graphql/gqlx"
	"linky-api/src/internal/app/graphql/resolver"
)

var (
	nativeOnce    sync.Once
	nativeHandler http.Handler
)

func nativeHTTPHandler() http.Handler {
	nativeOnce.Do(func() {
		cfg := generated.Config{
			Resolvers: &resolver.Resolver{},
			Directives: generated.DirectiveRoot{
				Auth:  gqlx.AuthDirective,
				Admin: gqlx.AdminDirective,
			},
		}
		nativeHandler = handler.NewDefaultServer(generated.NewExecutableSchema(cfg))
	})
	return nativeHandler
}

type NativeExecutor struct{}

func (NativeExecutor) Execute(ctx context.Context, req Request) (int, []byte, error) {
	body := map[string]any{
		"query": req.Query,
	}
	if len(req.Variables) > 0 {
		var vars map[string]any
		if err := json.Unmarshal(req.Variables, &vars); err != nil {
			return http.StatusBadRequest, nil, err
		}
		body["variables"] = vars
	}
	if req.OperationName != "" {
		body["operationName"] = req.OperationName
	}
	raw, err := json.Marshal(body)
	if err != nil {
		return 0, nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, "/", bytes.NewReader(raw))
	if err != nil {
		return 0, nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	rec := &responseRecorder{header: make(http.Header), status: http.StatusOK}
	nativeHTTPHandler().ServeHTTP(rec, httpReq)
	return rec.status, rec.body.Bytes(), nil
}

type responseRecorder struct {
	header http.Header
	body   bytes.Buffer
	status int
}

func (r *responseRecorder) Header() http.Header {
	return r.header
}

func (r *responseRecorder) Write(b []byte) (int, error) {
	return r.body.Write(b)
}

func (r *responseRecorder) WriteHeader(statusCode int) {
	r.status = statusCode
}
