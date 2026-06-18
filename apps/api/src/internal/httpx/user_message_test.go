package httpx

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestUserMessageConstructors(t *testing.T) {
	t.Parallel()
	msg := UMValues("CODE", "thingFailed", "Thing failed", map[string]interface{}{"id": "123"})
	if msg.Code != "CODE" || msg.I18n == nil || msg.I18n.Key != "api.thingFailed" {
		t.Fatalf("unexpected message: %+v", msg)
	}
	if msg.FallbackMessage == nil || *msg.FallbackMessage != "Thing failed" {
		t.Fatalf("unexpected fallback: %+v", msg.FallbackMessage)
	}
	if msg.I18n.Values["id"] != "123" {
		t.Fatalf("unexpected values: %+v", msg.I18n.Values)
	}

	detail := UMDetail("DETAIL", "bad input")
	if detail.I18n == nil || detail.I18n.Key != "api.errorDetail" || detail.I18n.Values["detail"] != "bad input" {
		t.Fatalf("unexpected detail message: %+v", detail)
	}
}

func TestSendErrorExtraDoesNotOverrideReservedFields(t *testing.T) {
	t.Parallel()
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := SendErrorExtra(c, http.StatusBadRequest, "Bad Request", UM("BAD", "bad", "fallback"), map[string]interface{}{
		"message": "override",
		"traceId": "trace-1",
	})
	if err != nil {
		t.Fatal(err)
	}
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["message"] != "fallback" {
		t.Fatalf("message = %v, want fallback", body["message"])
	}
	if body["traceId"] != "trace-1" {
		t.Fatalf("traceId = %v, want trace-1", body["traceId"])
	}
}

func TestContextAccessors(t *testing.T) {
	t.Parallel()
	e := echo.New()
	c := e.NewContext(httptest.NewRequest(http.MethodGet, "/", nil), httptest.NewRecorder())
	if MustClerkUserID(c) != "" || GetRequestID(c) != "" || GetClientIP(c) != "" {
		t.Fatal("empty context should return empty values")
	}
	SetAuth(c, &AuthClaims{Sub: "user_123"})
	SetRequestID(c, "req_123")
	SetClientIP(c, "127.0.0.1")
	if MustClerkUserID(c) != "user_123" {
		t.Fatalf("MustClerkUserID = %q", MustClerkUserID(c))
	}
	if GetRequestID(c) != "req_123" || GetClientIP(c) != "127.0.0.1" {
		t.Fatalf("request context = %q %q", GetRequestID(c), GetClientIP(c))
	}
}
