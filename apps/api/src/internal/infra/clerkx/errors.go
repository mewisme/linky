package clerkx

import (
	"github.com/clerk/clerk-sdk-go/v2"
)

func ClerkAPIHTTPStatus(err error) int {
	apiErr, ok := err.(*clerk.APIErrorResponse)
	if !ok || apiErr.HTTPStatusCode == 0 {
		return 0
	}
	return apiErr.HTTPStatusCode
}

func ClerkAPIErrorMessage(err error) string {
	apiErr, ok := err.(*clerk.APIErrorResponse)
	if !ok {
		return ""
	}
	if len(apiErr.Errors) > 0 && apiErr.Errors[0].Message != "" {
		return apiErr.Errors[0].Message
	}
	return apiErr.Error()
}
