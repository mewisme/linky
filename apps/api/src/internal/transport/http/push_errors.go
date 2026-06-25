package routes

import (
	"errors"

	"github.com/labstack/echo/v4"

	apppush "linky-api/src/internal/app/push"
	"linky-api/src/internal/httpx"
)

func sendPushStatusError(c echo.Context, err error) error {
	var se *apppush.StatusError
	if errors.As(err, &se) {
		return httpx.SendError(c, se.Status, httpStatusText(se.Status),
			httpx.UM(se.Code, se.KeySuffix, se.Fallback))
	}
	return err
}
