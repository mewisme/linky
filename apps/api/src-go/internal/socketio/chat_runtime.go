package socketio

import (
	"context"
	"sync"
	"time"

	socket "github.com/zishang520/socket.io/servers/socket/v3"

	"linky-api/src-go/internal/contexts"
	"linky-api/src-go/internal/domains/matchmaking"
	"linky-api/src-go/internal/domains/rooms"
	"linky-api/src-go/internal/domains/user/progress"
	"linky-api/src-go/internal/infra/supax"
	"linky-api/src-go/internal/jobs"
	"linky-api/src-go/internal/logger"
)

const (
	matchTickInterval     = 1 * time.Second
	roomHeartbeatInterval = 5 * time.Second
)

type chatRuntime struct {
	chat      socket.Namespace
	queue     *matchmaking.MemoryStore
	rooms     *rooms.RoomService
	mu        sync.Mutex
	stopMatch chan struct{}
	stopHB    chan struct{}
}

var socketLog = logger.New("api:socket:chat")

func newChatRuntime(chat socket.Namespace) *chatRuntime {
	r := &chatRuntime{
		chat:      chat,
		queue:     matchmaking.NewMemoryStore(),
		rooms:     rooms.NewService(),
		stopMatch: make(chan struct{}),
		stopHB:    make(chan struct{}),
	}
	go r.runMatchTick()
	go r.runHeartbeat()
	return r
}

func (r *chatRuntime) close() {
	close(r.stopMatch)
	close(r.stopHB)
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

	s.On("join", func(args ...any) { r.onJoin(s, dbUserID, uname, uimg) })
	s.On("skip", func(args ...any) { r.onSkip(s, dbUserID) })
	s.On("signal", func(args ...any) { r.forwardToPeer(s, "signal", args) })
	s.On("chat:send", func(args ...any) { r.onChatSend(s, args, uname) })
	s.On("chat:attachment:send", func(args ...any) { r.onChatSend(s, args, uname) })
	s.On("chat:typing", func(args ...any) { r.forwardToPeer(s, "chat:typing", args) })
	s.On("mute-toggle", func(args ...any) { r.forwardToPeer(s, "peer:mute-toggle", args) })
	s.On("video-toggle", func(args ...any) { r.forwardToPeer(s, "peer:video-toggle", args) })
	s.On("screen-share", func(args ...any) { r.forwardToPeer(s, "peer:screen-share", args) })
	s.On("reaction", func(args ...any) { r.forwardToPeer(s, "peer:reaction", args) })
	s.On("favorite-notification", func(args ...any) {
		r.forwardToPeer(s, "favorite:notification", args)
		r.notifyPeer(s, "favorite", uname)
	})
	s.On("end-call", func(args ...any) { r.onEndCall(s) })
	s.On("resync-room-state", func(args ...any) { r.onResyncRoom(s) })
	s.On("resync-session", func(args ...any) { r.onResyncRoom(s) })

	s.On("client:visibility:foreground", func(args ...any) { setVisibility(s, "foreground") })
	s.On("client:visibility:background", func(args ...any) { setVisibility(s, "background") })

	s.On("disconnect", func(args ...any) { r.onDisconnect(s, dbUserID) })
}

func (r *chatRuntime) onJoin(s *socket.Socket, dbUserID, uname, uimg string) {
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
	_ = s.Emit("joined-queue", map[string]any{
		"message": "Waiting for a match...",
		"userMessage": map[string]any{
			"code":            "JOIN_WAITING",
			"i18n":            map[string]any{"key": "call.join.waitingForMatch"},
			"fallbackMessage": "Waiting for a match...",
		},
		"queueSize": r.queue.Size(),
	})
}

func (r *chatRuntime) onSkip(s *socket.Socket, dbUserID string) {
	peer, room := r.rooms.PeerOf(string(s.Id()))
	if room == nil || peer == nil {
		return
	}
	if dbUserID != "" && peer.UserID != "" {
		r.queue.RecordSkip(dbUserID, peer.UserID)
	}
	r.endRoom(room, "skip")
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
		_ = s.Emit("room:state", map[string]any{"inRoom": false})
		return
	}
	_ = s.Emit("room:state", map[string]any{
		"inRoom":    true,
		"roomId":    room.ID,
		"startedAt": room.StartedAt.UTC().Format(time.RFC3339Nano),
	})
}

