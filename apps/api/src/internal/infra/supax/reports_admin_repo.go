package supax

import (
	"context"
	"errors"

	"linky-api/src/internal/infra/supax/codec"
)

type ReportRow struct {
	ID                  string         `json:"id"`
	ReporterUserID      string         `json:"reporter_user_id"`
	ReportedUserID      string         `json:"reported_user_id"`
	Reason              string         `json:"reason"`
	Description         *string        `json:"description,omitempty"`
	Status              string         `json:"status"`
	Metadata            map[string]any `json:"metadata,omitempty"`
	AdminNotes          *string        `json:"admin_notes,omitempty"`
	ReviewedBy          *string        `json:"reviewed_by,omitempty"`
	ReviewedAt          *string        `json:"reviewed_at,omitempty"`
	CreatedAt           string         `json:"created_at"`
	UpdatedAt           *string        `json:"updated_at,omitempty"`
	ReporterFirstName   *string        `json:"reporter_first_name,omitempty"`
	ReporterLastName    *string        `json:"reporter_last_name,omitempty"`
	ReporterAvatarURL   *string        `json:"reporter_avatar_url,omitempty"`
	ReporterEmail       *string        `json:"reporter_email,omitempty"`
	ReportedFirstName   *string        `json:"reported_first_name,omitempty"`
	ReportedLastName    *string        `json:"reported_last_name,omitempty"`
	ReportedAvatarURL   *string        `json:"reported_avatar_url,omitempty"`
	ReportedEmail       *string        `json:"reported_email,omitempty"`
	ReviewedByFirstName *string        `json:"reviewed_by_first_name,omitempty"`
	ReviewedByLastName  *string        `json:"reviewed_by_last_name,omitempty"`
	ReviewedByAvatarURL *string        `json:"reviewed_by_avatar_url,omitempty"`
}

func CreateReport(ctx context.Context, body map[string]any) (*ReportRow, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("reports").
		Insert(body, false, "", "representation", "exact").
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return codec.DecodeOne[ReportRow](raw)
}

func CreateReportContext(ctx context.Context, reportID string, metadata map[string]any) error {
	if reportID == "" || len(metadata) == 0 {
		return nil
	}
	c := Client()
	if c == nil {
		return errors.New("supabase: not configured")
	}
	body := map[string]any{"report_id": reportID}
	if v, ok := metadata["call_id"].(string); ok && v != "" {
		body["call_id"] = v
	}
	if v, ok := metadata["room_id"].(string); ok && v != "" {
		body["room_id"] = v
	}
	if v, ok := metadata["behavior_flags"]; ok && v != nil {
		body["behavior_flags"] = v
	}
	if len(body) == 1 {
		return nil
	}
	_, _, err := c.From("report_contexts").
		Insert(body, false, "", "", "exact").
		ExecuteWithContext(ctx)
	return err
}

func ListReports(ctx context.Context, userID string, limit, offset int) ([]ReportRow, int64, error) {
	c := Client()
	if c == nil {
		return nil, 0, errors.New("supabase: not configured")
	}
	raw, count, err := c.From("admin_reports_unified").
		Select("*", "exact", false).
		Eq("reporter_user_id", userID).
		Order("created_at", orderDesc).
		Range(offset, offset+limit-1, "").
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, 0, err
	}
	rows, err := codec.DecodeMany[ReportRow](raw)
	return rows, count, err
}

func ListAdminReports(ctx context.Context, status, reporterUserID, reportedUserID string, limit, offset int) ([]ReportRow, int64, error) {
	c := Client()
	if c == nil {
		return nil, 0, errors.New("supabase: not configured")
	}
	if limit <= 0 {
		limit = 50
	}
	q := c.From("admin_reports_unified").Select("*", "exact", false)
	if status != "" {
		q = q.Eq("status", status)
	}
	if reporterUserID != "" {
		q = q.Eq("reporter_user_id", reporterUserID)
	}
	if reportedUserID != "" {
		q = q.Eq("reported_user_id", reportedUserID)
	}
	q = q.Order("created_at", orderDesc).Range(offset, offset+limit-1, "")
	raw, count, err := q.ExecuteWithContext(ctx)
	if err != nil {
		return nil, 0, err
	}
	rows, err := codec.DecodeMany[ReportRow](raw)
	return rows, count, err
}

func PatchReport(ctx context.Context, id string, body map[string]any) (*ReportRow, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("reports").
		Update(body, "representation", "exact").
		Eq("id", id).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return codec.DecodeOne[ReportRow](raw)
}

func GetReport(ctx context.Context, id string) (*ReportRow, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("admin_reports_unified").
		Select("*", "exact", false).
		Eq("id", id).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return codec.DecodeOne[ReportRow](raw)
}
