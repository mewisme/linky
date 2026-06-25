package jsonx

func AsString(v any) string {
	if v == nil {
		return ""
	}
	s, _ := v.(string)
	return s
}
