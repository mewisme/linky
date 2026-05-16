package api

import (
	"crypto/sha256"
	"fmt"
)

func SHA256Hex(input string) string {
	h := sha256.Sum256([]byte(input))
	return fmt.Sprintf("%x", h)
}
