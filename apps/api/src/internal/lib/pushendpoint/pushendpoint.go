package pushendpoint

import "strings"

var allowedHosts = []string{
	"fcm.googleapis.com",
	"updates.push.services.mozilla.com",
	"updates-autopush.stage.mozaws.net",
	"updates-autopush.dev.mozaws.net",
	"web.push.apple.com",
	"api.push.apple.com",
	"wns2-",
	".notify.windows.com",
	"push.services.mozilla.com",
}

func IsAllowed(endpoint string) bool {
	if endpoint == "" {
		return false
	}
	if !strings.HasPrefix(endpoint, "https://") {
		return false
	}
	for _, h := range allowedHosts {
		if strings.Contains(endpoint, h) {
			return true
		}
	}
	return false
}
