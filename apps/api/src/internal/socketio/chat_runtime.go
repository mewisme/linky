package socketio

import (
	"context"
	"strings"
	"sync"
	"time"

	socket "github.com/zishang520/socket.io/servers/socket/v3"
	"github.com/zishang520/socket.io/v3/pkg/types"

	"linky-api/src/internal/contexts"
	"linky-api/src/internal/contexts/callended"
	"linky-api/src/internal/domains/matchmaking"
	"linky-api/src/internal/domains/rooms"
	"linky-api/src/internal/domains/user/progress"
	"linky-api/src/internal/domains/videochat/realtime"
	"linky-api/src/internal/infra/cloudflarerealtime"
	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/jobs"
	"linky-api/src/internal/logger"
)

const (
	matchTickInterval     = 1 * time.Second
	roomHeartbeatInterval = 5 * time.Second
	staleCleanupInterval  = 30 * time.Second
	queueWaitMax          = 5 * time.Minute

	mediaProviderSFU = "sfu"

	streakCompletedEvent = "streak:completed"
	levelUpEvent         = "level:up"
)

type chatRuntime struct {
	chat        socket.Namespace
	queue       *matchmaking.MemoryStore
	rooms       *rooms.RoomService
	sfu         *realtime.Service
	mu          sync.Mutex
	stopMatch   chan struct{}
	stopHB      chan struct{}
	stopCleanup chan struct{}

	queueWaiting   map[string]time.Time
	queueWaitingMu sync.Mutex
}

var socketLog = logger.New("api:socket:chat")

func newChatRuntime(chat socket.Namespace) *chatRuntime {
	rs := rooms.NewService()
	r := &chatRuntime{
		chat:         chat,
		queue:        matchmaking.NewMemoryStore(),
		rooms:        rs,
		stopMatch:    make(chan struct{}),
		stopHB:       make(chan struct{}),
		stopCleanup:  make(chan struct{}),
		queueWaiting: map[string]time.Time{},
	}
	r.sfu = realtime.New(rs, r.emitToSocket)
	go r.runMatchTick()
	go r.runHeartbeat()
	go r.runStaleCleanup()
	return r
}

func (r *chatRuntime) close() {
	close(r.stopMatch)
	close(r.stopHB)
	close(r.stopCleanup)
}

func (r *chatRuntime) attach(s *socket.Socket) {
	uid := userIDFromSocket(s)
	uname, uimg := userInfoFromSocket(s)

	dbUserID := ""
	if uid != "" {
		if id, err := supax.GetUserInternalID(context.Background(), uid); err == nil {
			dbUserID = id
		}
	}
	saveDBUserID(s, dbUserID)

	s.On("message", func(args ...any) { r.onGenericMessage(s, args) })
	s.On("join-room", func(args ...any) { r.onJoinRoom(s, args) })
	s.On("leave-room", func(args ...any) { r.onLeaveRoom(s, args) })

	s.On("join", func(args ...any) { r.onJoin(s, dbUserID, uname, uimg) })
	s.On("skip", func(args ...any) { r.onSkip(s, dbUserID) })
	s.On("signal", func(args ...any) { r.onSignal(s, args) })
	s.On("end-call", func(args ...any) { r.onEndCall(s) })
	s.On("resync-room-state", func(args ...any) { r.onResyncRoom(s) })
	s.On("resync-session", func(args ...any) { r.onResyncSession(s, args) })

	s.On("chat:send", func(args ...any) { r.onChatSend(s, args, uname) })
	s.On("chat:attachment:send", func(args ...any) { r.onChatSend(s, args, uname) })
	s.On("chat:typing", func(args ...any) { r.forwardToPeer(s, "chat:typing", args) })
	s.On("mute-toggle", func(args ...any) { r.forwardToPeer(s, "mute-toggle", args) })
	s.On("video-toggle", func(args ...any) { r.forwardToPeer(s, "video-toggle", args) })
	s.On("screen-share:toggle", func(args ...any) { r.onScreenShareToggle(s, args, uname) })
	s.On("reaction:triggered", func(args ...any) { r.forwardToPeer(s, "reaction:triggered", args) })
	s.On("favorite:notify-peer", func(args ...any) { r.onFavoriteNotify(s, args, uname) })

	s.On("client:visibility:foreground", func(args ...any) { setVisibility(s, "foreground") })
	s.On("client:visibility:background", func(args ...any) { setVisibility(s, "background") })
	s.On("client:presence", func(args ...any) { handlePresenceEvent(s, args) })

	s.On("disconnect", func(args ...any) { r.onDisconnect(s, dbUserID) })
}

func (r *chatRuntime) onGenericMessage(s *socket.Socket, args []any) {
	if len(args) == 0 {
		return
	}
	data, _ := args[0].(map[string]any)
	if data == nil {
		return
	}
	if _, ok := data["userId"].(string); !ok {
		uid := userIDFromSocket(s)
		if uid == "" {
			uid = "unknown"
		}
		data["userId"] = uid
	}
	if _, ok := data["timestamp"]; !ok {
		data["timestamp"] = time.Now().UnixMilli()
	}
	_ = r.chat.Emit("message", data)
}

