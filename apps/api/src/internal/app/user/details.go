package user

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"linky-api/src/internal/infra/supax"
)

const BioMaxLength = 500

var (
	ErrDetailsValidation = errors.New("details validation failed")
	ErrTagIDsNonEmpty    = errors.New("tagIds must be a non-empty array")
	ErrTagIDsArray       = errors.New("tagIds must be an array")
)

type DetailsValidationError struct {
	Code    string
	Key     string
	Message string
}

func (e *DetailsValidationError) Error() string {
	return e.Message
}

func ValidateAndNormalizeDetails(ctx context.Context, body map[string]any) error {
	if interestTags, ok := body["interest_tags"]; ok && interestTags != nil {
		arr, ok := interestTags.([]any)
		if !ok {
			return &DetailsValidationError{
				Code: "PUT_DETAILS_VALIDATION", Key: "putDetailsValidation",
				Message: "interest_tags must be an array",
			}
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
				return err
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
				return &DetailsValidationError{
					Code: "PUT_DETAILS_VALIDATION", Key: "putDetailsValidation",
					Message: "Invalid interest tag IDs: " + strings.Join(missing, ", "),
				}
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
					return &DetailsValidationError{
						Code: "PUT_DETAILS_DOB", Key: "putDetailsDob",
						Message: "Date of birth must be a valid date",
					}
				}
			}
			if t.After(time.Now()) {
				return &DetailsValidationError{
					Code: "PUT_DETAILS_DOB", Key: "putDetailsDob",
					Message: "Date of birth cannot be in the future",
				}
			}
		}
	}
	if bio, ok := body["bio"]; ok && bio != nil {
		s, _ := bio.(string)
		if len(s) > BioMaxLength {
			return &DetailsValidationError{
				Code: "PUT_DETAILS_BIO", Key: "putDetailsBio",
				Message: fmt.Sprintf("Bio must be %d characters or less", BioMaxLength),
			}
		}
	}
	return nil
}

func UpsertDetails(ctx context.Context, uid string, body map[string]any) (any, error) {
	delete(body, "user_id")
	if err := ValidateAndNormalizeDetails(ctx, body); err != nil {
		return nil, err
	}
	if _, err := supax.UpsertUserDetails(ctx, uid, body); err != nil {
		return nil, err
	}
	return supax.GetUserDetailsWithTags(ctx, uid)
}

func ClearInterestTags(ctx context.Context, uid string) (any, error) {
	body := map[string]any{"interest_tags": nil}
	if _, err := supax.UpsertUserDetails(ctx, uid, body); err != nil {
		return nil, err
	}
	return supax.GetUserDetailsWithTags(ctx, uid)
}

func MutateInterestTags(ctx context.Context, uid string, mode string, tagIDs []string) (any, error) {
	if mode != "replace" && len(tagIDs) == 0 {
		return nil, ErrTagIDsNonEmpty
	}
	if mode == "replace" && tagIDs == nil {
		return nil, ErrTagIDsArray
	}
	if mode != "remove" && len(tagIDs) > 0 {
		valid, err := supax.GetInterestTagsByIDs(ctx, tagIDs)
		if err != nil {
			return nil, err
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
			return nil, &DetailsValidationError{
				Code: "ADD_TAGS_INVALID", Key: "addTagsInvalid",
				Message: "Invalid or inactive tag IDs: " + strings.Join(missing, ", "),
			}
		}
	}

	existing, err := supax.GetUserDetailsByUserID(ctx, uid)
	if err != nil {
		return nil, err
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
	if _, err := supax.UpsertUserDetails(ctx, uid, body); err != nil {
		return nil, err
	}
	return supax.GetUserDetailsWithTags(ctx, uid)
}
