package clerkadmin

import (
	"context"

	"github.com/clerk/clerk-sdk-go/v2"

	"linky-api/src/internal/infra/admincache"
	"linky-api/src/internal/infra/clerkapi"
	"linky-api/src/internal/infra/clerkx"
)

type ListUsersOptions = clerkapi.ListUsersOptions

type UserList = clerkapi.UserList

type SetPasswordCompromisedParams = clerkapi.SetPasswordCompromisedParams

func requireAdminActor(ctx context.Context, actorClerkID string) error {
	if actorClerkID == "" {
		return ErrActorRequired
	}
	ok, err := admincache.IsAdmin(ctx, actorClerkID)
	if err != nil {
		return err
	}
	if !ok {
		return ErrForbidden
	}
	return nil
}

func ListUsers(ctx context.Context, actorClerkID string, opts ListUsersOptions) (*UserList, error) {
	if err := requireAdminActor(ctx, actorClerkID); err != nil {
		return nil, err
	}
	if clerkx.SDKAvailable() {
		list, err := clerkx.AdminListUsers(ctx, clerkx.AdminListUsersOptions(opts))
		if err == nil {
			return userListFromSDK(list)
		}
		if !isSDKUnavailable(err) {
			return nil, err
		}
	}
	return clerkapi.ListUsers(ctx, opts)
}

func GetUser(ctx context.Context, actorClerkID, id string) (map[string]any, error) {
	if err := requireAdminActor(ctx, actorClerkID); err != nil {
		return nil, err
	}
	if clerkx.SDKAvailable() {
		u, err := clerkx.AdminGetUser(ctx, id)
		if err == nil {
			return clerkx.UserToMap(u)
		}
		if !isSDKUnavailable(err) {
			return nil, err
		}
	}
	return clerkapi.GetUser(ctx, id)
}

func UpdateUser(ctx context.Context, actorClerkID, id string, body map[string]any) (map[string]any, error) {
	if err := requireAdminActor(ctx, actorClerkID); err != nil {
		return nil, err
	}
	if clerkx.SDKAvailable() {
		u, err := clerkx.AdminUpdateUser(ctx, id, body)
		if err == nil {
			return clerkx.UserToMap(u)
		}
		if !isSDKUnavailable(err) {
			return nil, err
		}
	}
	return clerkapi.UpdateUser(ctx, id, body)
}

func DeleteUser(ctx context.Context, actorClerkID, id string) error {
	if err := requireAdminActor(ctx, actorClerkID); err != nil {
		return err
	}
	if clerkx.SDKAvailable() {
		err := clerkx.AdminDeleteUser(ctx, id)
		if err == nil {
			return nil
		}
		if !isSDKUnavailable(err) {
			return err
		}
	}
	return clerkapi.DeleteUser(ctx, id)
}

func SetPasswordCompromised(ctx context.Context, actorClerkID, id string, params SetPasswordCompromisedParams) (map[string]any, error) {
	if err := requireAdminActor(ctx, actorClerkID); err != nil {
		return nil, err
	}
	return clerkapi.SetPasswordCompromised(ctx, id, params)
}

func UnsetPasswordCompromised(ctx context.Context, actorClerkID, id string) (map[string]any, error) {
	if err := requireAdminActor(ctx, actorClerkID); err != nil {
		return nil, err
	}
	return clerkapi.UnsetPasswordCompromised(ctx, id)
}

func isSDKUnavailable(err error) bool {
	return err == clerkx.ErrNotConfigured
}

func userListFromSDK(list *clerk.UserList) (*UserList, error) {
	if list == nil {
		return &UserList{Data: []map[string]any{}, TotalCount: 0}, nil
	}
	data := make([]map[string]any, 0, len(list.Users))
	for _, u := range list.Users {
		m, err := clerkx.UserToMap(u)
		if err != nil {
			return nil, err
		}
		data = append(data, m)
	}
	return &UserList{Data: data, TotalCount: list.TotalCount}, nil
}
