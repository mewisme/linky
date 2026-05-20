package realtime

import (
	"context"
	"errors"
	"sync"
	"time"

	socket "github.com/zishang520/socket.io/servers/socket/v3"

	"linky-api/src/internal/domains/rooms"
	"linky-api/src/internal/infra/cloudflarerealtime"
	"linky-api/src/internal/logger"
)

var log = logger.New("api:video-chat:realtime")

const peerTracksEvent = "realtime:peer-tracks"

type AccessOutcome struct {
	OK     bool
	Status int
	Reason string
	Room   *rooms.Room
}

type Service struct {
	rooms *rooms.RoomService
	emit  func(socketID string, event string, payload interface{})
	mu    sync.Mutex
}

func New(rs *rooms.RoomService, emit func(string, string, interface{})) *Service {
	return &Service{rooms: rs, emit: emit}
}

func (s *Service) Authorize(roomID, socketID, callerClerkID string, ownerLookup func(participant rooms.Participant) string) AccessOutcome {
	if s == nil {
		return AccessOutcome{Status: 503, Reason: "SERVICE_UNAVAILABLE"}
	}
	room := s.rooms.ByID(roomID)
	if room == nil {
		return AccessOutcome{Status: 404, Reason: "ROOM_NOT_FOUND"}
	}
	var matched *rooms.Participant
	for i := range room.Participants {
		if room.Participants[i].SocketID == socketID {
			matched = &room.Participants[i]
			break
		}
	}
	if matched == nil {
		return AccessOutcome{Status: 403, Reason: "SOCKET_NOT_IN_ROOM"}
	}
	if ownerLookup != nil {
		owner := ownerLookup(*matched)
		if owner == "" || owner != callerClerkID {
			return AccessOutcome{Status: 403, Reason: "SOCKET_OWNERSHIP_MISMATCH"}
		}
	}
	return AccessOutcome{OK: true, Room: room}
}

func (s *Service) EnsureSession(ctx context.Context, room *rooms.Room, socketID string) (*rooms.RealtimeParticipant, error) {
	if !cloudflarerealtime.IsConfigured() {
		return nil, &cloudflarerealtime.Error{Status: 500, Code: "REALTIME_NOT_CONFIGURED", Message: "Cloudflare Realtime not configured"}
	}
	s.mu.Lock()
	if room.Realtime == nil {
		room.Realtime = &rooms.Realtime{Participants: map[string]*rooms.RealtimeParticipant{}}
	}
	existing := room.Realtime.Participants[socketID]
	s.mu.Unlock()

	if existing != nil {
		if err := cloudflarerealtime.GetSession(ctx, existing.SessionID); err == nil {
			return existing, nil
		} else if cloudflarerealtime.IsStaleSession(err) {
			s.cleanupParticipantSession(ctx, existing)
			s.mu.Lock()
			delete(room.Realtime.Participants, socketID)
			s.mu.Unlock()
		} else {
			return nil, err
		}
	}

	created, err := cloudflarerealtime.CreateSession(ctx, nil)
	if err != nil {
		return nil, err
	}
	if created.SessionID == "" {
		return nil, &cloudflarerealtime.Error{Status: 502, Code: created.ErrorCode, Message: "Cloudflare did not return a sessionId"}
	}
	p := &rooms.RealtimeParticipant{
		SessionID:   created.SessionID,
		SocketID:    socketID,
		CreatedAtMs: time.Now().UnixMilli(),
	}
	s.mu.Lock()
	if room.Realtime == nil {
		room.Realtime = &rooms.Realtime{Participants: map[string]*rooms.RealtimeParticipant{}}
	}
	room.Realtime.Participants[socketID] = p
	s.mu.Unlock()
	log.Info().Str("roomId", room.ID).Str("socketId", socketID).Str("sessionId", created.SessionID).Msg("Created Cloudflare session")
	return p, nil
}

type PeerSnapshot struct {
	PeerSessionID string                   `json:"peerSessionId"`
	Tracks        []map[string]interface{} `json:"tracks"`
}

func (s *Service) SnapshotPeer(room *rooms.Room, socketID string) PeerSnapshot {
	if room.Realtime == nil {
		return PeerSnapshot{Tracks: []map[string]interface{}{}}
	}
	peerSocketID := s.peerSocketID(room, socketID)
	peer := room.Realtime.Participants[peerSocketID]
	if peer == nil {
		return PeerSnapshot{Tracks: []map[string]interface{}{}}
	}
	tracks := make([]map[string]interface{}, 0, len(peer.PublishedTracks))
	for _, t := range peer.PublishedTracks {
		tracks = append(tracks, map[string]interface{}{
			"trackName": t.TrackName,
			"kind":      t.Kind,
			"source":    t.Source,
		})
	}
	return PeerSnapshot{PeerSessionID: peer.SessionID, Tracks: tracks}
}