func (r *chatRuntime) onJoinRoom(s *socket.Socket, args []any) {
	if len(args) == 0 {
		return
	}
	room, _ := args[0].(string)
	if room == "" {
		return
	}
	s.Join(socket.Room(room))
	r.chat.To(socket.Room(room)).Emit("user-joined", map[string]any{"socketId": string(s.Id()), "room": room})
}

func (r *chatRuntime) onLeaveRoom(s *socket.Socket, args []any) {
	if len(args) == 0 {
		return
	}
	room, _ := args[0].(string)
	if room == "" {
		return
	}
	s.Leave(socket.Room(room))
	r.chat.To(socket.Room(room)).Emit("user-left", map[string]any{"socketId": string(s.Id()), "room": room})
}

func (r *chatRuntime) onJoin(s *socket.Socket, dbUserID, _, _ string) {
	if r.rooms.BySocket(string(s.Id())) != nil {
		emitVideoChatError(s, "JOIN_ALREADY_IN_ROOM", "call.join.alreadyInRoom", "Already in a room. Please disconnect first.")
		return
	}
	if dbUserID == "" {
		emitVideoChatError(s, "JOIN_NO_USER", "call.join.userNotFound", "User not found")
		return
	}
	added := r.queue.Enqueue(dbUserID, string(s.Id()))
	if !added {
		emitVideoChatError(s, "JOIN_ALREADY_IN_QUEUE", "call.join.alreadyInQueue", "Already in queue.")
		return
	}
	r.markQueueWaiting(dbUserID)
	queueSize := r.queue.Size()
	_ = s.Emit("joined-queue", map[string]any{
		"message":     "Waiting for a match...",
		"userMessage": userMessage("JOIN_WAITING", "call.join.waitingForMatch", "Waiting for a match..."),
		"queueSize":   queueSize,
	})
}

func (r *chatRuntime) onSkip(s *socket.Socket, dbUserID string) {
	if dbUserID == "" {
		return
	}
	peer, room := r.rooms.PeerOf(string(s.Id()))

	if room != nil && peer != nil {
		peerSocketID := peer.SocketID
		peerSock := r.findSocket(peerSocketID)
		peerDBUserID := ""
		if peerSock != nil {
			peerDBUserID = dbUserIDFromSocket(peerSock)
		} else if peer.UserID != "" {
			peerDBUserID = peer.UserID
		}

		if peerDBUserID != "" {
			r.queue.RecordSkip(dbUserID, peerDBUserID)
			r.queue.RecordSkip(peerDBUserID, dbUserID)
		}

		r.endRoom(room, "skip")

		if peerSock != nil && peerSock.Connected() && peerDBUserID != "" {
			peerAdded := r.queue.Enqueue(peerDBUserID, peerSocketID)
			if peerAdded {
				r.markQueueWaiting(peerDBUserID)
				queueSize := r.queue.Size()
				_ = peerSock.Emit("peer-skipped", map[string]any{
					"message":     "The other person skipped. You are looking for a new match.",
					"userMessage": userMessage("SKIP_PEER_SEARCHING", "call.skip.peerSearching", "The other person skipped. You are looking for a new match."),
					"queueSize":   queueSize,
				})
			} else {
				_ = peerSock.Emit("peer-left", map[string]any{
					"message":     "The other person skipped. Try joining the queue again.",
					"userMessage": userMessage("SKIP_PEER_REJOIN", "call.skip.peerRejoinQueue", "The other person skipped. Try joining the queue again."),
				})
			}
		} else if peerSock != nil && peerSock.Connected() {
			_ = peerSock.Emit("end-call", map[string]any{
				"message":     "The other person skipped. The call has ended.",
				"userMessage": userMessage("END_PEER_SKIPPED", "call.end.peerSkipped", "The other person skipped. The call has ended."),
			})
		}
	}

	added := r.queue.Enqueue(dbUserID, string(s.Id()))
	if added {
		r.markQueueWaiting(dbUserID)
	}
	_ = s.Emit("skipped", map[string]any{
		"message":     "You skipped. Looking for a new match.",
		"userMessage": userMessage("SKIP_SELF", "call.skip.self", "You skipped. Looking for a new match."),
		"queueSize":   r.queue.Size(),
	})
}

func (r *chatRuntime) onSignal(_ *socket.Socket, _ []any) {
}

func (r *chatRuntime) onEndCall(s *socket.Socket) {
	_, room := r.rooms.PeerOf(string(s.Id()))
	if room == nil {
		return
	}
	r.endRoom(room, "end-call")
}

func (r *chatRuntime) onResyncRoom(s *socket.Socket) {
	_, room := r.rooms.PeerOf(string(s.Id()))
	if room == nil {
		_ = s.Emit("resync-session", map[string]any{"timestamp": time.Now().UnixMilli()})
		return
	}
	_ = s.Emit("resync-session", map[string]any{
		"timestamp": time.Now().UnixMilli(),
		"roomId":    room.ID,
		"startedAt": room.StartedAt.UTC().Format(time.RFC3339Nano),
	})
}

