package corsorigin

import (
	"net/url"
	"regexp"
	"strings"
)

func NormalizeList(entries []string) []string {
	out := make([]string, 0, len(entries)*2)
	for _, e := range entries {
		out = append(out, NormalizeEntry(e)...)
	}
	return out
}

func NormalizeEntry(entry string) []string {
	entry = strings.TrimSpace(entry)
	if entry == "" {
		return nil
	}
	if entry == "*" {
		return []string{"*"}
	}
	if strings.Contains(entry, "://") {
		return []string{entry}
	}
	if strings.HasPrefix(entry, "*.") {
		host := entry[2:]
		return []string{
			"http://*." + host,
			"https://*." + host,
		}
	}
	return []string{"http://" + entry, "https://" + entry}
}

func Match(origin string, rules []string) bool {
	origin = strings.TrimSpace(origin)
	if origin == "" {
		return false
	}
	for _, rule := range rules {
		rule = strings.TrimSpace(rule)
		if rule == "" {
			continue
		}
		if rule == "*" {
			return true
		}
		if rule == origin {
			return true
		}
		if strings.Contains(rule, "://") && strings.Contains(rule, "*") {
			if matchOriginPattern(origin, rule) {
				return true
			}
		}
	}
	return false
}

func SocketIOOrigin(rules []string) any {
	if len(rules) == 0 {
		return "*"
	}
	if len(rules) == 1 && rules[0] == "*" {
		return "*"
	}
	parts := make([]string, 0, len(rules))
	for _, rule := range rules {
		if rule == "*" {
			return "*"
		}
		parts = append(parts, originPatternToRegex(rule))
	}
	return regexp.MustCompile(strings.Join(parts, "|"))
}

func matchOriginPattern(origin, pattern string) bool {
	if !matchScheme(origin, pattern) {
		return false
	}
	didx := strings.Index(origin, "://")
	pidx := strings.Index(pattern, "://")
	if didx == -1 || pidx == -1 {
		return false
	}
	domAuth := origin[didx+3:]
	if len(domAuth) > 253 {
		return false
	}
	patAuth := pattern[pidx+3:]

	domComp := strings.Split(domAuth, ".")
	patComp := strings.Split(patAuth, ".")
	for i := len(domComp)/2 - 1; i >= 0; i-- {
		opp := len(domComp) - 1 - i
		domComp[i], domComp[opp] = domComp[opp], domComp[i]
	}
	for i := len(patComp)/2 - 1; i >= 0; i-- {
		opp := len(patComp) - 1 - i
		patComp[i], patComp[opp] = patComp[opp], patComp[i]
	}

	for i, v := range domComp {
		if len(patComp) <= i {
			return false
		}
		p := patComp[i]
		if p == "*" {
			return true
		}
		if p != v {
			return false
		}
	}
	return false
}

func matchScheme(domain, pattern string) bool {
	didx := strings.Index(domain, ":")
	pidx := strings.Index(pattern, ":")
	return didx != -1 && pidx != -1 && domain[:didx] == pattern[:pidx]
}

func originPatternToRegex(pattern string) string {
	if strings.Contains(pattern, "://") {
		escaped := regexp.QuoteMeta(pattern)
		escaped = strings.ReplaceAll(escaped, "\\*", ".*")
		return "^" + escaped + "$"
	}
	u, err := url.Parse("https://" + pattern)
	if err != nil || u.Host == "" {
		return "^$"
	}
	host := regexp.QuoteMeta(u.Host)
	host = strings.ReplaceAll(host, "\\*", ".*")
	return "^https?://" + host + "(:\\d+)?$"
}
