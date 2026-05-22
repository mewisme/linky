package codec

import (
	"encoding/json"
	"fmt"
	"regexp"
	"time"

	"github.com/supabase-community/postgrest-go"
)

var DateRegex = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)

var OrderDesc = &postgrest.OrderOpts{Ascending: false}
var OrderAsc = &postgrest.OrderOpts{Ascending: true}

func DecodeOne[T any](raw []byte) (*T, error) {
	if len(raw) == 0 {
		return nil, nil
	}
	var arr []T
	if err := json.Unmarshal(raw, &arr); err == nil {
		if len(arr) == 0 {
			return nil, nil
		}
		v := arr[0]
		return &v, nil
	}
	var single T
	if err := json.Unmarshal(raw, &single); err != nil {
		return nil, err
	}
	return &single, nil
}

func DecodeMany[T any](raw []byte) ([]T, error) {
	if len(raw) == 0 {
		return nil, nil
	}
	var arr []T
	if err := json.Unmarshal(raw, &arr); err != nil {
		return nil, err
	}
	return arr, nil
}

func MonthStart(year, month int) string {
	return fmt.Sprintf("%04d-%02d-01", year, month)
}

func MonthEnd(year, month int) string {
	t := time.Date(year, time.Month(month)+1, 1, 0, 0, 0, 0, time.UTC).AddDate(0, 0, -1)
	return t.Format("2006-01-02")
}
