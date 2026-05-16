package logger

import (
	"os"
	"time"

	"github.com/rs/zerolog"
)

var base zerolog.Logger

func init() {
	zerolog.TimeFieldFormat = time.RFC3339Nano
	base = zerolog.New(os.Stdout).With().Timestamp().Logger()
}

func New(scope string) zerolog.Logger {
	return base.With().Str("scope", scope).Logger()
}

func SetLevel(level string) {
	switch level {
	case "trace":
		zerolog.SetGlobalLevel(zerolog.TraceLevel)
	case "debug":
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case "info":
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	case "warn":
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case "error":
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	default:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}
}
