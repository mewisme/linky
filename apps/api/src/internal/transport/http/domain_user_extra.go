package routes

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/app/favorite"
	reportapp "linky-api/src/internal/app/report"
	"linky-api/src/internal/app/user"
	"linky-api/src/internal/app/videochat"
	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/supax"
)

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
	details, err := user.UpsertDetails(c.Request().Context(), uid, body)
	if err != nil {
		var ve *user.DetailsValidationError
		if errors.As(err, &ve) {
			return httpx.SendError(c, 400, "Bad Request", httpx.UMDetail(ve.Code, ve.Message))
		}
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_UPDATE_DETAILS_PUT", "failedUpdateUserDetails", "Failed to update user details"))
	}
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
	details, err := user.ClearInterestTags(c.Request().Context(), uid)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_CLEAR_TAGS", "failedClearInterestTags", "Failed to clear interest tags"))
	}
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
	details, err := user.MutateInterestTags(c.Request().Context(), uid, mode, input.TagIDs)
	if err != nil {
		if errors.Is(err, user.ErrTagIDsNonEmpty) {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UM("TAG_IDS_NON_EMPTY", "tagIdsNonEmpty", "tagIds must be a non-empty array"))
		}
		if errors.Is(err, user.ErrTagIDsArray) {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UM("TAG_IDS_ARRAY", "tagIdsArray", "tagIds must be an array"))
		}
		var ve *user.DetailsValidationError
		if errors.As(err, &ve) {
			return httpx.SendError(c, 400, "Bad Request", httpx.UMDetail(ve.Code, ve.Message))
		}
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_TAGS_MUTATE", "failedMutateInterestTags", "Failed to mutate interest tags"))
	}
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
	offset, _ := strconv.Atoi(c.QueryParam("offset"))
	out, err := user.StreakHistory(c.Request().Context(), uid, limit, offset)
	if err != nil {
		if errors.Is(err, user.ErrStreakLimitRange) {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UM("STREAK_LIMIT_RANGE", "limitBetween1And100", "Limit must be between 1 and 100"))
		}
		if errors.Is(err, user.ErrStreakOffsetNonNeg) {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UM("STREAK_OFFSET_NONNEG", "offsetNonNegative", "Offset must be a non-negative number"))
		}
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_STREAK_HISTORY", "failedFetchStreakHistory", "Failed to fetch user streak history"))
	}
	return c.JSON(http.StatusOK, out)
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
	out, err := user.StreakCalendar(c.Request().Context(), uid, year, month)
	if err != nil {
		if errors.Is(err, user.ErrYearRequired) {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UM("YEAR_QUERY_REQUIRED", "yearQueryRequired", "Year query parameter is required and must be a number"))
		}
		if errors.Is(err, user.ErrMonthRequired) {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UM("MONTH_QUERY_REQUIRED", "monthQueryRequired", "Month query parameter is required and must be a number"))
		}
		if errors.Is(err, user.ErrMonthRange) {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UM("MONTH_RANGE", "monthBetween1And12", "Month must be between 1 and 12"))
		}
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_STREAK_CAL", "failedFetchStreakCalendar", "Failed to fetch user streak calendar"))
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
	row, err := reportapp.Create(c.Request().Context(), uid, reportapp.CreateInput{
		ReportedUserID: input.ReportedUserID,
		Reason:         input.Reason,
		Description:    input.Description,
		Metadata:       input.Metadata,
	})
	if err != nil {
		if errors.Is(err, reportapp.ErrReportTargetRequired) {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UM("REPORT_TARGET_REQUIRED", "reportTargetRequired", "reported_user_id is required"))
		}
		if errors.Is(err, reportapp.ErrReportReasonRequired) {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UM("REPORT_REASON_REQUIRED", "reportReasonRequired", "reason is required"))
		}
		if errors.Is(err, reportapp.ErrReportSelf) {
			return httpx.SendError(c, 400, "Bad Request", httpx.UMDetail("REPORT_SELF", "Cannot report yourself"))
		}
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_CREATE_REPORT", "failedCreateReport", "Failed to create report"))
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
	out, err := favorite.ListWithStats(c.Request().Context(), uid)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_FAVORITES", "failedFetchFavorites", "Failed to fetch favorites"))
	}
	return c.JSON(http.StatusOK, out)
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
	row, err := favorite.Add(c.Request().Context(), uid, input.FavoriteUserID)
	if err != nil {
		var limitErr *favorite.DailyLimitError
		if errors.As(err, &limitErr) {
			return httpx.SendErrorExtra(c, 429, "Too Many Requests",
				httpx.UM("DAILY_FAVORITE_LIMIT", "dailyFavoriteLimitReached", "Daily favorite limit reached"),
				map[string]interface{}{"current": limitErr.Current, "limit": limitErr.Limit})
		}
		if errors.Is(err, favorite.ErrFavoriteUserIDReq) {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UM("FAVORITE_USER_ID_REQUIRED", "favoriteUserIdRequired", "favorite_user_id is required"))
		}
		if errors.Is(err, favorite.ErrSelfFavorite) {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UM("CANNOT_FAVORITE_SELF", "cannotFavoriteYourself", "Cannot favorite yourself"))
		}
		if errors.Is(err, favorite.ErrAlreadyExists) {
			return httpx.SendError(c, 409, "Conflict",
				httpx.UM("ALREADY_IN_FAVORITES", "alreadyInFavorites", "User is already in favorites"))
		}
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
	refunded, err := favorite.Remove(c.Request().Context(), uid, target)
	if err != nil {
		if errors.Is(err, favorite.ErrFavoriteUserIDReq) {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UM("FAVORITE_USER_ID_REQUIRED", "favoriteUserIdRequired", "favorite_user_id is required"))
		}
		if errors.Is(err, favorite.ErrNotFound) {
			return httpx.SendError(c, 404, "Not Found",
				httpx.UM("FAVORITE_NOT_FOUND", "favoriteNotFound", "Favorite not found"))
		}
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_REMOVE_FAVORITE", "failedRemoveFavorite", "Failed to remove favorite"))
	}
	return httpx.SendUserMessage(c, http.StatusOK, map[string]interface{}{"refunded": refunded},
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
	row, err := videochat.CreateCallHistory(c.Request().Context(), uid, videochat.CreateCallHistoryInput{
		CallerID:        input.CallerID,
		CalleeID:        input.CalleeID,
		StartedAt:       input.StartedAt,
		EndedAt:         input.EndedAt,
		DurationSeconds: input.DurationSeconds,
	})
	if err != nil {
		if errors.Is(err, videochat.ErrCallerCalleeRequired) {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UM("CALLER_CALLEE_REQUIRED", "callerCalleeRequired", "caller_id and callee_id are required"))
		}
		if errors.Is(err, videochat.ErrCallHistorySelfOnly) {
			return httpx.SendError(c, 403, "Forbidden",
				httpx.UM("CALL_HISTORY_SELF_ONLY", "callHistorySelfOnly", "You can only create call history records for yourself"))
		}
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
