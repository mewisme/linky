package staleproc

func FormatMaxClientsHint() string {
	return "redis max clients reached (stop duplicate dev:api instances; cloud tiers often allow ~30 connections)"
}
