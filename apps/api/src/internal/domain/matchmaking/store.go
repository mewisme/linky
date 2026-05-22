package matchmaking

import (
	"sort"
	"sync"
	"time"
)

type QueueEntry struct {
	UserID   string
	SocketID string
	JoinedAt time.Time
}

const (
	skipCooldown = 10 * time.Second
	maxQueueWait = 5 * time.Minute
)

type skipEntry struct {
	skippedUserID string
	expiresAt     time.Time
}

type MemoryStore struct {
	mu       sync.RWMutex
	queue    map[string]*QueueEntry
	socketOf map[string]string
	userOf   map[string]string
	skips    map[string][]skipEntry
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		queue:    make(map[string]*QueueEntry),
		socketOf: make(map[string]string),
		userOf:   make(map[string]string),
		skips:    make(map[string][]skipEntry),
	}
}

func (s *MemoryStore) Enqueue(userID, socketID string) bool {
	if userID == "" || socketID == "" {
		return false
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if existing, ok := s.queue[userID]; ok {
		if existing.SocketID == socketID {
			return true
		}
		s.socketOf[userID] = socketID
		s.userOf[socketID] = userID
		existing.SocketID = socketID
		existing.JoinedAt = time.Now()
		return true
	}
	now := time.Now()
	s.queue[userID] = &QueueEntry{UserID: userID, SocketID: socketID, JoinedAt: now}
	s.socketOf[userID] = socketID
	s.userOf[socketID] = userID
	return true
}

func (s *MemoryStore) Dequeue(userID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, existed := s.queue[userID]
	if existed {
		if sid, ok := s.socketOf[userID]; ok {
			delete(s.userOf, sid)
		}
		delete(s.queue, userID)
		delete(s.socketOf, userID)
	}
	return existed
}

func (s *MemoryStore) DequeueIfOwner(userID, socketID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	cur, ok := s.socketOf[userID]
	if !ok || cur != socketID {
		return false
	}
	delete(s.queue, userID)
	delete(s.socketOf, userID)
	delete(s.userOf, socketID)
	return true
}

func (s *MemoryStore) DequeueBySocket(socketID string) (string, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	uid, ok := s.userOf[socketID]
	if !ok {
		return "", false
	}
	delete(s.queue, uid)
	delete(s.socketOf, uid)
	delete(s.userOf, socketID)
	return uid, true
}

func (s *MemoryStore) IsInQueue(userID string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	_, ok := s.queue[userID]
	return ok
}

func (s *MemoryStore) Size() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.queue)
}

func (s *MemoryStore) Snapshot(limit int) []QueueEntry {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]QueueEntry, 0, len(s.queue))
	for _, e := range s.queue {
		out = append(out, *e)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].JoinedAt.Before(out[j].JoinedAt) })
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out
}

func (s *MemoryStore) RecordSkip(skipper, skipped string) {
	if skipper == "" || skipped == "" {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now()
	existing := s.skips[skipper]
	filtered := existing[:0]
	for _, e := range existing {
		if e.expiresAt.After(now) {
			filtered = append(filtered, e)
		}
	}
	filtered = append(filtered, skipEntry{skippedUserID: skipped, expiresAt: now.Add(skipCooldown)})
	s.skips[skipper] = filtered
}

func (s *MemoryStore) HasSkip(a, b string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	now := time.Now()
	for _, e := range s.skips[a] {
		if e.skippedUserID == b && e.expiresAt.After(now) {
			return true
		}
	}
	for _, e := range s.skips[b] {
		if e.skippedUserID == a && e.expiresAt.After(now) {
			return true
		}
	}
	return false
}

func (s *MemoryStore) Cleanup() {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now()
	for uid, e := range s.queue {
		if now.Sub(e.JoinedAt) > maxQueueWait {
			if sid, ok := s.socketOf[uid]; ok {
				delete(s.userOf, sid)
			}
			delete(s.queue, uid)
			delete(s.socketOf, uid)
		}
	}
	for k, list := range s.skips {
		filtered := list[:0]
		for _, e := range list {
			if e.expiresAt.After(now) {
				filtered = append(filtered, e)
			}
		}
		if len(filtered) == 0 {
			delete(s.skips, k)
		} else {
			s.skips[k] = filtered
		}
	}
}
