package httpx

import (
	"github.com/labstack/echo/v4"
)

type AuthClaims struct {
	Sub string
	Raw map[string]interface{}
}

const (
	ctxAuthKey      = "linky.auth"
	ctxRequestIDKey = "linky.requestId"
	ctxClientIPKey  = "linky.clientIp"
)

func SetAuth(c echo.Context, claims *AuthClaims) {
	c.Set(ctxAuthKey, claims)
}

func GetAuth(c echo.Context) *AuthClaims {
	v, ok := c.Get(ctxAuthKey).(*AuthClaims)
	if !ok {
		return nil
	}
	return v
}

func MustClerkUserID(c echo.Context) string {
	a := GetAuth(c)
	if a == nil {
		return ""
	}
	return a.Sub
}

func RequireClerkUser(c echo.Context) (string, error) {
	clerkID := MustClerkUserID(c)
	if clerkID == "" {
		return "", SendError(c, 401, "Unauthorized",
			UM("USER_ID_NOT_IN_TOKEN", "userIdNotInToken", "User ID not found in authentication token"))
	}
	return clerkID, nil
}

func SetRequestID(c echo.Context, id string) {
	c.Set(ctxRequestIDKey, id)
}

func GetRequestID(c echo.Context) string {
	v, _ := c.Get(ctxRequestIDKey).(string)
	return v
}

func SetClientIP(c echo.Context, ip string) {
	c.Set(ctxClientIPKey, ip)
}

func GetClientIP(c echo.Context) string {
	v, _ := c.Get(ctxClientIPKey).(string)
	return v
}
