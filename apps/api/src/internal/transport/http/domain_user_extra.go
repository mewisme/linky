package routes

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/app/report"
	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/lib/plaintext"
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
		if plaintext.ContainsDangerousMarkup(s) {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UMDetail("PUT_DETAILS_BIO", "Bio contains invalid characters"))
		}
		s = plaintext.SanitizePlainText(s, true)
		if len(s) > bioMaxLength {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UMDetail("PUT_DETAILS_BIO", "Bio must be 500 characters or less"))
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
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UMDetail("PUT_DETAILS_VALIDATION", "languages must be an array"))
		}
		sanitized := make([]string, 0, len(arr))
		for _, v := range arr {
			s, _ := v.(string)
			if s == "" {
				continue
			}
			if plaintext.ContainsDangerousMarkup(s) {
				return httpx.SendError(c, 400, "Bad Request",
					httpx.UMDetail("PUT_DETAILS_VALIDATION", "languages contain invalid characters"))
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

func registerUserSettingsRoutes(g *echo.Group) {
	g.GET("/me", handleUserSettingsGet)
	g.PUT("/me", handleUserSettingsPut)
	g.PATCH("/me", handleUserSettingsPut)
}

func handleUserSettingsGet(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	settings, err := supax.GetUserSettings(c.Request().Context(), uid)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_SETTINGS", "failedFetchUserSettings", "Failed to fetch user settings"))
	}
	if settings == nil {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_SETTINGS_NOT_FOUND", "userSettingsNotFound", "User settings not found"))
	}
	return c.JSON(http.StatusOK, settings)
}

func handleUserSettingsPut(c echo.Context) error {
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
	out, err := supax.UpsertUserSettings(c.Request().Context(), uid, body)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_UPDATE_SETTINGS", "failedUpdateUserSettings", "Failed to update user settings"))
	}
	return c.JSON(http.StatusOK, out)
}

func registerUserProfileRoutes(g *echo.Group) {
	g.GET("/me", handleUserProfileGet)
}

func handleUserProfileGet(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	if clerkID == "" {
		return httpx.SendError(c, 401, "Unauthorized",
			httpx.UM("USER_ID_NOT_IN_TOKEN", "userIdNotInToken", "User ID not found in authentication token"))
	}
	profile, err := supax.GetUserProfileAggregate(c.Request().Context(), clerkID)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_PROFILE", "failedFetchUserProfile", "Failed to fetch user profile"))
	}
	if profile == nil {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	return c.JSON(http.StatusOK, profile)
}

func handleStreakHistory(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("STREAK_LIMIT_RANGE", "limitBetween1And100", "Limit must be between 1 and 100"))
	}
	offset, _ := strconv.Atoi(c.QueryParam("offset"))
	if offset < 0 {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("STREAK_OFFSET_NONNEG", "offsetNonNegative", "Offset must be a non-negative number"))
	}
	rows, count, err := supax.GetUserStreakDays(c.Request().Context(), uid, limit, offset)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_STREAK_HISTORY", "failedFetchStreakHistory", "Failed to fetch user streak history"))
	}
	if rows == nil {
		rows = []supax.UserStreakDayRow{}
	}
	out := make([]map[string]any, 0, len(rows))
	for _, r := range rows {
		out = append(out, map[string]any{
			"id":               r.ID,
			"userId":           r.UserID,
			"date":             r.Date,
			"totalCallSeconds": r.TotalCallSeconds,
			"isValid":          r.IsValid,
			"createdAt":        r.CreatedAt,
		})
	}
	return c.JSON(http.StatusOK, map[string]any{"data": out, "count": count})
}

