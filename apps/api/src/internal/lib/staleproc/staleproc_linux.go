//go:build linux

package staleproc

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"
)

func KillOthers(exeSuffix string, selfPID int) (int, error) {
	if exeSuffix == "" || selfPID <= 0 {
		return 0, nil
	}

	entries, err := os.ReadDir("/proc")
	if err != nil {
		return 0, err
	}

	var killed int
	for _, ent := range entries {
		pid, err := strconv.Atoi(ent.Name())
		if err != nil || pid == selfPID {
			continue
		}
		exe, err := os.Readlink(filepath.Join("/proc", ent.Name(), "exe"))
		if err != nil {
			continue
		}
		if !strings.HasSuffix(exe, exeSuffix) {
			continue
		}
		if err := terminatePID(pid); err != nil {
			continue
		}
		killed++
	}
	if killed > 0 {
		time.Sleep(400 * time.Millisecond)
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

func FormatMaxClientsHint() string {
	return fmt.Sprintf("redis max clients reached (stop duplicate dev:api instances; cloud tiers often allow ~30 connections)")
}
