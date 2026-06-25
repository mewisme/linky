package user

import "errors"

var ErrNotFound = errors.New("user: not found")

type StatusError struct {
	Status     int
	Code       string
	KeySuffix  string
	Fallback   string
	Detail     string
	DetailOnly bool
}

func (e *StatusError) Error() string {
	if e.Detail != "" {
		return e.Detail
	}
	return e.Fallback
}

func statusErr(status int, code, keySuffix, fallback string) *StatusError {
	return &StatusError{Status: status, Code: code, KeySuffix: keySuffix, Fallback: fallback}
}

func detailErr(code, detail string) *StatusError {
	return &StatusError{Status: 400, Code: code, Detail: detail, DetailOnly: true}
}
