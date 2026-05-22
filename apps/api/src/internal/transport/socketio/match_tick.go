package socketio

import (
	"context"
	"time"

	socket "github.com/zishang520/socket.io/servers/socket/v3"

	appmatch "linky-api/src/internal/app/matchmaking"
	"linky-api/src/internal/domain/matchmaking"
)

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
	}

	live := make([]liveEntry, 0, len(entries))
	liveForMatch := make([]appmatch.LiveParticipant, 0, len(entries))
	for _, e := range entries {
		s, ok := target.Load(socket.SocketId(e.SocketID))
		if !ok || s == nil || !s.Connected() {
			continue
		}
		tags := appmatch.UserInterests(e.UserID)
		live = append(live, liveEntry{entry: e, socket: s})
		liveForMatch = append(liveForMatch, appmatch.LiveParticipant{Entry: e, Tags: tags})
	}
	if len(live) < 2 {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	details, ok := appmatch.FindMatch(ctx, r.queue, liveForMatch)
	cancel()
	if !ok || details == nil || details.Pick.Pair == nil {
		return
	}

	pair := details.Pick.Pair
	var entryA, entryB liveEntry
	for _, l := range live {
		if l.entry.UserID == pair.UserAID {
			entryA = l
		}
		if l.entry.UserID == pair.UserBID {
			entryB = l
		}
	}
	if entryA.socket == nil || entryB.socket == nil {
		return
	}
	if !entryA.socket.Connected() || !entryB.socket.Connected() {
		return
	}

	if !r.queue.Dequeue(pair.UserAID) {
		return
	}
	if !r.queue.Dequeue(pair.UserBID) {
		r.queue.Enqueue(pair.UserAID, entryA.entry.SocketID)
		return
	}
	r.queueWaitingMu.Lock()
	delete(r.queueWaiting, pair.UserAID)
	delete(r.queueWaiting, pair.UserBID)
	r.queueWaitingMu.Unlock()

	socketLog.Info().
		Str("userA", pair.UserAID).
		Str("userB", pair.UserBID).
		Str("favoriteType", string(pair.FavoriteType)).
		Int("commonInterests", pair.CommonInterests).
		Float64("score", pair.Score).
		Bool("fallback", details.Pick.Fallback).
		Msg("Match created")

	room := r.rooms.Create(participant(entryA.socket, pair.UserAID), participant(entryB.socket, pair.UserBID))
	room.FavoriteRelation = details.FavoriteRelation
	isAOfferer := entryA.socket.Id() < entryB.socket.Id()

	peerInfoForA := details.PublicInfo[pair.UserBID]
	myInfoForA := details.PublicInfo["my:"+pair.UserAID]
	peerInfoForB := details.PublicInfo[pair.UserAID]
	myInfoForB := details.PublicInfo["my:"+pair.UserBID]
	payloadA := buildMatchedPayload(room, &room.Participants[1], string(entryA.socket.Id()), pair.UserAID, isAOfferer, peerInfoForA, myInfoForA)
	payloadB := buildMatchedPayload(room, &room.Participants[0], string(entryB.socket.Id()), pair.UserBID, !isAOfferer, peerInfoForB, myInfoForB)
	_ = entryA.socket.Emit("matched", payloadA)
	_ = entryB.socket.Emit("matched", payloadB)

	for uid, tz := range details.Timezones {
		if tz != "" {
			room.TimezoneByUserID[uid] = tz
		}
	}
}
