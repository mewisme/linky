package gqlx

import (
	"errors"

	"github.com/vektah/gqlparser/v2/gqlerror"
)

func ErrUnauthorized() error {
	return gqlErr("Unauthorized", "UNAUTHORIZED", "unauthorized", "Unauthorized", nil)
}

func ErrForbidden(code, key, message string) error {
	return gqlErr(message, code, key, message, nil)
}

func ErrNotFound(code, key, message string) error {
	return gqlErr(message, code, key, message, nil)
}

func ErrInternal(code, key, message string, cause error) error {
	return gqlErr(message, code, key, message, cause)
}

func AsGraphQLError(err error) error {
	if err == nil {
		return nil
	}
	var gqlErr *gqlerror.Error
	if errors.As(err, &gqlErr) {
		return err
	}
	return ErrInternal("INTERNAL_ERROR", "internalError", err.Error(), err)
}

func gqlErr(message, code, key, userMsg string, cause error) *gqlerror.Error {
	err := &gqlerror.Error{
		Message: message,
		Extensions: map[string]any{
			"code": code,
			"userMessage": map[string]any{
				"code":    code,
				"key":     key,
				"message": userMsg,
			},
		},
	}
	if cause != nil {
		err.Err = cause
	}
	return err
}
