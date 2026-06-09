package plaintext

import (
	"regexp"
	"strings"
)

var (
	htmlTagRe      = regexp.MustCompile(`<[^>]*>`)
	dangerousURIRe = regexp.MustCompile(`(?i)javascript:|data:text/html|on\w+\s*=`)
)

func ContainsDangerousMarkup(s string) bool {
	if strings.ContainsAny(s, "<>") {
		return true
	}
	if htmlTagRe.MatchString(s) {
		return true
	}
	if dangerousURIRe.MatchString(s) {
		return true
	}
	if strings.Contains(s, "\x00") {
		return true
	}
	return false
}

func SanitizePlainText(s string, allowNewlines bool) string {
	s = htmlTagRe.ReplaceAllString(s, "")
	s = strings.ReplaceAll(s, "<", "")
	s = strings.ReplaceAll(s, ">", "")
	s = strings.ReplaceAll(s, "\x00", "")
	if !allowNewlines {
		s = strings.ReplaceAll(s, "\r\n", " ")
		s = strings.ReplaceAll(s, "\n", " ")
		s = strings.ReplaceAll(s, "\r", " ")
	}
	return strings.TrimSpace(s)
}
