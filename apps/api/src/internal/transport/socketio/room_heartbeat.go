package socketio

import (
	"context"
	"time"

	socket "github.com/zishang520/socket.io/servers/socket/v3"
	"github.com/zishang520/socket.io/v3/pkg/types"

	appuser "linky-api/src/internal/app/user"
	"linky-api/src/internal/domain/rooms"
	"linky-api/src/internal/domain/user/progress"
)

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
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	return appuser.ProjectedCallInsights(ctx, userID, room.TimezoneByUserID, room.FavoriteRelation, durationSeconds)
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
