package gqlx

import "encoding/json"

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

func IntDefault(v *int, def int) int {
	if v == nil || *v <= 0 {
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
