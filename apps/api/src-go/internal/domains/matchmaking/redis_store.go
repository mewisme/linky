package matchmaking

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	queueKey            = "match:queue"
	socketKeyPrefix     = "match:socket:"
	favoritesKeyPrefix  = "matchmaking:favorites:"
	skipKeyPrefix       = "match:skip:"
	interestsKeyPrefix  = "user:interests:"
	blocksKeyPrefix     = "user:blocks:"
	maxQueueWaitSeconds = 5 * 60
	skipCooldownSeconds = 10
	interestsTTLSeconds = 15 * 60
	favoritesTTLSeconds = 10 * 60
	blocksTTLSeconds    = 30 * 60
)

type Store interface {
	Enqueue(userID, socketID string) bool
	Dequeue(userID string) bool
	DequeueIfOwner(userID, socketID string) bool
	DequeueBySocket(socketID string) (string, bool)
	IsInQueue(userID string) bool
	Size() int
	Snapshot(limit int) []QueueEntry
	RecordSkip(skipper, skipped string)
	HasSkip(a, b string) bool
	Cleanup()
	GetUserInterests(userID string) []string
	GetUserFavorites(userID string) []string
	GetUserBlocks(userID string) []string
	CacheUserData(userID string, interests, favorites, blocks []string)
}

func (s *MemoryStore) GetUserInterests(_ string) []string { return nil }
func (s *MemoryStore) GetUserFavorites(_ string) []string { return nil }
func (s *MemoryStore) GetUserBlocks(_ string) []string    { return nil }
func (s *MemoryStore) CacheUserData(_ string, _, _, _ []string) {}

type RedisStore struct {
	client            *redis.Client
	enqueueScript     *redis.Script
	dequeueOwnerSc    *redis.Script
}

const enqueueLua = `
local queueKey = KEYS[1]
local socketKey = KEYS[2]
local userId = ARGV[1]
local socketId = ARGV[2]
local now = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])
local existingSocket = redis.call("GET", socketKey)
local existingScore = redis.call("ZSCORE", queueKey, userId)
if existingSocket == socketId and existingScore then
  return {1, existingSocket, existingScore}
end
redis.call("ZADD", queueKey, now, userId)
redis.call("SET", socketKey, socketId, "EX", ttl)
return {1, existingSocket or "", existingScore or ""}
`

const dequeueIfOwnerLua = `
local queueKey = KEYS[1]
local socketKey = KEYS[2]
local userId = ARGV[1]
local socketId = ARGV[2]
local existingSocket = redis.call("GET", socketKey)
if existingSocket ~= socketId then
  return 0
end
redis.call("ZREM", queueKey, userId)
redis.call("DEL", socketKey)
return 1
`

func NewRedisStore(c *redis.Client) *RedisStore {
	return &RedisStore{
		client:         c,
		enqueueScript:  redis.NewScript(enqueueLua),
		dequeueOwnerSc: redis.NewScript(dequeueIfOwnerLua),
	}
}

func (s *RedisStore) ctx() context.Context {
	c, _ := context.WithTimeout(context.Background(), 5*time.Second)
	return c
}

func (s *RedisStore) Enqueue(userID, socketID string) bool {
	if userID == "" || socketID == "" {
		return false
	}
	now := time.Now().UnixMilli()
	ttl := maxQueueWaitSeconds + 60
	socketKey := socketKeyPrefix + userID
	_, err := s.enqueueScript.Run(s.ctx(), s.client,
		[]string{queueKey, socketKey},
		userID, socketID, fmt.Sprintf("%d", now), strconv.Itoa(ttl)).Result()
	return err == nil
}

func (s *RedisStore) Dequeue(userID string) bool {
	ctx := s.ctx()
	socketKey := socketKeyPrefix + userID
	removed, err := s.client.ZRem(ctx, queueKey, userID).Result()
	_ = s.client.Del(ctx, socketKey).Err()
	if err != nil {
		return false
	}
	return removed > 0
}

func (s *RedisStore) DequeueIfOwner(userID, socketID string) bool {
	socketKey := socketKeyPrefix + userID
	res, err := s.dequeueOwnerSc.Run(s.ctx(), s.client,
		[]string{queueKey, socketKey},
		userID, socketID).Result()
	if err != nil {
		return false
	}
	n, _ := res.(int64)
	return n > 0
}

func (s *RedisStore) DequeueBySocket(socketID string) (string, bool) {
	ctx := s.ctx()
	pattern := socketKeyPrefix + "*"
	iter := s.client.Scan(ctx, 0, pattern, 100).Iterator()
	for iter.Next(ctx) {
		key := iter.Val()
		v, err := s.client.Get(ctx, key).Result()
		if err == nil && v == socketID {
			uid := key[len(socketKeyPrefix):]
			s.Dequeue(uid)
			return uid, true
		}
	}
	return "", false
}

