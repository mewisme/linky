package callservice

import "encoding/json"

func jsonUnmarshalArr(data []byte, v any) error {
	return json.Unmarshal(data, v)
}