type PublishTrackMeta struct {
	MID       string
	TrackName string
	Kind      string
}

func (s *Service) Publish(ctx context.Context, room *rooms.Room, socketID, sessionID string, sdp *cloudflarerealtime.SDPDescription, tracks []PublishTrackMeta) (*cloudflarerealtime.TracksResponse, error) {
	if room.Realtime == nil {
		return nil, &cloudflarerealtime.Error{Status: 404, Code: "ROOM_NOT_FOUND", Message: "Room realtime state missing"}
	}
	participant := room.Realtime.Participants[socketID]
	if participant == nil || participant.SessionID != sessionID {
		return nil, &cloudflarerealtime.Error{Status: 403, Code: "REALTIME_SESSION_MISMATCH", Message: "Session does not belong to participant"}
	}
	if len(tracks) == 0 {
		return nil, &cloudflarerealtime.Error{Status: 400, Code: "REALTIME_NO_LOCAL_TRACKS", Message: "No local tracks to publish"}
	}
	req := &cloudflarerealtime.TracksRequest{
		SessionDescription: sdp,
		Tracks:             make([]cloudflarerealtime.TrackRequest, 0, len(tracks)),
	}
	kindByName := map[string]string{}
	for _, t := range tracks {
		kindByName[t.TrackName] = t.Kind
		req.Tracks = append(req.Tracks, cloudflarerealtime.TrackRequest{
			Location:  "local",
			MID:       t.MID,
			TrackName: t.TrackName,
		})
	}
	resp, err := cloudflarerealtime.AddTracks(ctx, sessionID, req)
	if err != nil {
		return nil, err
	}
	newTracks := make([]rooms.RealtimeTrack, 0, len(resp.Tracks))
	for _, t := range resp.Tracks {
		if t.TrackName == "" {
			continue
		}
		kind := kindByName[t.TrackName]
		if kind == "" {
			kind = t.Kind
		}
		if kind == "" {
			kind = "video"
		}
		newTracks = append(newTracks, rooms.RealtimeTrack{
			TrackName: t.TrackName,
			MID:       t.MID,
			Kind:      kind,
			Source:    inferSource(kind),
		})
	}
	participant.PublishedTracks = mergeTracks(participant.PublishedTracks, newTracks)
	s.emitPeerTracks(room, socketID)
	return resp, nil
}

func (s *Service) Subscribe(ctx context.Context, room *rooms.Room, socketID, sessionID string) (*cloudflarerealtime.TracksResponse, error) {
	if room.Realtime == nil {
		return nil, &cloudflarerealtime.Error{Status: 404, Code: "ROOM_NOT_FOUND", Message: "Room realtime state missing"}
	}
	participant := room.Realtime.Participants[socketID]
	if participant == nil || participant.SessionID != sessionID {
		return nil, &cloudflarerealtime.Error{Status: 403, Code: "REALTIME_SESSION_MISMATCH", Message: "Session does not belong to participant"}
	}
	peerSocketID := s.peerSocketID(room, socketID)
	peer := room.Realtime.Participants[peerSocketID]
	if peer == nil {
		return nil, &cloudflarerealtime.Error{Status: 409, Code: "REALTIME_PEER_NOT_READY", Message: "Peer has not published yet"}
	}
	if len(peer.PublishedTracks) == 0 {
		return nil, &cloudflarerealtime.Error{Status: 409, Code: "REALTIME_PEER_NO_TRACKS", Message: "Peer has no tracks"}
	}
	tracks := make([]cloudflarerealtime.TrackRequest, 0, len(peer.PublishedTracks))
	for _, t := range peer.PublishedTracks {
		req := cloudflarerealtime.TrackRequest{
			Location:  "remote",
			SessionID: peer.SessionID,
			TrackName: t.TrackName,
		}
		if t.Kind == "video" {
			req.Simulcast = map[string]interface{}{
				"preferredRid":     "h",
				"priorityOrdering": "asciibetical",
				"ridNotAvailable":  "asciibetical",
			}
		}
		tracks = append(tracks, req)
	}
	resp, err := cloudflarerealtime.AddTracks(ctx, sessionID, &cloudflarerealtime.TracksRequest{Tracks: tracks})
	if err != nil {
		return nil, err
	}
	mids := make([]string, 0, len(resp.Tracks))
	for _, t := range resp.Tracks {
		if t.MID != "" {
			mids = append(mids, t.MID)
		}
	}
	merged := uniqueStrings(append(participant.SubscribedMids, mids...))
	participant.SubscribedMids = merged
	return resp, nil
}

