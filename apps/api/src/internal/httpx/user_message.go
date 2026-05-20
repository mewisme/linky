package httpx

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

type I18nPayload struct {
	Key    string                 `json:"key"`
	Values map[string]interface{} `json:"values,omitempty"`
}

type UserMessage struct {
	Code            string       `json:"code"`
	I18n            *I18nPayload `json:"i18n,omitempty"`
	FallbackMessage *string      `json:"fallbackMessage,omitempty"`
}

func ToUserMessage(code string, i18n *I18nPayload, fallback *string) UserMessage {
	return UserMessage{Code: code, I18n: i18n, FallbackMessage: fallback}
}

func ToUserMessageFallbackOnly(code, fallback string) UserMessage {
	f := fallback
	return UserMessage{Code: code, FallbackMessage: &f}
}

func UM(code, keySuffix, fallback string) UserMessage {
	key := "api." + keySuffix
	return UserMessage{
		Code:            code,
		I18n:            &I18nPayload{Key: key},
		FallbackMessage: &fallback,
	}
}

func UMValues(code, keySuffix, fallback string, values map[string]interface{}) UserMessage {
	key := "api." + keySuffix
	return UserMessage{
		Code:            code,
		I18n:            &I18nPayload{Key: key, Values: values},
		FallbackMessage: &fallback,
	}
}

func UMDetail(code, detail string) UserMessage {
	return UMValues(code, "errorDetail", detail, map[string]interface{}{"detail": detail})
}

type errorBody struct {
	Error       string                 `json:"error"`
	Message     string                 `json:"message"`
	UserMessage UserMessage            `json:"userMessage"`
	Extra       map[string]interface{} `json:"-"`
}

func userFacing(um UserMessage) (string, UserMessage) {
	msg := ""
	if um.FallbackMessage != nil {
		msg = *um.FallbackMessage
	}
	return msg, um
}

func SendError(c echo.Context, status int, errorTag string, um UserMessage) error {
	msg, u := userFacing(um)
	return c.JSON(status, map[string]interface{}{
		"error":       errorTag,
		"message":     msg,
		"userMessage": u,
	})
}

func SendErrorExtra(c echo.Context, status int, errorTag string, um UserMessage, extra map[string]interface{}) error {
	msg, u := userFacing(um)
	body := map[string]interface{}{
		"error":       errorTag,
		"message":     msg,
		"userMessage": u,
	}
	for k, v := range extra {
		if _, exists := body[k]; !exists {
			body[k] = v
		}
	}
	return c.JSON(status, body)
}

func SendUserMessage(c echo.Context, status int, body map[string]interface{}, um UserMessage) error {
	msg, u := userFacing(um)
	if body == nil {
		body = map[string]interface{}{}
	}
	body["message"] = msg
	body["userMessage"] = u
	return c.JSON(status, body)
}

func NotFound(c echo.Context) error {
	return SendError(c, http.StatusNotFound, "Route not found",
		UM("ROUTE_NOT_FOUND", "routeNotFound", "Route not found"))
}

func Unauthorized(c echo.Context) error {
	return SendError(c, http.StatusUnauthorized, "Unauthorized",
		UM("UNAUTHORIZED", "unauthorized", "Unauthorized"))
}

func Forbidden(c echo.Context) error {
	return SendError(c, http.StatusForbidden, "Forbidden",
		UM("FORBIDDEN_ADMIN", "adminAccessRequired", "Admin access required"))
}

func Internal(c echo.Context, detail string) error {
	return SendError(c, http.StatusInternalServerError, "An unexpected error occurred",
		UMDetail("UNEXPECTED_SERVER", detail))
}
