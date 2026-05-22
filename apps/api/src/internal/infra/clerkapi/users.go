package clerkapi

import (
	"context"
	"net/url"
	"strconv"
)

type ListUsersOptions struct {
	Limit  int
	Offset int
	Query  string
	Banned *bool
}

type UserList struct {
	Data       []map[string]any `json:"data"`
	TotalCount int64            `json:"total_count"`
}

func ListUsers(ctx context.Context, opts ListUsersOptions) (*UserList, error) {
	c, err := Default()
	if err != nil {
		return nil, err
	}
	return c.ListUsers(ctx, opts)
}

func (c *Client) ListUsers(ctx context.Context, opts ListUsersOptions) (*UserList, error) {
	q := url.Values{}
	if opts.Limit > 0 {
		q.Set("limit", itoa(opts.Limit))
	}
	if opts.Offset > 0 {
		q.Set("offset", itoa(opts.Offset))
	}
	if opts.Query != "" {
		q.Set("query", opts.Query)
	}
	if opts.Banned != nil {
		q.Set("banned", boolStr(*opts.Banned))
	}
	var list UserList
	if err := c.Get(ctx, "/users", q, &list); err != nil {
		return nil, err
	}
	if list.Data == nil {
		list.Data = []map[string]any{}
	}
	return &list, nil
}

func GetUser(ctx context.Context, id string) (map[string]any, error) {
	c, err := Default()
	if err != nil {
		return nil, err
	}
	return c.GetUser(ctx, id)
}

func (c *Client) GetUser(ctx context.Context, id string) (map[string]any, error) {
	path, err := userPath(id)
	if err != nil {
		return nil, err
	}
	var u map[string]any
	if err := c.Get(ctx, path, nil, &u); err != nil {
		return nil, err
	}
	return u, nil
}

func UpdateUser(ctx context.Context, id string, body map[string]any) (map[string]any, error) {
	c, err := Default()
	if err != nil {
		return nil, err
	}
	return c.UpdateUser(ctx, id, body)
}

func (c *Client) UpdateUser(ctx context.Context, id string, body map[string]any) (map[string]any, error) {
	path, err := userPath(id)
	if err != nil {
		return nil, err
	}
	if body == nil {
		body = map[string]any{}
	}
	var u map[string]any
	if err := c.Patch(ctx, path, body, &u); err != nil {
		return nil, err
	}
	return u, nil
}

func DeleteUser(ctx context.Context, id string) error {
	c, err := Default()
	if err != nil {
		return err
	}
	return c.DeleteUser(ctx, id)
}

func (c *Client) DeleteUser(ctx context.Context, id string) error {
	path, err := userPath(id)
	if err != nil {
		return err
	}
	return c.Delete(ctx, path, nil)
}

type SetPasswordCompromisedParams struct {
	RevokeAllSessions *bool `json:"revoke_all_sessions,omitempty"`
}

func SetPasswordCompromised(ctx context.Context, id string, params SetPasswordCompromisedParams) (map[string]any, error) {
	c, err := Default()
	if err != nil {
		return nil, err
	}
	return c.SetPasswordCompromised(ctx, id, params)
}

func (c *Client) SetPasswordCompromised(ctx context.Context, id string, params SetPasswordCompromisedParams) (map[string]any, error) {
	path, err := userPath(id, "password", "set_compromised")
	if err != nil {
		return nil, err
	}
	var out map[string]any
	if err := c.Post(ctx, path, params, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func UnsetPasswordCompromised(ctx context.Context, id string) (map[string]any, error) {
	c, err := Default()
	if err != nil {
		return nil, err
	}
	return c.UnsetPasswordCompromised(ctx, id)
}

func (c *Client) UnsetPasswordCompromised(ctx context.Context, id string) (map[string]any, error) {
	path, err := userPath(id, "password", "unset_compromised")
	if err != nil {
		return nil, err
	}
	var out map[string]any
	if err := c.Post(ctx, path, nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func itoa(n int) string {
	return strconv.Itoa(n)
}

func boolStr(v bool) string {
	if v {
		return "true"
	}
	return "false"
}
