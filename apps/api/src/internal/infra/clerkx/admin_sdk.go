package clerkx

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/user"
)

var ErrNotConfigured = errors.New("clerkx: clerk secret key not configured")

type AdminListUsersOptions struct {
	Limit  int
	Offset int
	Query  string
	Banned *bool
}

func SDKAvailable() bool {
	return userCli != nil && cfg != nil && cfg.ClerkSecretKey != ""
}

func requireSDK() error {
	if !SDKAvailable() {
		return ErrNotConfigured
	}
	return nil
}

func AdminListUsers(ctx context.Context, opts AdminListUsersOptions) (*clerk.UserList, error) {
	if err := requireSDK(); err != nil {
		return nil, err
	}
	params := &user.ListParams{}
	if opts.Limit > 0 {
		l := int64(opts.Limit)
		params.Limit = &l
	}
	if opts.Offset > 0 {
		o := int64(opts.Offset)
		params.Offset = &o
	}
	if opts.Query != "" {
		params.Query = &opts.Query
	}
	if opts.Banned != nil {
		params.Banned = opts.Banned
	}
	return userCli.List(ctx, params)
}

func AdminGetUser(ctx context.Context, id string) (*clerk.User, error) {
	if err := requireSDK(); err != nil {
		return nil, err
	}
	return userCli.Get(ctx, id)
}

func AdminUpdateUser(ctx context.Context, id string, body map[string]any) (*clerk.User, error) {
	if err := requireSDK(); err != nil {
		return nil, err
	}
	params, err := updateParamsFromBody(body)
	if err != nil {
		return nil, err
	}
	return userCli.Update(ctx, id, params)
}

func AdminDeleteUser(ctx context.Context, id string) error {
	if err := requireSDK(); err != nil {
		return err
	}
	_, err := userCli.Delete(ctx, id)
	return err
}

func UserToMap(u *clerk.User) (map[string]any, error) {
	if u == nil {
		return nil, errors.New("clerkx: nil user")
	}
	raw, err := json.Marshal(u)
	if err != nil {
		return nil, err
	}
	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func updateParamsFromBody(body map[string]any) (*user.UpdateParams, error) {
	if body == nil {
		body = map[string]any{}
	}
	raw, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	var params user.UpdateParams
	if err := json.Unmarshal(raw, &params); err != nil {
		return nil, err
	}
	return &params, nil
}