func (s *Service) Renegotiate(ctx context.Context, room *rooms.Room, socketID, sessionID string, sdp *cloudflarerealtime.SDPDescription) (*cloudflarerealtime.RenegotiateResponse, error) {
	if room.Realtime == nil {
		return nil, &cloudflarerealtime.Error{Status: 404, Code: "ROOM_NOT_FOUND", Message: "Room realtime state missing"}
	}
	participant := room.Realtime.Participants[socketID]
	if participant == nil || participant.SessionID != sessionID {
		return nil, &cloudflarerealtime.Error{Status: 403, Code: "REALTIME_SESSION_MISMATCH", Message: "Session does not belong to participant"}
	}
	resp, err := cloudflarerealtime.Renegotiate(ctx, sessionID, &cloudflarerealtime.RenegotiateRequest{SessionDescription: sdp})
	if err != nil {
		if cloudflarerealtime.IsStaleSession(err) {
			return &cloudflarerealtime.RenegotiateResponse{}, nil
		}
		return nil, err
	}
	return resp, nil
}

func (s *Service) CleanupParticipant(_ context.Context, room *rooms.Room, socketID string) {
	if room == nil || room.Realtime == nil {
		return
	}
	s.mu.Lock()
	p := room.Realtime.Participants[socketID]
	if p != nil {
		delete(room.Realtime.Participants, socketID)
		if len(room.Realtime.Participants) == 0 {
			room.Realtime = nil
		}
	}
	s.mu.Unlock()
	if p != nil {
		go s.cleanupParticipantSession(context.Background(), p)
	}
}

func (s *Service) CleanupRoom(_ context.Context, room *rooms.Room) {
	if room == nil || room.Realtime == nil {
		return
	}
	s.mu.Lock()
	participants := room.Realtime.Participants
	room.Realtime = nil
	s.mu.Unlock()
	for _, p := range participants {
		p := p
		go s.cleanupParticipantSession(context.Background(), p)
	}
}

func (s *Service) cleanupParticipantSession(ctx context.Context, p *rooms.RealtimeParticipant) {
	if p == nil {
		return
	}
	tracks := make([]cloudflarerealtime.TrackRequest, 0, len(p.SubscribedMids)+len(p.PublishedTracks))
	for _, mid := range p.SubscribedMids {
		tracks = append(tracks, cloudflarerealtime.TrackRequest{MID: mid})
	}
	for _, t := range p.PublishedTracks {
		if t.MID != "" {
			tracks = append(tracks, cloudflarerealtime.TrackRequest{MID: t.MID})
		}
	}
	if len(tracks) == 0 {
		return
	}
	cctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	if _, err := cloudflarerealtime.CloseTracks(cctx, p.SessionID, &cloudflarerealtime.CloseTracksRequest{Tracks: tracks, Force: true}); err != nil {
		if cloudflarerealtime.IsStaleSession(err) {
			return
		}
		log.Debug().Err(err).Str("sessionId", p.SessionID).Msg("Failed to close Cloudflare tracks (best-effort)")
	}
}

func (s *Service) emitPeerTracks(room *rooms.Room, publisherSocketID string) {
	if room.Realtime == nil {
		return
	}
	publisher := room.Realtime.Participants[publisherSocketID]
	if publisher == nil {
		return
	}
	peerSocketID := s.peerSocketID(room, publisherSocketID)
	if peerSocketID == "" {
		return
	}
	tracks := make([]map[string]interface{}, 0, len(publisher.PublishedTracks))
	for _, t := range publisher.PublishedTracks {
		tracks = append(tracks, map[string]interface{}{
			"trackName": t.TrackName,
			"kind":      t.Kind,
			"source":    t.Source,
		})
	}
	payload := map[string]interface{}{
		"peerSessionId": publisher.SessionID,
		"tracks":        tracks,
	}
	if s.emit != nil {
		s.emit(peerSocketID, peerTracksEvent, payload)
	}
}

func (s *Service) peerSocketID(room *rooms.Room, socketID string) string {
	if room.Participants[0].SocketID == socketID {
		return room.Participants[1].SocketID
	}
	if room.Participants[1].SocketID == socketID {
		return room.Participants[0].SocketID
	}
	return ""
}

func inferSource(kind string) string {
	if kind == "audio" {
		return "microphone"
	}
	return "camera"
}

func mergeTracks(existing, incoming []rooms.RealtimeTrack) []rooms.RealtimeTrack {
	idx := map[string]int{}
	for i, t := range existing {
		idx[t.TrackName] = i
	}
	for _, t := range incoming {
		if i, ok := idx[t.TrackName]; ok {
			existing[i] = t
		} else {
			existing = append(existing, t)
			idx[t.TrackName] = len(existing) - 1
		}
	}
	return existing
}

func uniqueStrings(in []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(in))
	for _, s := range in {
		if s == "" {
			continue
		}
		if _, ok := seen[s]; ok {
			continue
		}
		seen[s] = struct{}{}
		out = append(out, s)
	}
	return out
}

func IsZeroSocket(s *socket.Socket) bool {
	return s == nil
}

var ErrServiceUnavailable = errors.New("realtime service unavailable")
