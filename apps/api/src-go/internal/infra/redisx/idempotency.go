package redisx

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	idemKeyPrefix = "linky:worker:idempotency:v1:"
	idemTTL       = 172800 * time.Second
)

type IdempotencyOutcome string

const (
	IdemNew      IdempotencyOutcome = "new"
	IdemReplay   IdempotencyOutcome = "replay"
	IdemConflict IdempotencyOutcome = "conflict"
)

func TryReserveGeneralJobIdempotency(ctx context.Context, idempotencyKey, bodyHash string) (IdempotencyOutcome, error) {
	c := Client()
	if c == nil {
		return IdemNew, nil
	}
	key := idemKeyPrefix + idempotencyKey
	return WithTimeout(ctx, "worker-general-job-idempotency-reserve", func(ctx context.Context) (IdempotencyOutcome, error) {
		ok, err := c.SetNX(ctx, key, bodyHash, idemTTL).Result()
		if err != nil {
			return "", err
		}
		if ok {
			return IdemNew, nil
		}
		existing, err := c.Get(ctx, key).Result()
		if err != nil {
			if err == redis.Nil {
				return IdemConflict, nil
			}
			return "", err
		}
		if existing == bodyHash {
			return IdemReplay, nil
		}
		return IdemConflict, nil
	})
}

func ReleaseGeneralJobIdempotency(ctx context.Context, idempotencyKey string) {
	c := Client()
	if c == nil {
		return
	}
	key := idemKeyPrefix + idempotencyKey
	_ = WithTimeoutVoid(ctx, "worker-general-job-idempotency-release", func(ctx context.Context) error {
		return c.Del(ctx, key).Err()
	})
}
