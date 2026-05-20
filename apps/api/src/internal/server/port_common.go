package server

import (
	"errors"
	"net"
	"strings"
	"syscall"
)

func isAddrInUse(err error) bool {
	if err == nil {
		return false
	}
	var opErr *net.OpError
	if errors.As(err, &opErr) {
		var errno syscall.Errno
		if errors.As(opErr.Err, &errno) {
			return errno == syscall.EADDRINUSE
		}
	}
	return strings.Contains(strings.ToLower(err.Error()), "address already in use")
}
