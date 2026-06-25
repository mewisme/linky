package supax

import (
	"fmt"
	"time"
)

// Deprecated: use codec.MonthStart instead.
func monthStart(year, month int) string {
	return fmt.Sprintf("%04d-%02d-01", year, month)
}

// Deprecated: use codec.MonthEnd instead.
func monthEnd(year, month int) string {
	t := time.Date(year, time.Month(month)+1, 1, 0, 0, 0, 0, time.UTC).AddDate(0, 0, -1)
	return t.Format("2006-01-02")
}

func nowRFC3339() string { return time.Now().UTC().Format(time.RFC3339Nano) }

func NowRFC3339() string { return nowRFC3339() }