func (r *chatRuntime) onDisconnect(s *socket.Socket, dbUserID string) {
	if dbUserID != "" {
		r.queue.DequeueIfOwner(dbUserID, string(s.Id()))
	} else {
		r.queue.DequeueBySocket(string(s.Id()))
	}
	if _, room := r.rooms.PeerOf(string(s.Id())); room != nil {
		r.endRoom(room, "disconnect")
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

func isForeground(s *socket.Socket) bool {
	d, _ := s.Data().(map[string]any)
	if d == nil {
		return false
	}
	v, _ := d["visibility"].(string)
	return v == "foreground"
}

func (r *chatRuntime) onChatSend(s *socket.Socket, args []any, senderName string) {
	peer, room := r.rooms.PeerOf(string(s.Id()))
	if room == nil || peer == nil {
		return
	}
	data := parseChatInput(args)
	if !isValidChatInput(data) {
		return
	}
	payload := buildChatMessagePayload(s, data)
	target := r.chat.Sockets()
	if target == nil {
		return
	}
	if peerSock, ok := target.Load(socket.SocketId(peer.SocketID)); ok {
		_ = peerSock.Emit("chat:message", payload)
	}
	r.notifyPeer(s, "chat", senderName)
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

func (r *chatRuntime) endRoom(room *rooms.Room, reason string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	removed := r.rooms.Remove(room.ID)
	if removed == nil {
		return
	}
	target := r.chat.Sockets()
	now := time.Now()
	durationSeconds := int(now.Sub(removed.StartedAt).Seconds())
	go r.persistCallEnd(removed, durationSeconds)
	if target == nil {
		return
	}
	for _, p := range removed.Participants {
		if sock, ok := target.Load(socket.SocketId(p.SocketID)); ok {
			_ = sock.Emit("call-ended", map[string]any{"reason": reason, "roomId": removed.ID, "durationSeconds": durationSeconds})
		}
	}
}

func (r *chatRuntime) persistCallEnd(room *rooms.Room, durationSeconds int) {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
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
	_, _ = supax.CreateCallHistory(ctx, supax.CreateCallHistoryParams{
		CallerID:        a.UserID,
		CalleeID:        b.UserID,
		CallerCountry:   cca,
		CalleeCountry:   ccb,
		StartedAt:       room.StartedAt,
		EndedAt:         &now,
		DurationSeconds: &dur,
	})
	_ = jobs.EnqueueApplyCallExp(ctx, a.UserID, durationSeconds, b.UserID, "", "")
	_ = jobs.EnqueueApplyCallExp(ctx, b.UserID, durationSeconds, a.UserID, "", "")
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

	socketLog.Info().
		Str("userA", pick.Pair.UserAID).
		Str("userB", pick.Pair.UserBID).
		Str("favoriteType", string(pick.Pair.FavoriteType)).
		Int("commonInterests", pick.Pair.CommonInterests).
		Float64("score", pick.Pair.Score).
		Bool("fallback", pick.Fallback).
		Msg("Match created")

	room := r.rooms.Create(participant(entryA.socket, pick.Pair.UserAID), participant(entryB.socket, pick.Pair.UserBID))
	payloadA := matchPayload(room, room.Participants[1])
	payloadB := matchPayload(room, room.Participants[0])
	_ = entryA.socket.Emit("matched", payloadA)
	_ = entryB.socket.Emit("matched", payloadB)
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

func matchPayload(room *rooms.Room, peer rooms.Participant) map[string]any {
	return map[string]any{
		"roomId":    room.ID,
		"startedAt": room.StartedAt.UTC().Format(time.RFC3339Nano),
		"peer": map[string]any{
			"userId":   peer.UserID,
			"userName": peer.UserName,
			"userImageUrl": peer.UserImage,
		},
	}
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
		for _, p := range room.Participants {
			if sock, ok := target.Load(socket.SocketId(p.SocketID)); ok {
				_ = sock.Emit("room-ping", map[string]any{
					"roomId":          room.ID,
					"durationSeconds": dur,
				})
				if p.UserID != "" {
					if projected := computeRealtimeProgressInsights(p.UserID, dur); projected != nil {
						_ = sock.Emit("user:progress:update", projected)
					}
				}
			}
		}
	}
}

func computeRealtimeProgressInsights(userID string, durationSeconds int) *progress.Insights {
	if userID == "" || durationSeconds <= 0 {
		return nil
	}
	ctx, cancel := contextTimeout(3 * time.Second)
	defer cancel()
	tz, _ := supax.GetUserTimezone(ctx, userID)
	if tz == "" {
		tz = "UTC"
	}
	insights, err := progress.GetInsights(ctx, userID, tz)
	if err != nil || insights == nil {
		return nil
	}
	return progress.ApplyRealtimeCallProjection(insights, durationSeconds, durationSeconds)
}

func contextTimeout(d time.Duration) (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), d)
}

func emitVideoChatError(s *socket.Socket, code, key, fallback string) {
	_ = s.Emit("video-chat:error", map[string]any{
		"message": fallback,
		"userMessage": map[string]any{
			"code":            code,
			"i18n":            map[string]any{"key": key},
			"fallbackMessage": fallback,
		},
	})
}

func setVisibility(s *socket.Socket, v string) {
	if data, ok := s.Data().(map[string]any); ok {
		data["visibility"] = v
		s.SetData(data)
	}
}

func saveDBUserID(s *socket.Socket, id string) {
	if data, ok := s.Data().(map[string]any); ok {
		data["dbUserId"] = id
		s.SetData(data)
	}
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
