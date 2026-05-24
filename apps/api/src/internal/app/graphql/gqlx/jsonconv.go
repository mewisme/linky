package gqlx

import (
	"encoding/json"
	"errors"

	"linky-api/src/internal/app/user"
)

func ToAny(v any) (any, error) {
	if v == nil {
		return nil, nil
	}
	switch x := v.(type) {
	case map[string]any:
		return x, nil
	case []map[string]any:
		return x, nil
	}
	b, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}
	var out any
	if err := json.Unmarshal(b, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func ToMap(v any) (map[string]any, error) {
	if v == nil {
		return map[string]any{}, nil
	}
	if m, ok := v.(map[string]any); ok {
		return m, nil
	}
	b, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}
	var out map[string]any
	if err := json.Unmarshal(b, &out); err != nil {
		return nil, err
	}
	if out == nil {
		out = map[string]any{}
	}
	return out, nil
}

func ToMetadataMap(v any) (map[string]any, error) {
	if v == nil {
		return nil, nil
	}
	return ToMap(v)
}

func IntDefault(v *int, def int) int {
	if v == nil || *v <= 0 {
		return def
	}
	return *v
}

func FloatDefault(v *float64, def float64) float64 {
	if v == nil {
		return def
	}
	return *v
}

func StrPtr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func BoolPtr(v bool) *bool {
	return &v
}

func MapDetailsValidation(err error) error {
	var ve *user.DetailsValidationError
	if errors.As(err, &ve) {
		return ErrBadRequest(ve.Code, ve.Key, ve.Message)
	}
	return AsGraphQLError(err)
}
