package supax

import (
	"context"
	"errors"
)

type VideoFilterPresetRow struct {
	ID             string  `json:"id"`
	Slug           string  `json:"slug"`
	Name           string  `json:"name"`
	Description    *string `json:"description"`
	FragmentShader string  `json:"fragment_shader"`
	ThumbnailURL   *string `json:"thumbnail_url"`
	SortOrder      int     `json:"sort_order"`
	IsActive       bool    `json:"is_active"`
	CreatedAt      string  `json:"created_at"`
	UpdatedAt      string  `json:"updated_at"`
}

type VideoFilterPresetPublicRow struct {
	ID           string  `json:"id"`
	Slug         string  `json:"slug"`
	Name         string  `json:"name"`
	Description  *string `json:"description"`
	ThumbnailURL *string `json:"thumbnail_url"`
	SortOrder    int     `json:"sort_order"`
	IsActive     bool    `json:"is_active"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}

func GetVideoFilterPresets(ctx context.Context, limit, offset int) ([]VideoFilterPresetPublicRow, int64, error) {
	c := Client()
	if c == nil {
		return nil, 0, errors.New("supabase: not configured")
	}
	q := c.From("video_filter_presets").
		Select("id, slug, name, description, thumbnail_url, sort_order, is_active, created_at, updated_at", "exact", false).
		Eq("is_active", "true").
		Order("sort_order", orderAsc).
		Order("name", orderAsc)
	if limit > 0 {
		q = q.Range(offset, offset+limit-1, "")
	}
	raw, count, err := q.ExecuteWithContext(ctx)
	if err != nil {
		return nil, 0, err
	}
	rows, err := decodeMany[VideoFilterPresetPublicRow](raw)
	return rows, count, err
}

func GetVideoFilterPresetByID(ctx context.Context, id string) (*VideoFilterPresetRow, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("video_filter_presets").
		Select("id, slug, name, description, fragment_shader, thumbnail_url, sort_order, is_active, created_at, updated_at", "exact", false).
		Eq("id", id).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	row, err := decodeOne[VideoFilterPresetRow](raw)
	if err != nil {
		return nil, err
	}
	if row == nil || !row.IsActive {
		return nil, nil
	}
	return row, nil
}
