package routes

import (
	"errors"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/app/report"
	"linky-api/src/internal/app/user"
	"linky-api/src/internal/httpx"
)

func sendUserStatusError(c echo.Context, err error) error {
	var se *user.StatusError
	if errors.As(err, &se) {
		if se.DetailOnly {
			return httpx.SendError(c, se.Status, httpStatusText(se.Status),
				httpx.UMDetail(se.Code, se.Detail))
		}
		return httpx.SendError(c, se.Status, httpStatusText(se.Status),
			httpx.UM(se.Code, se.KeySuffix, se.Fallback))
	}
	var fle *user.FavoriteLimitError
	if errors.As(err, &fle) {
		return httpx.SendErrorExtra(c, 429, "Too Many Requests",
			httpx.UM("DAILY_FAVORITE_LIMIT", "dailyFavoriteLimitReached", "Daily favorite limit reached"),
			map[string]interface{}{"current": fle.Current, "limit": fle.Limit})
	}
	return err
}

func sendReportStatusError(c echo.Context, err error) error {
	var se *report.StatusError
	if errors.As(err, &se) {
		if se.DetailOnly {
			return httpx.SendError(c, se.Status, httpStatusText(se.Status),
				httpx.UMDetail(se.Code, se.Detail))
		}
		return httpx.SendError(c, se.Status, httpStatusText(se.Status),
			httpx.UM(se.Code, se.KeySuffix, se.Fallback))
	}
	return err
}

func httpStatusText(status int) string {
	switch status {
	case 400:
		return "Bad Request"
	case 401:
		return "Unauthorized"
	case 404:
		return "Not Found"
	case 409:
		return "Conflict"
	case 429:
		return "Too Many Requests"
	case 500:
		return "Internal Server Error"
	default:
		return "Error"
	}
}
