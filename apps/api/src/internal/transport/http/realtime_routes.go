package routes

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/domain/rooms"
	"linky-api/src/internal/app/videochat/realtime"
	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/cloudflarerealtime"
	"linky-api/src/internal/logger"
)

type RealtimeContext struct {
	Rooms                 *rooms.RoomService
	SFU                   *realtime.Service
	OwnerLookupBySocketID func(roomID, socketID string) string
}

var (
	realtimeCtx      *RealtimeContext
	realtimeRouteLog = logger.New("routes:video-chat:realtime")
)

func SetRealtimeContext(ctx *RealtimeContext) {
	realtimeCtx = ctx
}

func registerRealtimeRoutes(g *echo.Group) {
	g.POST("/session", handleRealtimeSession)
	g.POST("/publish", handleRealtimePublish)
	g.POST("/subscribe", handleRealtimeSubscribe)
	g.PUT("/renegotiate", handleRealtimeRenegotiate)
	g.POST("/cleanup", handleRealtimeCleanup)
}

type baseRealtimeBody struct {
	RoomID   string `json:"roomId"`
	SocketID string `json:"socketId"`
}

type sessionRealtimeBody struct {
	baseRealtimeBody
	SessionID string                             `json:"sessionId"`
	SDP       *cloudflarerealtime.SDPDescription `json:"sdp"`
}

type publishRealtimeBody struct {
	sessionRealtimeBody
	Tracks []publishTrack `json:"tracks"`
}

type publishTrack struct {
	MID       string `json:"mid"`
	TrackName string `json:"trackName"`
	Kind      string `json:"kind"`
}

func ensureRealtimeAvailable(c echo.Context) bool {
	if realtimeCtx == nil || realtimeCtx.SFU == nil || realtimeCtx.Rooms == nil {
		_ = httpx.SendError(c, http.StatusServiceUnavailable, "Service unavailable",
			httpx.UM("VIDEO_CHAT_UNAVAILABLE", "serviceUnavailable", "Service unavailable"))
		return false
	}
	if !cloudflarerealtime.IsConfigured() {
		_ = httpx.SendError(c, http.StatusServiceUnavailable, "Service unavailable",
			httpx.UM("REALTIME_NOT_CONFIGURED", "realtimeNotConfigured", "Realtime SFU not configured"))
		return false
	}
	return true
}

func authorizeRealtime(c echo.Context, base *baseRealtimeBody) (*rooms.Room, bool) {
	callerClerkID := httpx.MustClerkUserID(c)
	if callerClerkID == "" {
		_ = httpx.Unauthorized(c)
		return nil, false
	}
	access := realtimeCtx.SFU.Authorize(base.RoomID, base.SocketID, callerClerkID, func(p rooms.Participant) string {
		if realtimeCtx.OwnerLookupBySocketID == nil {
			return ""
		}
		return realtimeCtx.OwnerLookupBySocketID(base.RoomID, p.SocketID)
	})
	if !access.OK {
		status := access.Status
		if status == 0 {
			status = http.StatusInternalServerError
		}
		stext := http.StatusText(status)
		_ = httpx.SendError(c, status, stext,
			httpx.UM("REALTIME_"+access.Reason, "api.realtime.notAuthorized", access.Reason))
		return nil, false
	}
	return access.Room, true
}

func decodeBody(c echo.Context, dst any) error {
	raw, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return httpx.SendError(c, 400, "Bad Request", httpx.UMDetail("INVALID_BODY", err.Error()))
	}
	if len(raw) == 0 {
		return nil
	}
	if err := json.Unmarshal(raw, dst); err != nil {
		return httpx.SendError(c, 400, "Bad Request", httpx.UMDetail("INVALID_BODY", err.Error()))
	}
	return nil
}

func handleRealtimeSession(c echo.Context) error {
	if !ensureRealtimeAvailable(c) {
		return nil
	}
	var body baseRealtimeBody
	if err := decodeBody(c, &body); err != nil {
		return err
	}
	if body.RoomID == "" || body.SocketID == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("REALTIME_BAD_BODY", "realtimeInvalidBody", "Invalid roomId or socketId"))
	}
	room, ok := authorizeRealtime(c, &body)
	if !ok {
		return nil
	}
	participant, err := realtimeCtx.SFU.EnsureSession(c.Request().Context(), room, body.SocketID)
	if err != nil {
		return realtimeError(c, err)
	}
	snapshot := realtimeCtx.SFU.SnapshotPeer(room, body.SocketID)
	return c.JSON(http.StatusOK, map[string]any{
		"sessionId": participant.SessionID,
		"peer":      snapshot,
	})
}

