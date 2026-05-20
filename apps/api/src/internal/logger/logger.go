package logger

import (
	"os"
	"strings"
	"time"

	"github.com/rs/zerolog"
)

var base zerolog.Logger

func init() {
	zerolog.TimeFieldFormat = time.RFC3339Nano

	if isDevelopment() {
		writer := zerolog.ConsoleWriter{
			Out:        os.Stdout,
			TimeFormat: "15:04:05.000",
			FormatLevel: func(i interface{}) string {
				if l, ok := i.(string); ok {
					return strings.ToUpper(l)
				}
				return ""
			},
		}
		base = zerolog.New(writer).With().Timestamp().Logger()
		return
	}

	base = zerolog.New(os.Stdout).With().Timestamp().Logger()
}

func isDevelopment() bool {
	switch strings.ToLower(strings.TrimSpace(os.Getenv("LOG_FORMAT"))) {
	case "json":
		return false
	case "pretty", "console":
		return true
	}
	env := strings.ToLower(strings.TrimSpace(os.Getenv("NODE_ENV")))
	if env == "" {
		env = strings.ToLower(strings.TrimSpace(os.Getenv("GO_ENV")))
	}
	return env != "production"
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
