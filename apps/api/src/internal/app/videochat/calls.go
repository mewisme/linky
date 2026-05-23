package videochat

import (
	"context"
	"encoding/json"
	"errors"

	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/infra/supax/pgclient"
)

var ErrCallHistoryForbidden = errors.New("call history forbidden")

func GetUserIDByClerkID(ctx context.Context, clerkUserID string) (string, error) {
	return supax.GetUserInternalID(ctx, clerkUserID)
}

type EnrichedCall struct {
	supax.CallHistoryRow
	OtherUser *OtherUser `json:"other_user"`
	IsCaller  bool       `json:"is_caller"`
}

type OtherUser struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	AvatarURL *string `json:"avatar_url"`
	Country   *string `json:"country"`
}

func GetCallHistoryItem(ctx context.Context, userID, callHistoryID string) (*supax.CallHistoryRow, error) {
	row, err := supax.GetCallHistoryByID(ctx, callHistoryID)
	if err != nil || row == nil {
		return nil, err
	}
	if row.CallerID != userID && row.CalleeID != userID {
		return nil, ErrCallHistoryForbidden
	}
	return row, nil
}

func ListCallHistory(ctx context.Context, userID string, limit, offset int) ([]EnrichedCall, int64, error) {
	rows, count, err := supax.GetCallHistoryByUserID(ctx, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	out := make([]EnrichedCall, 0, len(rows))
	for _, r := range rows {
		isCaller := r.CallerID == userID
		var otherUserID string
		if isCaller {
			otherUserID = r.CalleeID
		} else {
			otherUserID = r.CallerID
		}
		other, _ := getUserBrief(ctx, otherUserID)
		out = append(out, EnrichedCall{
			CallHistoryRow: r,
			OtherUser:      other,
			IsCaller:       isCaller,
		})
	}
	return out, count, nil
}

func getUserBrief(ctx context.Context, id string) (*OtherUser, error) {
	c := pgclient.Client()
	if c == nil {
		return nil, nil
	}
	type row struct {
		ID        string  `json:"id"`
		FirstName *string `json:"first_name"`
		LastName  *string `json:"last_name"`
		AvatarURL *string `json:"avatar_url"`
		Country   *string `json:"country"`
	}
	raw, _, err := c.From("users").
		Select("id, first_name, last_name, avatar_url, country", "exact", false).
		Eq("id", id).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	var arr []row
	if len(raw) == 0 {
		return nil, nil
	}
	if err := json.Unmarshal(raw, &arr); err != nil {
		return nil, err
	}
	if len(arr) == 0 {
		return nil, nil
	}
	r := arr[0]
	name := ""
	if r.FirstName != nil {
		name += *r.FirstName
	}
	if r.LastName != nil {
		if name != "" {
			name += " "
		}
		name += *r.LastName
	}
	if name == "" {
		name = "Anonymous"
	}
	return &OtherUser{ID: r.ID, Name: name, AvatarURL: r.AvatarURL, Country: r.Country}, nil
}