func handleStreakCalendar(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	year, _ := strconv.Atoi(c.QueryParam("year"))
	month, _ := strconv.Atoi(c.QueryParam("month"))
	if year == 0 {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("YEAR_QUERY_REQUIRED", "yearQueryRequired", "Year query parameter is required and must be a number"))
	}
	if month == 0 {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("MONTH_QUERY_REQUIRED", "monthQueryRequired", "Month query parameter is required and must be a number"))
	}
	if month < 1 || month > 12 {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("MONTH_RANGE", "monthBetween1And12", "Month must be between 1 and 12"))
	}
	rows, err := supax.GetUserStreakDaysByMonth(c.Request().Context(), uid, year, month)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_STREAK_CAL", "failedFetchStreakCalendar", "Failed to fetch user streak calendar"))
	}
	tz, _ := supax.GetUserTimezone(c.Request().Context(), uid)
	if tz == "" {
		tz = "UTC"
	}
	loc, err := time.LoadLocation(tz)
	if err != nil {
		loc = time.UTC
	}
	todayStr := time.Now().In(loc).Format("2006-01-02")
	out := make([]map[string]any, 0, len(rows))
	for _, r := range rows {
		out = append(out, map[string]any{
			"date":             r.Date,
			"isValid":          r.IsValid,
			"totalCallSeconds": r.TotalCallSeconds,
			"isToday":          r.Date == todayStr,
		})
	}
	return c.JSON(http.StatusOK, out)
}

func registerReportsRoutes(g *echo.Group) {
	g.GET("", handleListReports)
	g.POST("", handleCreateReport)
}

func handleListReports(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit <= 0 {
		limit = 20
	}
	offset, _ := strconv.Atoi(c.QueryParam("offset"))
	rows, count, err := supax.ListReports(c.Request().Context(), uid, limit, offset)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_REPORTS", "failedFetchReports", "Failed to fetch reports"))
	}
	if rows == nil {
		rows = []supax.ReportRow{}
	}
	return c.JSON(http.StatusOK, map[string]any{"data": rows, "count": count})
}

func handleCreateReport(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		ReportedUserID string         `json:"reported_user_id"`
		Reason         string         `json:"reason"`
		Description    string         `json:"description"`
		Metadata       map[string]any `json:"metadata"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if input.ReportedUserID == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("REPORT_TARGET_REQUIRED", "reportTargetRequired", "reported_user_id is required"))
	}
	if input.Reason == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("REPORT_REASON_REQUIRED", "reportReasonRequired", "reason is required"))
	}
	if input.ReportedUserID == uid {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UMDetail("REPORT_SELF", "Cannot report yourself"))
	}
	body := map[string]any{
		"reporter_user_id": uid,
		"reported_user_id": input.ReportedUserID,
		"reason":           input.Reason,
		"status":           "pending",
	}
	row, err := supax.CreateReport(c.Request().Context(), body)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_CREATE_REPORT", "failedCreateReport", "Failed to create report"))
	}
	if row != nil && input.Metadata != nil {
		_ = supax.CreateReportContext(c.Request().Context(), row.ID, input.Metadata)
	}
	if row != nil {
		go report.OnReportCreated(context.Background(), row.ID)
	}
	return c.JSON(http.StatusCreated, row)
}

func registerFavoritesRoutes(g *echo.Group) {
	g.GET("", handleListFavorites)
	g.POST("", handleCreateFavorite)
	g.DELETE("/:favorite_user_id", handleDeleteFavorite)
}

func handleListFavorites(c echo.Context) error {
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
	rows, err := supax.GetFavoritesWithStats(c.Request().Context(), uid)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_FAVORITES", "failedFetchFavorites", "Failed to fetch favorites"))
	}
	if rows == nil {
		rows = []supax.FavoriteWithStatsRow{}
	}
	return c.JSON(http.StatusOK, map[string]any{
		"data":  rows,
		"count": len(rows),
	})
}

func handleCreateFavorite(c echo.Context) error {
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
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		FavoriteUserID string `json:"favorite_user_id"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if input.FavoriteUserID == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("FAVORITE_USER_ID_REQUIRED", "favoriteUserIdRequired", "favorite_user_id is required"))
	}
	if input.FavoriteUserID == uid {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("CANNOT_FAVORITE_SELF", "cannotFavoriteYourself", "Cannot favorite yourself"))
	}

	limitCheck, err := supax.CheckDailyFavoriteLimitReached(c.Request().Context(), uid)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_ADD_FAVORITE", "failedAddFavorite", "Failed to add favorite"))
	}
	if limitCheck.Reached {
		return httpx.SendErrorExtra(c, 429, "Too Many Requests",
			httpx.UM("DAILY_FAVORITE_LIMIT", "dailyFavoriteLimitReached", "Daily favorite limit reached"),
			map[string]interface{}{"current": limitCheck.Current, "limit": limitCheck.Limit})
	}

	exists, err := supax.CheckFavoriteExists(c.Request().Context(), uid, input.FavoriteUserID)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_ADD_FAVORITE", "failedAddFavorite", "Failed to add favorite"))
	}
	if exists {
		return httpx.SendError(c, 409, "Conflict",
			httpx.UM("ALREADY_IN_FAVORITES", "alreadyInFavorites", "User is already in favorites"))
	}

	row, err := supax.CreateFavorite(c.Request().Context(), uid, input.FavoriteUserID)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_ADD_FAVORITE", "failedAddFavorite", "Failed to add favorite"))
	}
	if err := supax.IncrementFavoriteLimit(c.Request().Context(), uid); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_ADD_FAVORITE", "failedAddFavorite", "Failed to add favorite"))
	}
	return httpx.SendUserMessage(c, http.StatusCreated, map[string]interface{}{"data": row},
		httpx.UM("USER_ADDED_FAVORITES", "userAddedToFavorites", "User added to favorites"))
}

