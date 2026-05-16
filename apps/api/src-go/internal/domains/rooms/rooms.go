package rooms

import (
	"sync"
	"time"

	"github.com/google/uuid"
)

type Participant struct {
	UserID    string
	SocketID  string
	UserName  string
	UserImage string
}

type Room struct {
	ID           string
	Participants [2]Participant
	StartedAt    time.Time
	LastPing     time.Time
}

type RoomService struct {
	mu          sync.RWMutex
	byID        map[string]*Room
	bySocket    map[string]*Room
	byUser      map[string]*Room
}

func NewService() *RoomService {
	return &RoomService{
		byID:     make(map[string]*Room),
		bySocket: make(map[string]*Room),
		byUser:   make(map[string]*Room),
	}
}

func (rs *RoomService) Create(p1, p2 Participant) *Room {
	rs.mu.Lock()
	defer rs.mu.Unlock()
	r := &Room{
		ID:           uuid.NewString(),
		Participants: [2]Participant{p1, p2},
		StartedAt:    time.Now(),
		LastPing:     time.Now(),
	}
	rs.byID[r.ID] = r
	rs.bySocket[p1.SocketID] = r
	rs.bySocket[p2.SocketID] = r
	if p1.UserID != "" {
		rs.byUser[p1.UserID] = r
	}
	if p2.UserID != "" {
		rs.byUser[p2.UserID] = r
	}
	return r
}

func (rs *RoomService) BySocket(socketID string) *Room {
	rs.mu.RLock()
	defer rs.mu.RUnlock()
	return rs.bySocket[socketID]
}

func (rs *RoomService) ByUser(userID string) *Room {
	rs.mu.RLock()
	defer rs.mu.RUnlock()
	return rs.byUser[userID]
}

func (rs *RoomService) Remove(roomID string) *Room {
	rs.mu.Lock()
	defer rs.mu.Unlock()
	r, ok := rs.byID[roomID]
	if !ok {
		return nil
	}
	delete(rs.byID, roomID)
	delete(rs.bySocket, r.Participants[0].SocketID)
	delete(rs.bySocket, r.Participants[1].SocketID)
	if r.Participants[0].UserID != "" {
		delete(rs.byUser, r.Participants[0].UserID)
	}
	if r.Participants[1].UserID != "" {
		delete(rs.byUser, r.Participants[1].UserID)
	}
	return r
}

func (rs *RoomService) Touch(roomID string) {
	rs.mu.Lock()
	defer rs.mu.Unlock()
	if r, ok := rs.byID[roomID]; ok {
		r.LastPing = time.Now()
	}
}

func (rs *RoomService) All() []*Room {
	rs.mu.RLock()
	defer rs.mu.RUnlock()
	out := make([]*Room, 0, len(rs.byID))
	for _, r := range rs.byID {
		out = append(out, r)
	}
	return out
}

func (rs *RoomService) PeerOf(socketID string) (*Participant, *Room) {
	rs.mu.RLock()
	defer rs.mu.RUnlock()
	r, ok := rs.bySocket[socketID]
	if !ok {
		return nil, nil
	}
	if r.Participants[0].SocketID == socketID {
		return &r.Participants[1], r
	}
	return &r.Participants[0], r
}
