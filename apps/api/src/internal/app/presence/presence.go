package presence

import (
	"sync"
	"time"
)

type presenceState struct {
	State     string
	UpdatedAt time.Time
}

var (
	presenceMu      sync.RWMutex
	presenceByUser  = make(map[string]presenceState)
	presenceListens []func(userID, state string, updatedAt time.Time)
)

func RecordPresence(userID, state string) {
	if userID == "" || state == "" {
		return
	}
	now := time.Now()
	presenceMu.Lock()
	presenceByUser[userID] = presenceState{State: state, UpdatedAt: now}
	listeners := make([]func(string, string, time.Time), len(presenceListens))
	copy(listeners, presenceListens)
	presenceMu.Unlock()
	for _, fn := range listeners {
		fn(userID, state, now)
	}
}

func SnapshotPresence() map[string]struct {
	State     string
	UpdatedAt time.Time
} {
	presenceMu.RLock()
	defer presenceMu.RUnlock()
	out := make(map[string]struct {
		State     string
		UpdatedAt time.Time
	}, len(presenceByUser))
	for k, v := range presenceByUser {
		out[k] = struct {
			State     string
			UpdatedAt time.Time
		}{State: v.State, UpdatedAt: v.UpdatedAt}
	}
	return out
}

func OnPresenceUpdate(fn func(userID, state string, updatedAt time.Time)) {
	if fn == nil {
		return
	}
	presenceMu.Lock()
	presenceListens = append(presenceListens, fn)
	presenceMu.Unlock()
}
