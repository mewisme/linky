package routes

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/app/graphql"
	"linky-api/src/internal/app/graphql/gqlx"
	"linky-api/src/internal/config"
	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/admincache"
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
		return handleGraphQL(c)
	}, middleware.RateLimit(cfg))
}

func handleGraphQL(c echo.Context) error {
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
	if auth == nil || auth.Sub == "" {
		return httpx.Unauthorized(c)
	}

	if body.OperationName != "" {
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

	ctx := c.Request().Context()
	cfCountry := strings.TrimSpace(c.Request().Header.Get("cf-ipcountry"))
	if cfCountry == "" {
		cfCountry = strings.TrimSpace(c.Request().Header.Get("x-cf-ipcountry"))
	}
	role, err := admincache.GetRole(ctx, auth.Sub)
	if err != nil {
		graphqlLog.Error().Err(err).Str("clerk_user_id", auth.Sub).Msg("GraphQL role lookup failed")
		return httpx.SendError(c, http.StatusInternalServerError, "Internal Server Error",
			httpx.UM("GRAPHQL_ROLE_LOOKUP_FAILED", "graphqlRoleLookupFailed", "Failed to resolve user role"))
	}
	ctx = gqlx.WithRequestContext(ctx, auth.Sub, cfCountry, role)

	status, respBody, err := gql.Execute(ctx, req)
	if err != nil {
		graphqlLog.Error().Err(err).Msg("GraphQL execute failed")
		return httpx.SendError(c, http.StatusInternalServerError, "Internal Server Error",
			httpx.UM("GRAPHQL_EXECUTE_FAILED", "graphqlExecuteFailed", "GraphQL request failed"))
	}
	if status == 0 {
		status = http.StatusOK
	}
	return c.Blob(status, echo.MIMEApplicationJSON, respBody)
}
