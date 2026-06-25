package user

import (
	"context"
	"strings"
	"time"

	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/lib/plaintext"
)

const bioMaxLength = 300

func GetDetailsWithTags(ctx context.Context, userID string) (map[string]any, error) {
	details, err := supax.GetUserDetailsWithTags(ctx, userID)
	if err != nil {
		return nil, statusErr(500, "FAILED_FETCH_DETAILS", "failedFetchUserDetails", "Failed to fetch user details")
	}
	if details == nil {
		return nil, statusErr(404, "USER_DETAILS_NOT_FOUND", "userDetailsNotFound", "User details not found")
	}
	return details, nil
}

func applyDetailsBody(ctx context.Context, body map[string]any) error {
	if interestTags, ok := body["interest_tags"]; ok && interestTags != nil {
		arr, ok := interestTags.([]any)
		if !ok {
			return detailErr("PUT_DETAILS_VALIDATION", "interest_tags must be an array")
		}
		ids := make([]string, 0, len(arr))
		for _, v := range arr {
			s, _ := v.(string)
			if s == "" {
				continue
			}
			ids = append(ids, s)
		}
		if len(ids) > 0 {
			valid, err := supax.GetInterestTagsByIDs(ctx, ids)
			if err != nil {
				return statusErr(500, "INTEREST_TAGS_VALIDATE", "failedValidateInterestTags", "Failed to validate interest tags")
			}
			if len(valid) != len(ids) {
				validIDs := map[string]bool{}
				for _, t := range valid {
					validIDs[t.ID] = true
				}
				missing := []string{}
				for _, id := range ids {
					if !validIDs[id] {
						missing = append(missing, id)
					}
				}
				return detailErr("PUT_DETAILS_VALIDATION", "Invalid interest tag IDs: "+strings.Join(missing, ", "))
			}
		}
		body["interest_tags"] = ids
	}
	if dob, ok := body["date_of_birth"]; ok && dob != nil {
		s, _ := dob.(string)
		if s != "" {
			t, err := time.Parse("2006-01-02", s)
			if err != nil {
				if t2, err2 := time.Parse(time.RFC3339, s); err2 == nil {
					t = t2
				} else {
					return detailErr("PUT_DETAILS_DOB", "Date of birth must be a valid date")
				}
			}
			if t.After(time.Now()) {
				return detailErr("PUT_DETAILS_DOB", "Date of birth cannot be in the future")
			}
		}
	}
	if bio, ok := body["bio"]; ok && bio != nil {
		s, _ := bio.(string)
		if plaintext.ContainsDangerousMarkup(s) {
			return detailErr("PUT_DETAILS_BIO", "Bio contains invalid characters")
		}
		s = plaintext.SanitizePlainText(s, true)
		if len(s) > bioMaxLength {
			return detailErr("PUT_DETAILS_BIO", "Bio must be 300 characters or less")
		}
		if s == "" {
			body["bio"] = nil
		} else {
			body["bio"] = s
		}
	}
	if languages, ok := body["languages"]; ok && languages != nil {
		arr, ok := languages.([]any)
		if !ok {
			return detailErr("PUT_DETAILS_VALIDATION", "languages must be an array")
		}
		sanitized := make([]string, 0, len(arr))
		for _, v := range arr {
			s, _ := v.(string)
			if s == "" {
				continue
			}
			if plaintext.ContainsDangerousMarkup(s) {
				return detailErr("PUT_DETAILS_VALIDATION", "languages contain invalid characters")
			}
			sanitized = append(sanitized, plaintext.SanitizePlainText(s, false))
		}
		if len(sanitized) == 0 {
			body["languages"] = nil
		} else {
			body["languages"] = sanitized
		}
	}
	return nil
}

func PutDetails(ctx context.Context, userID string, body map[string]any) (map[string]any, error) {
	if body == nil {
		body = map[string]any{}
	}
	delete(body, "user_id")
	if err := applyDetailsBody(ctx, body); err != nil {
		return nil, err
	}
	if _, err := supax.UpsertUserDetails(ctx, userID, body); err != nil {
		return nil, statusErr(500, "FAILED_UPDATE_DETAILS_PUT", "failedUpdateUserDetails", "Failed to update user details")
	}
	return supax.GetUserDetailsWithTags(ctx, userID)
}

func ClearInterestTags(ctx context.Context, userID string) (map[string]any, error) {
	body := map[string]any{"interest_tags": nil}
	if _, err := supax.UpsertUserDetails(ctx, userID, body); err != nil {
		return nil, statusErr(500, "FAILED_CLEAR_TAGS", "failedClearInterestTags", "Failed to clear interest tags")
	}
	return supax.GetUserDetailsWithTags(ctx, userID)
}

func MutateInterestTags(ctx context.Context, userID, mode string, tagIDs []string) (map[string]any, error) {
	if mode != "replace" && len(tagIDs) == 0 {
		return nil, statusErr(400, "TAG_IDS_NON_EMPTY", "tagIdsNonEmpty", "tagIds must be a non-empty array")
	}
	if mode == "replace" && tagIDs == nil {
		return nil, statusErr(400, "TAG_IDS_ARRAY", "tagIdsArray", "tagIds must be an array")
	}
	if mode != "remove" && len(tagIDs) > 0 {
		valid, err := supax.GetInterestTagsByIDs(ctx, tagIDs)
		if err != nil {
			return nil, statusErr(500, "INTEREST_TAGS_VALIDATE", "failedValidateInterestTags", "Failed to validate interest tags")
		}
		if len(valid) != len(tagIDs) {
			validIDs := map[string]bool{}
			for _, t := range valid {
				validIDs[t.ID] = true
			}
			missing := []string{}
			for _, id := range tagIDs {
				if !validIDs[id] {
					missing = append(missing, id)
				}
			}
			return nil, detailErr("ADD_TAGS_INVALID", "Invalid or inactive tag IDs: "+strings.Join(missing, ", "))
		}
	}

	existing, err := supax.GetUserDetailsByUserID(ctx, userID)
	if err != nil {
		return nil, statusErr(500, "FAILED_FETCH_DETAILS", "failedFetchUserDetails", "Failed to fetch user details")
	}
	current := []string{}
	if existing != nil {
		current = append(current, existing.InterestTags...)
	}
	var updated []string
	switch mode {
	case "add":
		set := map[string]bool{}
		for _, t := range current {
			set[t] = true
		}
		for _, t := range tagIDs {
			set[t] = true
		}
		for k := range set {
			updated = append(updated, k)
		}
	case "remove":
		drop := map[string]bool{}
		for _, t := range tagIDs {
			drop[t] = true
		}
		for _, t := range current {
			if !drop[t] {
				updated = append(updated, t)
			}
		}
	case "replace":
		seen := map[string]bool{}
		for _, t := range tagIDs {
			if !seen[t] {
				seen[t] = true
				updated = append(updated, t)
			}
		}
	}
	body := map[string]any{"interest_tags": updated}
	if mode == "remove" && len(updated) == 0 {
		body["interest_tags"] = nil
	}
	if _, err := supax.UpsertUserDetails(ctx, userID, body); err != nil {
		return nil, statusErr(500, "FAILED_TAGS_MUTATE", "failedMutateInterestTags", "Failed to mutate interest tags")
	}
	return supax.GetUserDetailsWithTags(ctx, userID)
}
