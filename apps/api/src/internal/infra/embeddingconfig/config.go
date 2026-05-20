package embeddingconfig

import (
	"fmt"
	"sync"

	"linky-api/src/internal/logger"
)

const defaultDimension = 3072

var (
	log = logger.New("infra:embeddingconfig")

	mu         sync.RWMutex
	dimension  = defaultDimension
	columnName = columnForDimension(defaultDimension)
)

func Dimension() int {
	mu.RLock()
	defer mu.RUnlock()
	return dimension
}

func ColumnName() string {
	mu.RLock()
	defer mu.RUnlock()
	return columnName
}

func ColumnForDimension(dim int) (string, error) {
	col := columnForDimension(dim)
	if col == "" {
		return "", fmt.Errorf("unsupported embedding dimension %d", dim)
	}
	return col, nil
}

func ApplyDimension(dim int) error {
	col, err := ColumnForDimension(dim)
	if err != nil {
		return err
	}
	mu.Lock()
	prev := dimension
	dimension = dim
	columnName = col
	mu.Unlock()
	if prev != dim {
		log.Info().Int("dimension", dim).Str("column", col).Msg("User embedding dimension updated")
	}
	return nil
}

func columnForDimension(dim int) string {
	switch dim {
	case 384:
		return "e384"
	case 768:
		return "e768"
	case 1024:
		return "e1024"
	case 1536:
		return "e1536"
	case 3072:
		return "e3072"
	default:
		return ""
	}
}
