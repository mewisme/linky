package clerkx

import (
	"context"
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/clerk/clerk-sdk-go/v2/user"

	"linky-api/src-go/internal/config"
	"linky-api/src-go/internal/logger"
)

// verifyLeeway is the clock-skew tolerance applied when validating Clerk
// session JWTs. Matches @clerk/backend's default leeway (30s) so that
// minor drift between the API host and Clerk does not surface as
// "token is expired (exp)" or "token issued in the future (iat)" errors.
const verifyLeeway = 30 * time.Second

var (
	cfg     *config.Config
	once    sync.Once
	userCli *user.Client
	log     = logger.New("infra:clerk")
)

type VerifiedToken struct {
	Sub string
	Raw map[string]interface{}
}

func Init(c *config.Config) {
	cfg = c
	once.Do(func() {
		if c.ClerkSecretKey != "" {
			clerk.SetKey(c.ClerkSecretKey)
		}
		userCli = user.NewClient(&clerk.ClientConfig{})
	})
}

func VerifyToken(ctx context.Context, token string) (*VerifiedToken, error) {
	if cfg == nil || cfg.ClerkSecretKey == "" {
		return nil, errors.New("clerkx: not initialized")
	}
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, errors.New("clerkx: empty token")
	}
	claims, err := jwt.Verify(ctx, &jwt.VerifyParams{Token: token, Leeway: verifyLeeway})
	if err != nil {
		return nil, err
	}
	if claims.Subject == "" {
		return nil, errors.New("clerkx: missing sub claim")
	}
	raw := map[string]interface{}{
		"sub": claims.Subject,
		"sid": claims.SessionID,
		"azp": claims.AuthorizedParty,
	}
	return &VerifiedToken{Sub: claims.Subject, Raw: raw}, nil
}

type ClerkUser struct {
	ID        string
	FirstName string
	Username  string
	ImageURL  string
}

func GetUser(ctx context.Context, id string) (*ClerkUser, error) {
	if userCli == nil {
		return nil, errors.New("clerkx: not initialized")
	}
	u, err := userCli.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	first := ""
	if u.FirstName != nil {
		first = *u.FirstName
	}
	username := ""
	if u.Username != nil {
		username = *u.Username
	}
	imageURL := ""
	if u.ImageURL != nil {
		imageURL = *u.ImageURL
	}
	return &ClerkUser{
		ID:        u.ID,
		FirstName: first,
		Username:  username,
		ImageURL:  imageURL,
	}, nil
}