func handleDeleteFavorite(c echo.Context) error {
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
	target := c.Param("favorite_user_id")
	if target == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("FAVORITE_USER_ID_REQUIRED", "favoriteUserIdRequired", "favorite_user_id is required"))
	}

	exists, err := supax.CheckFavoriteExists(c.Request().Context(), uid, target)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_REMOVE_FAVORITE", "failedRemoveFavorite", "Failed to remove favorite"))
	}
	if !exists {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("FAVORITE_NOT_FOUND", "favoriteNotFound", "Favorite not found"))
	}

	createdAt, _ := supax.GetFavoriteCreationDate(c.Request().Context(), uid, target)
	today := time.Now().UTC().Format("2006-01-02")
	createdDate := ""
	if createdAt != "" {
		if idx := strings.Index(createdAt, "T"); idx > 0 {
			createdDate = createdAt[:idx]
		} else {
			createdDate = createdAt
		}
	}
	isSameDay := createdDate != "" && createdDate == today

	if err := supax.DeleteFavorite(c.Request().Context(), uid, target); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_REMOVE_FAVORITE", "failedRemoveFavorite", "Failed to remove favorite"))
	}

	if isSameDay {
		_ = supax.DecrementFavoriteLimit(c.Request().Context(), uid)
	}

	return httpx.SendUserMessage(c, http.StatusOK, map[string]interface{}{"refunded": isSameDay},
		httpx.UM("FAVORITE_REMOVED", "favoriteRemovedSuccess", "Favorite removed successfully"))
}

func handleCreateCallHistory(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		CallerID        string `json:"caller_id"`
		CalleeID        string `json:"callee_id"`
		StartedAt       string `json:"started_at"`
		EndedAt         string `json:"ended_at"`
		DurationSeconds *int   `json:"duration_seconds"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if input.CallerID == "" || input.CalleeID == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("CALLER_CALLEE_REQUIRED", "callerCalleeRequired", "caller_id and callee_id are required"))
	}
	if input.CallerID != uid && input.CalleeID != uid {
		return httpx.SendError(c, 403, "Forbidden",
			httpx.UM("CALL_HISTORY_SELF_ONLY", "callHistorySelfOnly", "You can only create call history records for yourself"))
	}
	startedAt := time.Now()
	if input.StartedAt != "" {
		if t, err := time.Parse(time.RFC3339, input.StartedAt); err == nil {
			startedAt = t
		}
	}
	var endedAt *time.Time
	if input.EndedAt != "" {
		if t, err := time.Parse(time.RFC3339, input.EndedAt); err == nil {
			endedAt = &t
		}
	}
	callerCountry, _ := supax.GetUserCountry(c.Request().Context(), input.CallerID)
	calleeCountry, _ := supax.GetUserCountry(c.Request().Context(), input.CalleeID)
	row, err := supax.CreateCallHistory(c.Request().Context(), supax.CreateCallHistoryParams{
		CallerID:        input.CallerID,
		CalleeID:        input.CalleeID,
		CallerCountry:   callerCountry,
		CalleeCountry:   calleeCountry,
		StartedAt:       startedAt,
		EndedAt:         endedAt,
		DurationSeconds: input.DurationSeconds,
	})
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_CREATE_CALL_HISTORY", "failedCreateCallHistory", "Failed to create call history"))
	}
	return c.JSON(http.StatusCreated, row)
}

func nullable(s string) any {
	if s == "" {
		return nil
	}
	return s
}
