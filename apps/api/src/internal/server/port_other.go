//go:build !linux

package server

import "net"

func listenTCP(addr string, reclaim bool) (net.Listener, error) {
	return net.Listen("tcp", addr)
}