func (s *RedisStore) IsInQueue(userID string) bool {
	ctx := s.ctx()
	score, err := s.client.ZScore(ctx, queueKey, userID).Result()
	if err != nil {
		return false
	}
	_ = score
	return true
}

func (s *RedisStore) Size() int {
	ctx := s.ctx()
	n, err := s.client.ZCard(ctx, queueKey).Result()
	if err != nil {
		return 0
	}
	return int(n)
}

func (s *RedisStore) Snapshot(limit int) []QueueEntry {
	ctx := s.ctx()
	if limit <= 0 {
		limit = 50
	}
	members, err := s.client.ZRangeWithScores(ctx, queueKey, 0, int64(limit-1)).Result()
	if err != nil || len(members) == 0 {
		return nil
	}
	keys := make([]string, len(members))
	for i, m := range members {
		uid, _ := m.Member.(string)
		keys[i] = socketKeyPrefix + uid
	}
	socketIDs, err := s.client.MGet(ctx, keys...).Result()
	if err != nil {
		return nil
	}
	out := make([]QueueEntry, 0, len(members))
	for i, m := range members {
		uid, _ := m.Member.(string)
		sid, _ := socketIDs[i].(string)
		if uid == "" || sid == "" {
			continue
		}
		out = append(out, QueueEntry{
			UserID:   uid,
			SocketID: sid,
			JoinedAt: time.UnixMilli(int64(m.Score)),
		})
	}
	return out
}

func (s *RedisStore) RecordSkip(skipper, skipped string) {
	ctx := s.ctx()
	key := skipKeyPrefix + skipper
	_ = s.client.SAdd(ctx, key, skipped).Err()
	_ = s.client.Expire(ctx, key, skipCooldownSeconds*time.Second).Err()
}

func (s *RedisStore) HasSkip(a, b string) bool {
	ctx := s.ctx()
	if v, _ := s.client.SIsMember(ctx, skipKeyPrefix+a, b).Result(); v {
		return true
	}
	if v, _ := s.client.SIsMember(ctx, skipKeyPrefix+b, a).Result(); v {
		return true
	}
	return false
}

func (s *RedisStore) Cleanup() {
	ctx := s.ctx()
	members, err := s.client.ZRangeWithScores(ctx, queueKey, 0, 49).Result()
	if err != nil || len(members) == 0 {
		return
	}
	now := time.Now().UnixMilli()
	for _, m := range members {
		if now-int64(m.Score) > maxQueueWaitSeconds*1000 {
			uid, _ := m.Member.(string)
			s.Dequeue(uid)
		}
	}
}

func (s *RedisStore) GetUserInterests(userID string) []string {
	ctx := s.ctx()
	res, err := s.client.SMembers(ctx, interestsKeyPrefix+userID).Result()
	if err != nil {
		return nil
	}
	return res
}

func (s *RedisStore) GetUserFavorites(userID string) []string {
	ctx := s.ctx()
	res, err := s.client.SMembers(ctx, favoritesKeyPrefix+userID).Result()
	if err != nil {
		return nil
	}
	return res
}

func (s *RedisStore) GetUserBlocks(userID string) []string {
	ctx := s.ctx()
	res, err := s.client.SMembers(ctx, blocksKeyPrefix+userID).Result()
	if err != nil {
		return nil
	}
	return res
}

func (s *RedisStore) CacheUserData(userID string, interests, favorites, blocks []string) {
	ctx := s.ctx()
	if userID == "" {
		return
	}
	if interests != nil {
		key := interestsKeyPrefix + userID
		_ = s.client.Del(ctx, key).Err()
		if len(interests) > 0 {
			args := toAnySlice(interests)
			_ = s.client.SAdd(ctx, key, args...).Err()
			_ = s.client.Expire(ctx, key, interestsTTLSeconds*time.Second).Err()
		}
	}
	if favorites != nil {
		key := favoritesKeyPrefix + userID
		_ = s.client.Del(ctx, key).Err()
		if len(favorites) > 0 {
			args := toAnySlice(favorites)
			_ = s.client.SAdd(ctx, key, args...).Err()
			_ = s.client.Expire(ctx, key, favoritesTTLSeconds*time.Second).Err()
		}
	}
	if blocks != nil {
		key := blocksKeyPrefix + userID
		_ = s.client.Del(ctx, key).Err()
		if len(blocks) > 0 {
			args := toAnySlice(blocks)
			_ = s.client.SAdd(ctx, key, args...).Err()
			_ = s.client.Expire(ctx, key, blocksTTLSeconds*time.Second).Err()
		}
	}
}

func toAnySlice(v []string) []interface{} {
	out := make([]interface{}, len(v))
	for i, s := range v {
		out[i] = s
	}
	return out
}

var _ Store = (*MemoryStore)(nil)
var _ Store = (*RedisStore)(nil)

var ErrNotConfigured = errors.New("matchmaking: redis not configured")