func (r *chatRuntime) onResyncSession(s *socket.Socket, _ []any) {
	dbUserID := dbUserIDFromSocket(s)
	if dbUserID == "" {
		emitVideoChatError(s, "RESYNC_NO_ROOM", "call.resync.noRoom", "Could not resync session.")
		return
	}
	room := r.rooms.ByUser(dbUserID)
	if room == nil {
		_ = s.Emit("peer-left", map[string]any{
			"message":     "The other person disconnected.",
			"userMessage": userMessage("END_PEER_LOST_CONNECTION", "call.end.peerLostConnection", "The other person disconnected."),
		})
		return
	}
	var oldSocketID string
	for i := range room.Participants {
		if room.Participants[i].UserID == dbUserID && room.Participants[i].SocketID != string(s.Id()) {
			oldSocketID = room.Participants[i].SocketID
			break
		}
	}
	if oldSocketID == "" {
		return
	}
	if !r.rooms.ReplaceSocket(room.ID, oldSocketID, string(s.Id())) {
		emitVideoChatError(s, "RESYNC_NO_ROOM", "call.resync.noRoom", "Could not resync session.")
		return
	}
	peer := otherParticipant(room, dbUserID)
	if peer == nil {
		return
	}
	isOfferer := string(s.Id()) < peer.SocketID
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	peerInfo := supax.PublicUserInfoByUserID(ctx, peer.UserID)
	myInfo := supax.PublicUserInfoByUserID(ctx, dbUserID)
	_ = s.Emit("matched", buildMatchedPayload(room, peer, string(s.Id()), dbUserID, isOfferer, peerInfo, myInfo))
}

func (r *chatRuntime) onDisconnect(s *socket.Socket, dbUserID string) {
	if dbUserID != "" {
		r.queue.DequeueIfOwner(dbUserID, string(s.Id()))
		r.queueWaitingMu.Lock()
		delete(r.queueWaiting, dbUserID)
		r.queueWaitingMu.Unlock()
	} else {
		r.queue.DequeueBySocket(string(s.Id()))
	}
	_, room := r.rooms.PeerOf(string(s.Id()))
	if room == nil {
		return
	}
	r.endRoom(room, "disconnect")
}

func extractAck(args []any) (socket.Ack, []any) {
	if len(args) == 0 {
		return nil, args
	}
	last := args[len(args)-1]
	if ack, ok := last.(socket.Ack); ok {
		return ack, args[:len(args)-1]
	}
	if ack, ok := last.(func([]any, error)); ok {
		return socket.Ack(ack), args[:len(args)-1]
	}
	return nil, args
}

func sendAck(ack socket.Ack, payload map[string]any) {
	if ack == nil {
		return
	}
	ack([]any{payload}, nil)
}

func (r *chatRuntime) onChatSend(s *socket.Socket, args []any, senderName string) {
	ack, args := extractAck(args)
	peer, room := r.rooms.PeerOf(string(s.Id()))
	if room == nil || peer == nil {
		um := userMessage("CHAT_NOT_IN_ROOM", "chat.notInRoom", "You are not in a call.")
		_ = s.Emit("chat:error", map[string]any{"userMessage": um})
		sendAck(ack, map[string]any{"ok": false, "error": "Not in a room.", "userMessage": um})
		return
	}
	data := parseChatInput(args)
	if !isValidChatInput(data) {
		um := userMessage("CHAT_INVALID", "chat.invalidPayload", "Invalid chat payload.")
		_ = s.Emit("chat:error", map[string]any{"userMessage": um})
		sendAck(ack, map[string]any{"ok": false, "error": "Invalid chat payload.", "userMessage": um})
		return
	}
	payload := buildChatMessagePayload(s, data)
	target := r.chat.Sockets()
	if target == nil {
		um := userMessage("CHAT_PEER_OFFLINE", "chat.peerOffline", "The other person is no longer connected.")
		sendAck(ack, map[string]any{"ok": false, "error": "Peer offline.", "userMessage": um})
		return
	}
	delivered := false
	if peerSock, ok := target.Load(socket.SocketId(peer.SocketID)); ok && peerSock != nil && peerSock.Connected() {
		_ = peerSock.Emit("chat:message", payload)
		delivered = true
	}
	if !delivered {
		um := userMessage("CHAT_PEER_OFFLINE", "chat.peerOffline", "The other person is no longer connected.")
		sendAck(ack, map[string]any{"ok": false, "error": "Peer offline.", "userMessage": um})
		return
	}
	r.notifyPeer(s, "chat", senderName)
	sendAck(ack, map[string]any{"ok": true})
}

func (r *chatRuntime) onScreenShareToggle(s *socket.Socket, args []any, senderName string) {
	r.forwardToPeer(s, "screen-share:toggle", args)
	if len(args) == 0 {
		return
	}
	payload, _ := args[0].(map[string]any)
	if payload == nil {
		return
	}
	if v, _ := payload["sharing"].(bool); v {
		r.notifyPeer(s, "screen-share", senderName)
	}
}

func (r *chatRuntime) onFavoriteNotify(s *socket.Socket, args []any, senderName string) {
	if len(args) == 0 {
		return
	}
	payload, _ := args[0].(map[string]any)
	if payload == nil {
		return
	}
	action, _ := payload["action"].(string)
	if action != "added" && action != "removed" {
		return
	}
	peer, _ := r.rooms.PeerOf(string(s.Id()))
	if peer == nil {
		return
	}
	target := r.chat.Sockets()
	if target == nil {
		return
	}
	peerSock, ok := target.Load(socket.SocketId(peer.SocketID))
	if !ok {
		return
	}
	event := "favorite:added"
	if action == "removed" {
		event = "favorite:removed"
	}
	_ = peerSock.Emit(event, map[string]any{
		"from_user_id":   dbUserIDFromSocket(s),
		"from_user_name": senderName,
	})
	r.notifyPeer(s, "favorite", senderName)
}

