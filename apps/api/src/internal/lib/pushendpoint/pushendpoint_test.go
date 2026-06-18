package pushendpoint

import "testing"

func TestIsAllowed(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name     string
		endpoint string
		want     bool
	}{
		{"empty", "", false},
		{"requires https", "http://fcm.googleapis.com/send/1", false},
		{"fcm", "https://fcm.googleapis.com/fcm/send/abc", true},
		{"mozilla", "https://updates.push.services.mozilla.com/wpush/v2/abc", true},
		{"apple", "https://web.push.apple.com/Q/abc", true},
		{"windows notify", "https://db5.notify.windows.com/?token=abc", true},
		{"unknown", "https://example.com/push", false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := IsAllowed(tc.endpoint); got != tc.want {
				t.Fatalf("IsAllowed(%q) = %v, want %v", tc.endpoint, got, tc.want)
			}
		})
	}
}
