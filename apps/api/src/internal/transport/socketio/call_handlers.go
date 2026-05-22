package socketio

import (
	"context"
	"time"

	socket "github.com/zishang520/socket.io/servers/socket/v3"

	"linky-api/src/internal/app/callended"
	"linky-api/src/internal/domain/rooms"
)

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
	wasPersisted := room.CallHistoryPersisted
	out := callended.EndCall(ctx, callended.EndCallInput{
		RoomID: room.ID,
		Participants: [2]callended.EndCallParticipant{
			{UserID: a.UserID},
			{UserID: b.UserID},
		},
		StartedAt:            room.StartedAt,
		TimezoneByUserID:     room.TimezoneByUserID,
		FavoriteRelation:     room.FavoriteRelation,
		DurationSecs:         durationSeconds,
		CallHistoryPersisted: wasPersisted,
	})
	if !wasPersisted {
		room.CallHistoryPersisted = true
	}
	if out.ApplyFailed {
		r.emitProgressApplied(a.UserID, room.ID, false)
		r.emitProgressApplied(b.UserID, room.ID, false)
		return
	}
	if out.Result != nil {
		r.broadcastCallEndedTransitions(room, out.Result)
	}
	r.emitProgressApplied(a.UserID, room.ID, out.ProgressOK[a.UserID])
	r.emitProgressApplied(b.UserID, room.ID, out.ProgressOK[b.UserID])
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