func (r *chatRuntime) forwardToPeer(s *socket.Socket, event string, args []any) {
	peer, room := r.rooms.PeerOf(string(s.Id()))
	if room == nil || peer == nil {
		return
	}
	target := r.chat.Sockets()
	if target == nil {
		return
	}
	if peerSock, ok := target.Load(socket.SocketId(peer.SocketID)); ok {
		_ = peerSock.Emit(event, args...)
	}
}

func (r *chatRuntime) notifyPeer(s *socket.Socket, action, fromName string) {
	peer, _ := r.rooms.PeerOf(string(s.Id()))
	if peer == nil || peer.UserID == "" {
		return
	}
	if isForeground(s) {
		return
	}
	target := r.chat.Sockets()
	if target != nil {
		if peerSock, ok := target.Load(socket.SocketId(peer.SocketID)); ok {
			d, _ := peerSock.Data().(map[string]any)
			if d != nil {
				if v, _ := d["visibility"].(string); v == "foreground" {
					return
				}
			}
		}
	}
	contexts.SendPeerActionPush(context.Background(), peer.UserID, action, fromName, nil)
}

func (r *chatRuntime) endRoom(room *rooms.Room, reason string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	removed := r.rooms.Remove(room.ID)
	if removed == nil {
		return
	}

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
		defer cancel()
		r.sfu.CleanupRoom(ctx, removed)
	}()

	now := time.Now()
	durationSeconds := int(now.Sub(removed.StartedAt).Seconds())

	target := r.chat.Sockets()
	if target != nil {
		um := userMessageForReason(reason)
		for _, p := range removed.Participants {
			if sock, ok := target.Load(socket.SocketId(p.SocketID)); ok {
				_ = sock.Emit("end-call", map[string]any{
					"reason":          reason,
					"roomId":          removed.ID,
					"durationSeconds": durationSeconds,
					"message":         um.Fallback,
					"userMessage":     um.Payload,
				})
			}
		}
	}

	go r.persistCallEnd(removed, durationSeconds)
}

func (r *chatRuntime) persistCallEnd(room *rooms.Room, durationSeconds int) {
	ctx, cancel := context.WithTimeout(context.Background(), 12*time.Second)
	defer cancel()
	if durationSeconds <= 0 {
		return
	}
	a := room.Participants[0]
	b := room.Participants[1]
	if a.UserID == "" || b.UserID == "" {
		return
	}
	now := time.Now()
	dur := durationSeconds
	cca, _ := supax.GetUserCountry(ctx, a.UserID)
	ccb, _ := supax.GetUserCountry(ctx, b.UserID)
	if !room.CallHistoryPersisted {
		_, err := supax.CreateCallHistory(ctx, supax.CreateCallHistoryParams{
			CallerID:        a.UserID,
			CalleeID:        b.UserID,
			CallerCountry:   cca,
			CalleeCountry:   ccb,
			StartedAt:       room.StartedAt,
			EndedAt:         &now,
			DurationSeconds: &dur,
		})
		if err != nil {
			if !isUniqueViolation(err) {
				socketLog.Warn().Err(err).Str("roomId", room.ID).Msg("CreateCallHistory failed")
			}
		}
		room.CallHistoryPersisted = true
	}
	tzA := room.TimezoneByUserID[a.UserID]
	tzB := room.TimezoneByUserID[b.UserID]
	if tzA == "" {
		tzA, _ = supax.GetUserTimezone(ctx, a.UserID)
	}
	if tzB == "" {
		tzB, _ = supax.GetUserTimezone(ctx, b.UserID)
	}
	res, err := callended.Apply(ctx, callended.ApplyParams{
		CallerID:       a.UserID,
		CalleeID:       b.UserID,
		CallerTimezone: tzA,
		CalleeTimezone: tzB,
		EndedAt:        now,
		DurationSecs:   durationSeconds,
	})
	if err != nil || res == nil {
		dateA := callended.LocalDateString(now, tzA)
		dateB := callended.LocalDateString(now, tzB)
		_ = jobs.EnqueueApplyCallExp(ctx, a.UserID, durationSeconds, b.UserID, tzA, dateA)
		_ = jobs.EnqueueApplyCallExp(ctx, b.UserID, durationSeconds, a.UserID, tzB, dateB)
		r.emitProgressApplied(a.UserID, room.ID, false)
		r.emitProgressApplied(b.UserID, room.ID, false)
		return
	}
	r.broadcastCallEndedTransitions(room, res)
	r.emitProgressApplied(a.UserID, room.ID, res.ExpSettled(a.UserID))
	r.emitProgressApplied(b.UserID, room.ID, res.ExpSettled(b.UserID))
}

