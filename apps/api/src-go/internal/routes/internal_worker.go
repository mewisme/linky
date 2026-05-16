package routes

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"

	"github.com/labstack/echo/v4"

	"linky-api/src-go/internal/httpx"
	"linky-api/src-go/internal/infra/redisx"
	"linky-api/src-go/internal/logger"
	"linky-api/src-go/internal/sharedtypes"
	"linky-api/src-go/internal/worker"
)

const InternalWorkerV1Prefix = "/internal/worker/v1"

var workerLog = logger.New("api:internal:worker")

func RegisterInternalWorkerRoutes(g *echo.Group) {
	g.POST("/jobs", handleJobs)
}

func handleJobs(c echo.Context) error {
	idem := c.Request().Header.Get("Idempotency-Key")
	requestID := httpx.GetRequestID(c)
	if idem == "" {
		workerLog.Warn().Str("requestId", requestID).Msg("internal jobs missing Idempotency-Key")
		return httpx.SendError(c, http.StatusBadRequest, "Bad Request",
			httpx.UM("IDEMPOTENCY_KEY_REQUIRED", "idempotencyKeyRequired", "Idempotency-Key header is required"))
	}

	body, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return httpx.SendError(c, http.StatusBadRequest, "Bad Request",
			httpx.UMDetail("JOBS_VALIDATION", err.Error()))
	}

	parsed, err := sharedtypes.ParseAndValidate(body)
	if err != nil {
		workerLog.Warn().Str("requestId", requestID).Err(err).Msg("internal jobs validation failed")
		return httpx.SendError(c, http.StatusBadRequest, "Bad Request",
			httpx.UMDetail("JOBS_VALIDATION", err.Error()))
	}

	canonical, err := sharedtypes.CanonicalJSON(parsed)
	if err != nil {
		return httpx.SendError(c, http.StatusBadRequest, "Bad Request",
			httpx.UMDetail("JOBS_VALIDATION", err.Error()))
	}
	sum := sha256.Sum256(canonical)
	bodyHash := hex.EncodeToString(sum[:])

	outcome, err := redisx.TryReserveGeneralJobIdempotency(c.Request().Context(), idem, bodyHash)
	if err != nil {
		workerLog.Error().Err(err).Msg("idempotency reservation failed")
		return httpx.SendError(c, http.StatusInternalServerError, "Internal Server Error",
			httpx.UM("IDEMPOTENCY_FAILED", "idempotencyFailed", "Idempotency reservation failed"))
	}
	if outcome == redisx.IdemReplay {
		workerLog.Info().Str("requestId", requestID).Msg("internal jobs idempotent replay")
		return c.NoContent(http.StatusNoContent)
	}
	if outcome == redisx.IdemConflict {
		workerLog.Warn().Str("requestId", requestID).Msg("internal jobs idempotency conflict")
		return httpx.SendError(c, http.StatusConflict, "Conflict",
			httpx.UM("IDEMPOTENCY_CONFLICT", "idempotencyKeyBodyMismatch", "Idempotency-Key was used with a different body"))
	}

	if err := dispatch(c, parsed); err != nil {
		workerLog.Error().Err(err).Msg("internal jobs execution failed")
		redisx.ReleaseGeneralJobIdempotency(c.Request().Context(), idem)
		return httpx.SendError(c, http.StatusInternalServerError, "Internal Server Error",
			httpx.UM("JOB_EXECUTION_FAILED", "jobExecutionFailed", "Job execution failed"))
	}
	return c.NoContent(http.StatusNoContent)
}

func dispatch(c echo.Context, env *sharedtypes.ParsedEnvelope) error {
	ctx := c.Request().Context()
	switch env.Type {
	case sharedtypes.JobTypeReportAISummary:
		reportID, _ := env.Payload["reportId"].(string)
		force, _ := env.Payload["force"].(bool)
		return worker.ExecuteReportAISummary(ctx, reportID, force)
	case sharedtypes.JobTypeUserEmbeddingRegenerate:
		userID, _ := env.Payload["userId"].(string)
		return worker.ExecuteUserEmbeddingRegenerate(ctx, userID)
	case sharedtypes.JobTypeApplyCallExp:
		raw, _ := json.Marshal(env.Payload)
		var p worker.ApplyCallExpPayload
		_ = json.Unmarshal(raw, &p)
		return worker.ExecuteApplyCallExp(ctx, p)
	}
	return nil
}
