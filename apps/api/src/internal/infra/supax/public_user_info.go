package supax

import "context"

func PublicUserInfoByUserID(ctx context.Context, userID string) map[string]any {
	if userID == "" {
		return nil
	}
	out := map[string]any{
		"id":            userID,
		"avatar_url":    nil,
		"first_name":    nil,
		"last_name":     nil,
		"date_of_birth": nil,
		"gender":        nil,
		"bio":           nil,
		"interest_tags": nil,
	}
	user, err := GetUserByID(ctx, userID)
	if err == nil && user != nil {
		if v, ok := user["avatar_url"]; ok {
			out["avatar_url"] = v
		}
		if v, ok := user["first_name"]; ok {
			out["first_name"] = v
		}
		if v, ok := user["last_name"]; ok {
			out["last_name"] = v
		}
	}
	details, err := GetUserDetailsWithTags(ctx, userID)
	if err == nil && details != nil {
		if v, ok := details["bio"]; ok {
			out["bio"] = v
		}
		if v, ok := details["gender"]; ok {
			out["gender"] = v
		}
		if v, ok := details["date_of_birth"]; ok {
			out["date_of_birth"] = v
		}
		if v, ok := details["interest_tags"]; ok {
			out["interest_tags"] = v
		}
	}
	return out
}