func (r *chatRuntime) emitProgressApplied(dbUserID, roomID string, ok bool) {
	if dbUserID == "" {
		return
	}
	target := r.chat.Sockets()
	if target == nil {
		return
	}
	payload := map[string]any{
		"roomId":    roomID,
		"ok":        ok,
		"timestamp": time.Now().UnixMilli(),
	}
	target.Range(func(_ socket.SocketId, s *socket.Socket) bool {
		if s == nil || !s.Connected() {
			return true
		}
		if dbUserIDFromSocket(s) != dbUserID {
			return true
		}
		_ = s.Emit("user:progress:applied", payload)
		return true
	})
}

func (r *chatRuntime) persistActiveRoomsOnShutdown(ctx context.Context) {
	all := r.rooms.All()
	if len(all) == 0 {
		return
	}
	socketLog.Info().Int("rooms", len(all)).Msg("Persisting active room call histories before shutdown")
	for _, room := range all {
		duration := int(time.Since(room.StartedAt).Seconds())
		if duration <= 0 {
			continue
		}
		r.persistCallEnd(room, duration)
		r.rooms.Remove(room.ID)
	}
}

func (r *chatRuntime) broadcastCallEndedTransitions(room *rooms.Room, result *callended.Result) {
	target := r.chat.Sockets()
	if target == nil {
		return
	}
	now := time.Now().UTC().Format("2006-01-02")
	for _, outcome := range result.StreakOutcomes {
		if !outcome.FirstTimeValid {
			continue
		}
		eventKey := room.ID + ":" + outcome.UserID + ":" + outcome.Date + ":call-ended"
		payload := map[string]any{
			"eventKey":        eventKey,
			"completedUserId": outcome.UserID,
			"userId":          outcome.UserID,
			"streakCount":     outcome.StreakCount,
			"date":            firstNonEmpty(outcome.Date, now),
		}
		for _, p := range room.Participants {
			if sock, ok := target.Load(socket.SocketId(p.SocketID)); ok {
				_ = sock.Emit(streakCompletedEvent, payload)
			}
		}
	}
	for _, outcome := range result.LevelOutcomes {
		if !outcome.DidLevelUp {
			continue
		}
		eventKey := room.ID + ":" + outcome.UserID + ":" + itoa(outcome.NewLevel) + ":call-ended"
		payload := map[string]any{
			"eventKey":      eventKey,
			"leveledUserId": outcome.UserID,
			"userId":        outcome.UserID,
			"previousLevel": outcome.PreviousLevel,
			"newLevel":      outcome.NewLevel,
		}
		for _, p := range room.Participants {
			if sock, ok := target.Load(socket.SocketId(p.SocketID)); ok {
				_ = sock.Emit(levelUpEvent, payload)
			}
		}
	}
}

func (r *chatRuntime) runMatchTick() {
	t := time.NewTicker(matchTickInterval)
	defer t.Stop()
	for {
		select {
		case <-r.stopMatch:
			return
		case <-t.C:
			r.tryMatch()
			r.queue.Cleanup()
			r.checkQueueTimeouts()
		}
	}
}

func (r *chatRuntime) runStaleCleanup() {
	t := time.NewTicker(staleCleanupInterval)
	defer t.Stop()
	for {
		select {
		case <-r.stopCleanup:
			return
		case <-t.C:
			r.queue.Cleanup()
			r.cleanupOrphanedQueueEntries()
		}
	}
}

func (r *chatRuntime) cleanupOrphanedQueueEntries() {
	target := r.chat.Sockets()
	if target == nil {
		return
	}
	entries := r.queue.Snapshot(0)
	for _, e := range entries {
		s, ok := target.Load(socket.SocketId(e.SocketID))
		if !ok || s == nil || !s.Connected() {
			r.queue.DequeueBySocket(e.SocketID)
			r.queueWaitingMu.Lock()
			delete(r.queueWaiting, e.UserID)
			r.queueWaitingMu.Unlock()
		}
	}
}

func (r *chatRuntime) checkQueueTimeouts() {
	now := time.Now()
	r.queueWaitingMu.Lock()
	expired := make([]string, 0)
	for userID, since := range r.queueWaiting {
		if now.Sub(since) >= queueWaitMax {
			expired = append(expired, userID)
		}
	}
	for _, uid := range expired {
		delete(r.queueWaiting, uid)
	}
	r.queueWaitingMu.Unlock()

	if len(expired) == 0 {
		return
	}
	target := r.chat.Sockets()
	for _, uid := range expired {
		entries := r.queue.Snapshot(0)
		for _, e := range entries {
			if e.UserID == uid {
				r.queue.Dequeue(uid)
				if target != nil {
					if s, ok := target.Load(socket.SocketId(e.SocketID)); ok {
						_ = s.Emit("queue-timeout", map[string]any{
							"message":     "We could not find a match. Please try again.",
							"userMessage": userMessage("QUEUE_TIMEOUT", "call.queue.timeout", "We could not find a match. Please try again."),
						})
						_ = s.Emit("dequeued", map[string]any{
							"reason":      "timeout",
							"userMessage": userMessage("DEQUEUED_TIMEOUT", "call.queue.dequeuedTimeout", "Removed from queue after timeout."),
						})
					}
				}
				break
			}
		}
	}
}

