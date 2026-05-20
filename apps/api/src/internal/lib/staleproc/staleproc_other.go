//go:build !linux

package staleproc

func KillOthers(exeSuffix string, selfPID int) (int, error) {
	return 0, nil
}

func FormatMaxClientsHint() string {
	return "redis max clients reached (stop duplicate dev:api instances)"
}
