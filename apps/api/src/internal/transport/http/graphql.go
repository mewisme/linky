package routes

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/app/graphql"
	"linky-api/src/internal/config"
	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/supax/graphqlclient"
	"linky-api/src/internal/logger"
	"linky-api/src/internal/transport/http/middleware"
)

var graphqlLog = logger.New("http:graphql")

type graphQLHTTPRequest struct {
	Query         string          `json:"query"`
	Variables     json.RawMessage `json:"variables"`
	OperationName string          `json:"operationName"`
}

func RegisterGraphQL(g *echo.Group, cfg *config.Config) {
	g.POST("/graphql", func(c echo.Context) error {
		return handleGraphQL(c, cfg)
	}, middleware.RateLimit(cfg))
}

func handleGraphQL(c echo.Context, cfg *config.Config) error {
	var body graphQLHTTPRequest
	if err := c.Bind(&body); err != nil {
		return httpx.SendError(c, http.StatusBadRequest, "Bad Request",
			httpx.UM("GRAPHQL_INVALID_BODY", "graphqlInvalidBody", "Invalid GraphQL request body"))
	}
	query := strings.TrimSpace(body.Query)
	if query == "" {
		return httpx.SendError(c, http.StatusBadRequest, "Bad Request",
			httpx.UM("GRAPHQL_QUERY_REQUIRED", "graphqlQueryRequired", "GraphQL query is required"))
	}

	auth := httpx.GetAuth(c)
	if auth != nil && body.OperationName != "" {
		graphqlLog.Info().
			Str("clerk_user_id", auth.Sub).
			Str("operation_name", body.OperationName).
			Msg("GraphQL request")
	}

	req := graphql.Request{
		Query:         query,
		Variables:     body.Variables,
		OperationName: strings.TrimSpace(body.OperationName),
	}

	gql := graphql.Default()
	if gql == nil {
		graphqlLog.Error().Msg("GraphQL app context not initialized")
		return httpx.SendError(c, http.StatusServiceUnavailable, "Service Unavailable",
			httpx.UM("GRAPHQL_UNAVAILABLE", "graphqlUnavailable", "GraphQL is not available"))
	}

	backend := strings.ToLower(strings.TrimSpace(cfg.GraphQLBackend))
	if backend == "" || backend == "supabase" {
		if !graphqlclient.Configured() {
			return httpx.SendError(c, http.StatusServiceUnavailable, "Service Unavailable",
				httpx.UM("GRAPHQL_UNAVAILABLE", "graphqlUnavailable", "GraphQL is not available"))
		}
	}

	status, respBody, err := gql.Execute(c.Request().Context(), req)
	if err != nil {
		if errors.Is(err, graphql.ErrNativeNotImplemented) {
			return httpx.SendError(c, http.StatusServiceUnavailable, "Service Unavailable",
				httpx.UM("GRAPHQL_NATIVE_UNAVAILABLE", "graphqlNativeUnavailable", "Native GraphQL backend is not available yet"))
		}
		graphqlLog.Error().Err(err).Msg("GraphQL execute failed")
		return httpx.SendError(c, http.StatusBadGateway, "Bad Gateway",
			httpx.UM("GRAPHQL_UPSTREAM_FAILED", "graphqlUpstreamFailed", "Failed to reach GraphQL upstream"))
	}
	if status == 0 {
		status = http.StatusOK
	}
	return c.Blob(status, echo.MIMEApplicationJSON, respBody)
}
