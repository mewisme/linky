package routes

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/supax"
)

func handleAdminImportInterestTags(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Tags  []map[string]any `json:"tags"`
		Items []struct {
			DisplayName string  `json:"display_name"`
			Category    *string `json:"category"`
			Icon        *string `json:"icon"`
			Description *string `json:"description"`
			IsActive    *bool   `json:"is_active"`
		} `json:"items"`
	}
	_ = json.Unmarshal(rawBody, &input)

	tags := input.Tags
	if len(tags) == 0 {
		for _, item := range input.Items {
			name := strings.TrimSpace(item.DisplayName)
			if name == "" {
				continue
			}
			row := map[string]any{"name": name, "is_active": true}
			if item.Category != nil && *item.Category != "" {
				row["category"] = *item.Category
			}
			if item.Icon != nil && *item.Icon != "" {
				row["icon"] = *item.Icon
			}
			if item.Description != nil && *item.Description != "" {
				row["description"] = *item.Description
			}
			if item.IsActive != nil {
				row["is_active"] = *item.IsActive
			}
			tags = append(tags, row)
		}
	}

	total := len(input.Items)
	if total == 0 {
		total = len(tags)
	}
	if len(tags) == 0 {
		return c.JSON(http.StatusOK, map[string]any{
			"total":           total,
			"created":         0,
			"updated":         0,
			"skipped_invalid": total,
		})
	}

	created := 0
	for _, t := range tags {
		name, _ := t["name"].(string)
		if strings.TrimSpace(name) == "" {
			continue
		}
		if _, err := supax.InsertGeneric(c.Request().Context(), "interest_tags", t); err == nil {
			created++
		}
	}
	skipped := total - created
	if skipped < 0 {
		skipped = 0
	}
	return c.JSON(http.StatusOK, map[string]any{
		"total":           total,
		"created":         created,
		"updated":         0,
		"skipped_invalid": skipped,
	})
}

func handleAdminInterestTagHardDelete(c echo.Context) error {
	id := c.Param("id")
	if err := supax.DeleteGeneric(c.Request().Context(), "interest_tags", id); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_DELETE_TAG", "failedDeleteInterestTag", "Failed to delete interest tag"))
	}
	return c.NoContent(http.StatusNoContent)
}