func handleRealtimePublish(c echo.Context) error {
	if !ensureRealtimeAvailable(c) {
		return nil
	}
	var body publishRealtimeBody
	if err := decodeBody(c, &body); err != nil {
		return err
	}
	if body.RoomID == "" || body.SocketID == "" || body.SessionID == "" || body.SDP == nil {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("REALTIME_BAD_BODY", "realtimeInvalidBody", "Invalid sessionId or sdp"))
	}
	room, ok := authorizeRealtime(c, &body.baseRealtimeBody)
	if !ok {
		return nil
	}
	tracks := make([]realtime.PublishTrackMeta, 0, len(body.Tracks))
	for _, t := range body.Tracks {
		if t.MID == "" || t.TrackName == "" || (t.Kind != "audio" && t.Kind != "video") {
			continue
		}
		tracks = append(tracks, realtime.PublishTrackMeta{MID: t.MID, TrackName: t.TrackName, Kind: t.Kind})
	}
	if len(tracks) == 0 {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("REALTIME_BAD_BODY", "realtimeInvalidBody", "Invalid tracks"))
	}
	resp, err := realtimeCtx.SFU.Publish(c.Request().Context(), room, body.SocketID, body.SessionID, body.SDP, tracks)
	if err != nil {
		return realtimeError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]any{
		"sessionDescription":             resp.SessionDescription,
		"tracks":                         resp.Tracks,
		"requiresImmediateRenegotiation": resp.RequiresImmediateRenegotiation,
	})
}

func handleRealtimeSubscribe(c echo.Context) error {
	if !ensureRealtimeAvailable(c) {
		return nil
	}
	var body sessionRealtimeBody
	if err := decodeBody(c, &body); err != nil {
		return err
	}
	if body.RoomID == "" || body.SocketID == "" || body.SessionID == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("REALTIME_BAD_BODY", "realtimeInvalidBody", "Invalid sessionId"))
	}
	room, ok := authorizeRealtime(c, &body.baseRealtimeBody)
	if !ok {
		return nil
	}
	resp, err := realtimeCtx.SFU.Subscribe(c.Request().Context(), room, body.SocketID, body.SessionID)
	if err != nil {
		return realtimeError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]any{
		"sessionDescription":             resp.SessionDescription,
		"tracks":                         resp.Tracks,
		"requiresImmediateRenegotiation": resp.RequiresImmediateRenegotiation,
	})
}

func handleRealtimeRenegotiate(c echo.Context) error {
	if !ensureRealtimeAvailable(c) {
		return nil
	}
	var body sessionRealtimeBody
	if err := decodeBody(c, &body); err != nil {
		return err
	}
	if body.RoomID == "" || body.SocketID == "" || body.SessionID == "" || body.SDP == nil {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("REALTIME_BAD_BODY", "realtimeInvalidBody", "Invalid sessionId or sdp"))
	}
	room, ok := authorizeRealtime(c, &body.baseRealtimeBody)
	if !ok {
		return nil
	}
	resp, err := realtimeCtx.SFU.Renegotiate(c.Request().Context(), room, body.SocketID, body.SessionID, body.SDP)
	if err != nil {
		return realtimeError(c, err)
	}
	out := map[string]any{"ok": resp.ErrorCode == ""}
	if resp.ErrorCode != "" {
		out["errorCode"] = resp.ErrorCode
	}
	if resp.ErrorDescription != "" {
		out["errorDescription"] = resp.ErrorDescription
	}
	return c.JSON(http.StatusOK, out)
}

func handleRealtimeCleanup(c echo.Context) error {
	if !ensureRealtimeAvailable(c) {
		return nil
	}
	var body baseRealtimeBody
	if err := decodeBody(c, &body); err != nil {
		return err
	}
	if body.RoomID == "" || body.SocketID == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("REALTIME_BAD_BODY", "realtimeInvalidBody", "Invalid roomId or socketId"))
	}
	room := realtimeCtx.Rooms.ByID(body.RoomID)
	if room == nil {
		return c.JSON(http.StatusOK, map[string]any{"ok": true})
	}
	realtimeCtx.SFU.CleanupParticipant(c.Request().Context(), room, body.SocketID)
	return c.JSON(http.StatusOK, map[string]any{"ok": true})
}

func realtimeError(c echo.Context, err error) error {
	if cre, ok := err.(*cloudflarerealtime.Error); ok {
		status := cre.Status
		if status < 400 || status >= 600 {
			status = http.StatusBadGateway
		}
		code := cre.Code
		if code == "" {
			code = "REALTIME_ERROR"
		}
		message := cre.Message
		if message == "" {
			message = "Realtime error"
		}
		realtimeRouteLog.Warn().
			Err(err).
			Int("status", status).
			Str("errorCode", code).
			Str("message", message).
			Msg("Cloudflare realtime error")
		return httpx.SendError(c, status, http.StatusText(status),
			httpx.UM(code, "api.realtime.upstreamError", message))
	}
	realtimeRouteLog.Error().Err(err).Msg("Unexpected realtime error")
	return httpx.SendError(c, 500, "Internal Server Error",
		httpx.UM("REALTIME_INTERNAL", "internalServerError", "Internal server error"))
}
