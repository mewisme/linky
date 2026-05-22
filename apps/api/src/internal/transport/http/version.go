package routes

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

var (
	packageVersionOnce sync.Once
	packageVersion     string
)

func readPackageVersion() string {
	packageVersionOnce.Do(func() {
		packageVersion = "unknown"
		cwd, err := os.Getwd()
		if err != nil {
			return
		}
		dir := cwd
		for i := 0; i < 6; i++ {
			data, err := os.ReadFile(filepath.Join(dir, "package.json"))
			if err == nil {
				var pkg struct {
					Version string `json:"version"`
				}
				if jerr := json.Unmarshal(data, &pkg); jerr == nil && pkg.Version != "" {
					packageVersion = pkg.Version
					return
				}
				return
			}
			parent := filepath.Dir(dir)
			if parent == dir {
				return
			}
			dir = parent
		}
	})
	return packageVersion
}