func (r *chatRuntime) tryMatch() {
	entries := r.queue.Snapshot(50)
	if len(entries) < 2 {
		return
	}
	target := r.chat.Sockets()
	if target == nil {
		return
	}

	type liveEntry struct {
		entry  matchmaking.QueueEntry
		socket *socket.Socket
		tags   []string
	}

	live := make([]liveEntry, 0, len(entries))
	for _, e := range entries {
		s, ok := target.Load(socket.SocketId(e.SocketID))
		if !ok || s == nil || !s.Connected() {
			continue
		}
		tags := r.queue.GetUserInterests(e.UserID)
		live = append(live, liveEntry{entry: e, socket: s, tags: tags})
	}
	if len(live) < 2 {
		return
	}

	favorites := make(map[string]map[string]struct{}, len(live))
	blocked := make(map[string]map[string]struct{}, len(live))
	userIDs := make([]string, 0, len(live))
	for _, l := range live {
		favorites[l.entry.UserID] = matchmaking.StringSetFromSlice(r.queue.GetUserFavorites(l.entry.UserID))
		blocked[l.entry.UserID] = matchmaking.StringSetFromSlice(r.queue.GetUserBlocks(l.entry.UserID))
		userIDs = append(userIDs, l.entry.UserID)
	}

	var embeddings map[string][]float32
	embCtx, embCancel := context.WithTimeout(context.Background(), 3*time.Second)
	emb, err := supax.ListUserEmbeddings(embCtx, userIDs)
	embCancel()
	if err == nil {
		embeddings = emb
	}

	nowMs := time.Now().UnixMilli()
	candidates := make([]matchmaking.ScoredCandidate, 0)
	for i := 0; i < len(live); i++ {
		for j := i + 1; j < len(live); j++ {
			a := live[i]
			b := live[j]
			cand, ok := matchmaking.ScorePair(matchmaking.ScoringInputs{
				UserAID:         a.entry.UserID,
				UserBID:         b.entry.UserID,
				TagsA:           a.tags,
				TagsB:           b.tags,
				JoinedAtAMs:     a.entry.JoinedAt.UnixMilli(),
				JoinedAtBMs:     b.entry.JoinedAt.UnixMilli(),
				NowMs:           nowMs,
				EmbeddingA:      embeddings[a.entry.UserID],
				EmbeddingB:      embeddings[b.entry.UserID],
				FavoritesA:      favorites[a.entry.UserID],
				FavoritesB:      favorites[b.entry.UserID],
				BlockedSetA:     blocked[a.entry.UserID],
				BlockedSetB:     blocked[b.entry.UserID],
				HasSkipCooldown: r.queue.HasSkip(a.entry.UserID, b.entry.UserID),
			})
			if !ok {
				continue
			}
			candidates = append(candidates, cand)
		}
	}
	if len(candidates) == 0 {
		return
	}

	pick := matchmaking.PickBest(candidates)
	if pick.Pair == nil {
		return
	}

	var entryA, entryB liveEntry
	for _, l := range live {
		if l.entry.UserID == pick.Pair.UserAID {
			entryA = l
		}
		if l.entry.UserID == pick.Pair.UserBID {
			entryB = l
		}
	}
	if entryA.socket == nil || entryB.socket == nil {
		return
	}
	if !entryA.socket.Connected() || !entryB.socket.Connected() {
		return
	}

	if !r.queue.Dequeue(pick.Pair.UserAID) {
		return
	}
	if !r.queue.Dequeue(pick.Pair.UserBID) {
		r.queue.Enqueue(pick.Pair.UserAID, entryA.entry.SocketID)
		return
	}
	r.queueWaitingMu.Lock()
	delete(r.queueWaiting, pick.Pair.UserAID)
	delete(r.queueWaiting, pick.Pair.UserBID)
	r.queueWaitingMu.Unlock()

	socketLog.Info().
		Str("userA", pick.Pair.UserAID).
		Str("userB", pick.Pair.UserBID).
		Str("favoriteType", string(pick.Pair.FavoriteType)).
		Int("commonInterests", pick.Pair.CommonInterests).
		Float64("score", pick.Pair.Score).
		Bool("fallback", pick.Fallback).
		Msg("Match created")

	room := r.rooms.Create(participant(entryA.socket, pick.Pair.UserAID), participant(entryB.socket, pick.Pair.UserBID))
	isAOfferer := entryA.socket.Id() < entryB.socket.Id()
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	peerInfoForA := supax.PublicUserInfoByUserID(ctx, pick.Pair.UserBID)
	myInfoForA := supax.PublicUserInfoByUserID(ctx, pick.Pair.UserAID)
	peerInfoForB := supax.PublicUserInfoByUserID(ctx, pick.Pair.UserAID)
	myInfoForB := supax.PublicUserInfoByUserID(ctx, pick.Pair.UserBID)
	cancel()
	payloadA := buildMatchedPayload(room, &room.Participants[1], string(entryA.socket.Id()), pick.Pair.UserAID, isAOfferer, peerInfoForA, myInfoForA)
	payloadB := buildMatchedPayload(room, &room.Participants[0], string(entryB.socket.Id()), pick.Pair.UserBID, !isAOfferer, peerInfoForB, myInfoForB)
	_ = entryA.socket.Emit("matched", payloadA)
	_ = entryB.socket.Emit("matched", payloadB)

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if tz, err := supax.GetUserTimezone(ctx, pick.Pair.UserAID); err == nil && tz != "" {
			room.TimezoneByUserID[pick.Pair.UserAID] = tz
		}
		if tz, err := supax.GetUserTimezone(ctx, pick.Pair.UserBID); err == nil && tz != "" {
			room.TimezoneByUserID[pick.Pair.UserBID] = tz
		}
	}()
}

