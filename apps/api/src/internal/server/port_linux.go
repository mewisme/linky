//go:build linux

package server

import (
	"bufio"
	"errors"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"
)

func listenTCP(addr string, reclaim bool) (net.Listener, error) {
	l, err := net.Listen("tcp", addr)
	if err == nil {
		return l, nil
	}
	if !reclaim || !isAddrInUse(err) {
		return nil, err
	}

	port, perr := portFromAddr(addr)
	if perr != nil {
		return nil, err
	}

	killed, kerr := killListenersOnPort(port, os.Getpid())
	if kerr != nil {
		serverLog.Warn().Err(kerr).Int("port", port).Msg("Failed to reclaim port")
		return nil, err
	}
	if !killed {
		return nil, err
	}

	serverLog.Warn().Int("port", port).Msg("Reclaimed port from stale process; retrying bind")
	time.Sleep(400 * time.Millisecond)
	return net.Listen("tcp", addr)
}

func killListenersOnPort(port, selfPID int) (bool, error) {
	inodes, err := listenInodesForPort(port)
	if err != nil {
		return false, err
	}
	if len(inodes) == 0 {
		return false, nil
	}

	pids, err := pidsForSocketInodes(inodes)
	if err != nil {
		return false, err
	}

	var killed bool
	for _, pid := range pids {
		if pid == selfPID {
			continue
		}
		if err := terminatePID(pid); err != nil {
			serverLog.Warn().Err(err).Int("pid", pid).Int("port", port).Msg("Failed to terminate stale listener")
			continue
		}
		killed = true
		serverLog.Warn().Int("pid", pid).Int("port", port).Msg("Terminated stale process holding port")
	}
	return killed, nil
}

func terminatePID(pid int) error {
	proc, err := os.FindProcess(pid)
	if err != nil {
		return err
	}
	if err := proc.Signal(syscall.SIGTERM); err != nil {
		return proc.Kill()
	}

	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if err := syscall.Kill(pid, 0); err != nil {
			return nil
		}
		time.Sleep(100 * time.Millisecond)
	}
	return proc.Kill()
}

func listenInodesForPort(port int) (map[string]struct{}, error) {
	want := fmt.Sprintf("%04X", port)
	inodes := make(map[string]struct{})
	for _, path := range []string{"/proc/net/tcp", "/proc/net/tcp6"} {
		f, err := os.Open(path)
		if err != nil {
			if os.IsNotExist(err) {
				continue
			}
			return nil, err
		}
		sc := bufio.NewScanner(f)
		for sc.Scan() {
			line := sc.Text()
			if strings.HasPrefix(line, "  sl") {
				continue
			}
			fields := strings.Fields(line)
			if len(fields) < 10 {
				continue
			}
			if fields[3] != "0A" {
				continue
			}
			local := fields[1]
			colon := strings.LastIndex(local, ":")
			if colon < 0 {
				continue
			}
			if !strings.EqualFold(local[colon+1:], want) {
				continue
			}
			inodes[fields[9]] = struct{}{}
		}
		_ = f.Close()
		if err := sc.Err(); err != nil {
			return nil, err
		}
	}
	return inodes, nil
}

func pidsForSocketInodes(inodes map[string]struct{}) ([]int, error) {
	if len(inodes) == 0 {
		return nil, nil
	}
	entries, err := os.ReadDir("/proc")
	if err != nil {
		return nil, err
	}

	seen := make(map[int]struct{})
	var pids []int
	for _, ent := range entries {
		pid, err := strconv.Atoi(ent.Name())
		if err != nil {
			continue
		}
		fdDir := filepath.Join("/proc", ent.Name(), "fd")
		fds, err := os.ReadDir(fdDir)
		if err != nil {
			continue
		}
		for _, fd := range fds {
			target, err := os.Readlink(filepath.Join(fdDir, fd.Name()))
			if err != nil {
				continue
			}
			if !strings.HasPrefix(target, "socket:[") {
				continue
			}
			inode := strings.TrimSuffix(strings.TrimPrefix(target, "socket:["), "]")
			if _, ok := inodes[inode]; !ok {
				continue
			}
			if _, ok := seen[pid]; ok {
				break
			}
			seen[pid] = struct{}{}
			pids = append(pids, pid)
			break
		}
	}
	return pids, nil
}

func portFromAddr(addr string) (int, error) {
	_, portStr, err := net.SplitHostPort(normalizeListenAddr(addr))
	if err != nil {
		return 0, err
	}
	port, err := strconv.Atoi(portStr)
	if err != nil {
		return 0, err
	}
	if port <= 0 || port > 65535 {
		return 0, errors.New("invalid port")
	}
	return port, nil
}

func normalizeListenAddr(addr string) string {
	if strings.HasPrefix(addr, ":") {
		return "0.0.0.0" + addr
	}
	return addr
}
