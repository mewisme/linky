package socketio

import (
	"context"
	"strings"
	"sync"
	"time"

	socket "github.com/zishang520/socket.io/servers/socket/v3"

	"linky-api/src/internal/app/peerpush"
	"linky-api/src/internal/app/presence"
	appuser "linky-api/src/internal/app/user"
	"linky-api/src/internal/app/videochat/realtime"
	"linky-api/src/internal/domain/matchmaking"
	"linky-api/src/internal/domain/rooms"
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
	peerInfo, myInfo := appuser.MatchPublicInfo(ctx, peer.UserID, dbUserID)
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
	peerpush.SendPeerActionPush(context.Background(), peer.UserID, action, fromName, nil)
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
	presence.RecordPresence(uid, state)
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
