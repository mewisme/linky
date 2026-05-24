package routes

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/supax"
)

const bioMaxLength = 500

func registerUserDetailsRoutes(g *echo.Group) {
	g.GET("/me", handleUserDetailsGet)
	g.PUT("/me", handleUserDetailsPut)
	g.PATCH("/me", handleUserDetailsPatch)
	g.POST("/me/interest-tags", handleAddInterestTags)
	g.DELETE("/me/interest-tags", handleRemoveInterestTags)
	g.PUT("/me/interest-tags", handleReplaceInterestTags)
	g.DELETE("/me/interest-tags/all", handleClearInterestTags)
}

func handleUserDetailsGet(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	if clerkID == "" {
		return httpx.SendError(c, 401, "Unauthorized",
			httpx.UM("USER_ID_NOT_IN_TOKEN", "userIdNotInToken", "User ID not found in authentication token"))
	}
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	details, err := supax.GetUserDetailsWithTags(c.Request().Context(), uid)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_DETAILS", "failedFetchUserDetails", "Failed to fetch user details"))
	}
	if details == nil {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_DETAILS_NOT_FOUND", "userDetailsNotFound", "User details not found"))
	}
	return c.JSON(http.StatusOK, details)
}

func validateAndApplyDetails(c echo.Context, body map[string]any) error {
	if interestTags, ok := body["interest_tags"]; ok && interestTags != nil {
		arr, ok := interestTags.([]any)
		if !ok {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UMDetail("PUT_DETAILS_VALIDATION", "interest_tags must be an array"))
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
			valid, err := supax.GetInterestTagsByIDs(c.Request().Context(), ids)
			if err != nil {
				return httpx.SendError(c, 500, "Internal Server Error",
					httpx.UM("INTEREST_TAGS_VALIDATE", "failedValidateInterestTags", "Failed to validate interest tags"))
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
				return httpx.SendError(c, 400, "Bad Request",
					httpx.UMDetail("PUT_DETAILS_VALIDATION", "Invalid interest tag IDs: "+strings.Join(missing, ", ")))
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
					return httpx.SendError(c, 400, "Bad Request",
						httpx.UMDetail("PUT_DETAILS_DOB", "Date of birth must be a valid date"))
				}
			}
			if t.After(time.Now()) {
				return httpx.SendError(c, 400, "Bad Request",
					httpx.UMDetail("PUT_DETAILS_DOB", "Date of birth cannot be in the future"))
			}
		}
	}
	if bio, ok := body["bio"]; ok && bio != nil {
		s, _ := bio.(string)
		if len(s) > bioMaxLength {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UMDetail("PUT_DETAILS_BIO", "Bio must be 500 characters or less"))
		}
	}
	return nil
}

func handleUserDetailsPut(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	raw, _ := io.ReadAll(c.Request().Body)
	var body map[string]any
	_ = json.Unmarshal(raw, &body)
	if body == nil {
		body = map[string]any{}
	}
	delete(body, "user_id")
	if err := validateAndApplyDetails(c, body); err != nil {
		return err
	}
	if _, err := supax.UpsertUserDetails(c.Request().Context(), uid, body); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_UPDATE_DETAILS_PUT", "failedUpdateUserDetails", "Failed to update user details"))
	}
	details, _ := supax.GetUserDetailsWithTags(c.Request().Context(), uid)
	return c.JSON(http.StatusOK, details)
}

func handleUserDetailsPatch(c echo.Context) error {
	return handleUserDetailsPut(c)
}

func handleAddInterestTags(c echo.Context) error {
	return mutateInterestTags(c, "add")
}

func handleRemoveInterestTags(c echo.Context) error {
	return mutateInterestTags(c, "remove")
}

func handleReplaceInterestTags(c echo.Context) error {
	return mutateInterestTags(c, "replace")
}

func handleClearInterestTags(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	body := map[string]any{"interest_tags": nil}
	if _, err := supax.UpsertUserDetails(c.Request().Context(), uid, body); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_CLEAR_TAGS", "failedClearInterestTags", "Failed to clear interest tags"))
	}
	details, _ := supax.GetUserDetailsWithTags(c.Request().Context(), uid)
	return c.JSON(http.StatusOK, details)
}

func mutateInterestTags(c echo.Context, mode string) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		TagIDs []string `json:"tagIds"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if mode != "replace" && len(input.TagIDs) == 0 {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("TAG_IDS_NON_EMPTY", "tagIdsNonEmpty", "tagIds must be a non-empty array"))
	}
	if mode == "replace" && input.TagIDs == nil {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("TAG_IDS_ARRAY", "tagIdsArray", "tagIds must be an array"))
	}
	if mode != "remove" && len(input.TagIDs) > 0 {
		valid, err := supax.GetInterestTagsByIDs(c.Request().Context(), input.TagIDs)
		if err != nil {
			return httpx.SendError(c, 500, "Internal Server Error",
				httpx.UM("INTEREST_TAGS_VALIDATE", "failedValidateInterestTags", "Failed to validate interest tags"))
		}
		if len(valid) != len(input.TagIDs) {
			validIDs := map[string]bool{}
			for _, t := range valid {
				validIDs[t.ID] = true
			}
			missing := []string{}
			for _, id := range input.TagIDs {
				if !validIDs[id] {
					missing = append(missing, id)
				}
			}
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UMDetail("ADD_TAGS_INVALID", "Invalid or inactive tag IDs: "+strings.Join(missing, ", ")))
		}
	}

	existing, err := supax.GetUserDetailsByUserID(c.Request().Context(), uid)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_DETAILS", "failedFetchUserDetails", "Failed to fetch user details"))
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
		for _, t := range input.TagIDs {
			set[t] = true
		}
		for k := range set {
			updated = append(updated, k)
		}
	case "remove":
		drop := map[string]bool{}
		for _, t := range input.TagIDs {
			drop[t] = true
		}
		for _, t := range current {
			if !drop[t] {
				updated = append(updated, t)
			}
		}
	case "replace":
		seen := map[string]bool{}
		for _, t := range input.TagIDs {
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
	if _, err := supax.UpsertUserDetails(c.Request().Context(), uid, body); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_TAGS_MUTATE", "failedMutateInterestTags", "Failed to mutate interest tags"))
	}
	details, _ := supax.GetUserDetailsWithTags(c.Request().Context(), uid)
	return c.JSON(http.StatusOK, details)
}