func (r *chatRuntime) runHeartbeat() {
	t := time.NewTicker(roomHeartbeatInterval)
	defer t.Stop()
	for {
		select {
		case <-r.stopHB:
			return
		case <-t.C:
			r.heartbeatRooms()
		}
	}
}

func (r *chatRuntime) heartbeatRooms() {
	target := r.chat.Sockets()
	if target == nil {
		return
	}
	now := time.Now()
	for _, room := range r.rooms.All() {
		dur := int(now.Sub(room.StartedAt).Seconds())
		ping := map[string]any{
			"roomId":    room.ID,
			"timestamp": now.UnixMilli(),
		}
		for _, p := range room.Participants {
			if sock, ok := target.Load(socket.SocketId(p.SocketID)); ok {
				_ = sock.Emit("room-ping", ping)
				if p.UserID == "" {
					continue
				}
				baseline, projected := r.computeProjection(room, p.UserID, dur)
				if projected != nil {
					r.maybeEmitStreakAndLevel(room, &p, baseline, projected, target)
					_ = sock.Emit("user:progress:update", projected)
				}
			}
		}
	}
}

func (r *chatRuntime) computeProjection(room *rooms.Room, userID string, durationSeconds int) (baseline, projected *progress.Insights) {
	if userID == "" || durationSeconds <= 0 {
		return nil, nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	tz := room.TimezoneByUserID[userID]
	if tz == "" {
		t, _ := supax.GetUserTimezone(ctx, userID)
		if t != "" {
			tz = t
			room.TimezoneByUserID[userID] = tz
		}
	}
	if tz == "" {
		tz = "UTC"
	}
	insights, err := progress.GetInsights(ctx, userID, tz)
	if err != nil || insights == nil {
		return nil, nil
	}
	return insights, progress.ApplyRealtimeCallProjection(insights, durationSeconds, durationSeconds)
}

func (r *chatRuntime) maybeEmitStreakAndLevel(room *rooms.Room, p *rooms.Participant, baseline, projected *progress.Insights, target *types.Map[socket.SocketId, *socket.Socket]) {
	unlock := room.LockState()
	defer unlock()

	baselineComplete := baseline != nil && baseline.IsTodayStreakComplete
	if projected != nil && projected.IsTodayStreakComplete && !baselineComplete && !room.HasEmittedStreakComplete[p.UserID] {
		eventKey := room.ID + ":" + p.UserID + ":" + projected.TodayDate + ":heartbeat"
		payload := map[string]any{
			"eventKey":        eventKey,
			"completedUserId": p.UserID,
			"userId":          p.UserID,
			"streakCount":     projected.Streak.CurrentStreak,
			"date":            projected.TodayDate,
		}
		for _, peer := range room.Participants {
			if sock, ok := target.Load(socket.SocketId(peer.SocketID)); ok {
				_ = sock.Emit(streakCompletedEvent, payload)
			}
		}
		room.HasEmittedStreakComplete[p.UserID] = true
	}

	baselineLevel := projected.CurrentLevel
	if baseline != nil && baseline.CurrentLevel > 0 {
		baselineLevel = baseline.CurrentLevel
	}
	floor, ok := room.LastAnnouncedLevel[p.UserID]
	if !ok {
		floor = baselineLevel
		room.LastAnnouncedLevel[p.UserID] = floor
	}
	if projected.CurrentLevel > floor {
		payload := map[string]any{
			"eventKey":      room.ID + ":" + p.UserID + ":" + itoa(projected.CurrentLevel) + ":heartbeat",
			"leveledUserId": p.UserID,
			"userId":        p.UserID,
			"previousLevel": floor,
			"newLevel":      projected.CurrentLevel,
		}
		for _, peer := range room.Participants {
			if sock, ok := target.Load(socket.SocketId(peer.SocketID)); ok {
				_ = sock.Emit(levelUpEvent, payload)
			}
		}
		room.LastAnnouncedLevel[p.UserID] = projected.CurrentLevel
	}
	room.LastProjectedTotalExp[p.UserID] = projected.ExpProgress.TotalExpSeconds
}

func (r *chatRuntime) emitToSocket(socketID string, event string, payload interface{}) {
	target := r.chat.Sockets()
	if target == nil {
		return
	}
	if peerSock, ok := target.Load(socket.SocketId(socketID)); ok && peerSock != nil && peerSock.Connected() {
		_ = peerSock.Emit(event, payload)
	}
}

func (r *chatRuntime) findSocket(socketID string) *socket.Socket {
	target := r.chat.Sockets()
	if target == nil {
		return nil
	}
	if s, ok := target.Load(socket.SocketId(socketID)); ok {
		return s
	}
	return nil
}

func (r *chatRuntime) markQueueWaiting(userID string) {
	if userID == "" {
		return
	}
	r.queueWaitingMu.Lock()
	r.queueWaiting[userID] = time.Now()
	r.queueWaitingMu.Unlock()
}

func (r *chatRuntime) SFU() *realtime.Service {
	return r.sfu
}

func participant(s *socket.Socket, userID string) rooms.Participant {
	uname, uimg := userInfoFromSocket(s)
	return rooms.Participant{
		UserID:    userID,
		SocketID:  string(s.Id()),
		UserName:  uname,
		UserImage: uimg,
	}
}

func buildMatchedPayload(room *rooms.Room, peer *rooms.Participant, mySocketID, myUserID string, isOfferer bool, peerInfo, myInfo map[string]any) map[string]any {
	if peerInfo == nil && peer != nil {
		peerInfo = map[string]any{"id": peer.UserID}
	}
	if myInfo == nil {
		myInfo = map[string]any{"id": myUserID}
	}
	return map[string]any{
		"roomId":            room.ID,
		"peerId":            peer.SocketID,
		"socketId":          mySocketID,
		"isOfferer":         isOfferer,
		"peerInfo":          peerInfo,
		"myInfo":            myInfo,
		"mediaProvider":     mediaProviderSFU,
		"realtimeSessionId": cloudflareSessionForUser(room, mySocketID),
		"startedAt":         room.StartedAt.UTC().Format(time.RFC3339Nano),
	}
}

func otherParticipant(room *rooms.Room, dbUserID string) *rooms.Participant {
	for i := range room.Participants {
		if room.Participants[i].UserID != dbUserID {
			return &room.Participants[i]
		}
	}
	return nil
}

func otherParticipantBySocket(room *rooms.Room, peerSocketID string) *rooms.Participant {
	for i := range room.Participants {
		if room.Participants[i].SocketID != peerSocketID {
			return &room.Participants[i]
		}
	}
	return nil
}

func cloudflareSessionForUser(room *rooms.Room, socketID string) any {
	if room.Realtime == nil {
		return nil
	}
	if p, ok := room.Realtime.Participants[socketID]; ok && p != nil {
		return p.SessionID
	}
	return nil
}

type userMessagePayload struct {
	Code     string
	I18nKey  string
	Fallback string
}

type userMessageResult struct {
	Fallback string
	Payload  map[string]any
}

func userMessage(code, key, fallback string) map[string]any {
	return map[string]any{
		"code": code,
		"i18n": map[string]any{
			"key": key,
		},
		"fallbackMessage": fallback,
	}
}

func userMessageForReason(reason string) userMessageResult {
	switch reason {
	case "skip":
		return userMessageResult{
			Fallback: "The other person skipped. The call has ended.",
			Payload:  userMessage("END_PEER_SKIPPED", "call.end.peerSkipped", "The other person skipped. The call has ended."),
		}
	case "disconnect":
		return userMessageResult{
			Fallback: "The other person disconnected.",
			Payload:  userMessage("END_PEER_LOST_CONNECTION", "call.end.peerLostConnection", "The other person disconnected."),
		}
	default:
		return userMessageResult{
			Fallback: "The other person ended the call.",
			Payload:  userMessage("END_PEER_ENDED", "call.end.peerEnded", "The other person ended the call."),
		}
	}
}

func emitVideoChatError(s *socket.Socket, code, key, fallback string) {
	_ = s.Emit("video-chat:error", map[string]any{
		"message":     fallback,
		"userMessage": userMessage(code, key, fallback),
	})
}

func setVisibility(s *socket.Socket, v string) {
	if data, ok := s.Data().(map[string]any); ok {
		data["visibility"] = v
		s.SetData(data)
	}
}

func handlePresenceEvent(s *socket.Socket, args []any) {
	if len(args) == 0 {
		return
	}
	payload, _ := args[0].(map[string]any)
	if payload == nil {
		return
	}
	state, _ := payload["state"].(string)
	if state == "" {
		return
	}
	uid := userIDFromSocket(s)
	if uid == "" {
		return
	}
	contexts.RecordPresence(uid, state)
}

func saveDBUserID(s *socket.Socket, id string) {
	if data, ok := s.Data().(map[string]any); ok {
		data["dbUserId"] = id
		s.SetData(data)
	}
}

func dbUserIDFromSocket(s *socket.Socket) string {
	d, ok := s.Data().(map[string]any)
	if !ok {
		return ""
	}
	v, _ := d["dbUserId"].(string)
	return v
}

func userInfoFromSocket(s *socket.Socket) (string, string) {
	d, ok := s.Data().(map[string]any)
	if !ok {
		return "Anonymous", ""
	}
	uname, _ := d[dataKeyUserName].(string)
	uimg, _ := d[dataKeyUserImageURL].(string)
	if uname == "" {
		uname = "Anonymous"
	}
	return uname, uimg
}

func isForeground(s *socket.Socket) bool {
	d, _ := s.Data().(map[string]any)
	if d == nil {
		return false
	}
	v, _ := d["visibility"].(string)
	return v == "foreground"
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}

func itoa(n int) string {
	return strings.TrimSpace(intToStr(n))
}

func intToStr(v int) string {
	if v == 0 {
		return "0"
	}
	const digits = "0123456789"
	negative := v < 0
	if negative {
		v = -v
	}
	out := make([]byte, 0, 20)
	for v > 0 {
		out = append([]byte{digits[v%10]}, out...)
		v /= 10
	}
	if negative {
		out = append([]byte{'-'}, out...)
	}
	return string(out)
}

func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "23505") || strings.Contains(msg, "duplicate key")
}

var _ = cloudflarerealtime.IsConfigured
