package clerkx

import (
	"context"
	"errors"
	"time"
)

type SocketProfile struct {
	Sub       string
	UserName  string
	UserImage string
	Raw       map[string]any
}

func AuthenticateSocketToken(ctx context.Context, token string) (*SocketProfile, error) {
	if token == "" {
		return nil, errors.New("clerkx: missing token")
	}
	payload, err := VerifyToken(ctx, token)
	if err != nil {
		return nil, err
	}
	userName := "Anonymous"
	var userImage string
	profileCtx, profileCancel := context.WithTimeout(ctx, 5*time.Second)
	defer profileCancel()
	if u, err := GetUser(profileCtx, payload.Sub); err == nil && u != nil {
		if u.FirstName != "" {
			userName = u.FirstName
		} else if u.Username != "" {
			userName = u.Username
		}
		userImage = u.ImageURL
	}
	return &SocketProfile{
		Sub:       payload.Sub,
		UserName:  userName,
		UserImage: userImage,
		Raw:       payload.Raw,
	}, nil
}
