package clerkadmin

import (
	"errors"

	"linky-api/src/internal/infra/clerkapi"
	"linky-api/src/internal/infra/clerkx"
)

var (
	ErrForbidden     = errors.New("clerkadmin: admin or superadmin role required")
	ErrActorRequired = errors.New("clerkadmin: authenticated clerk user id required")
)

func HTTPStatus(err error) int {
	if s := clerkapi.HTTPStatus(err); s != 0 {
		return s
	}
	return clerkx.ClerkAPIHTTPStatus(err)
}

func ErrorMessage(err error) string {
	if msg := clerkapi.ErrorMessage(err); msg != "" {
		return msg
	}
	return clerkx.ClerkAPIErrorMessage(err)
}

func IsNotConfigured(err error) bool {
	return errors.Is(err, clerkx.ErrNotConfigured) || errors.Is(err, clerkapi.ErrNotConfigured)
}
