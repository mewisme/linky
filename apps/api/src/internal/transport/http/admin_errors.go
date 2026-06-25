package routes

import (
	"errors"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/app/admin"
	"linky-api/src/internal/httpx"
)

func sendAdminStatusError(c echo.Context, err error) error {
	var se *admin.StatusError
	if errors.As(err, &se) {
		return httpx.SendError(c, se.Status, httpStatusText(se.Status),
			httpx.UM(se.Code, se.KeySuffix, se.Fallback))
	}
	return err
}
