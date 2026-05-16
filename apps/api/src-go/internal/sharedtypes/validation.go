package sharedtypes

import (
	"encoding/json"
	"errors"
	"regexp"

	"github.com/google/uuid"
)

var dateRe = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)

type RawEnvelope struct {
	V       int             `json:"v"`
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type ParsedEnvelope struct {
	Raw     map[string]interface{}
	Type    string
	Payload map[string]interface{}
}

func ParseAndValidate(body []byte) (*ParsedEnvelope, error) {
	var raw map[string]interface{}
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, err
	}
	v, _ := raw["v"].(float64)
	if v != 1 {
		return nil, errors.New("v must be 1")
	}
	t, _ := raw["type"].(string)
	payload, ok := raw["payload"].(map[string]interface{})
	if !ok {
		return nil, errors.New("payload required")
	}
	switch t {
	case JobTypeReportAISummary:
		rid, _ := payload["reportId"].(string)
		if rid == "" {
			return nil, errors.New("reportId required")
		}
		if f, present := payload["force"]; present {
			if _, ok := f.(bool); !ok {
				return nil, errors.New("force must be boolean")
			}
		}
	case JobTypeUserEmbeddingRegenerate:
		uid, _ := payload["userId"].(string)
		if _, err := uuid.Parse(uid); err != nil {
			return nil, errors.New("userId must be uuid")
		}
	case JobTypeApplyCallExp:
		uid, _ := payload["userId"].(string)
		if _, err := uuid.Parse(uid); err != nil {
			return nil, errors.New("userId must be uuid")
		}
		ds, _ := payload["durationSeconds"].(float64)
		if ds <= 0 || ds != float64(int(ds)) {
			return nil, errors.New("durationSeconds must be positive integer")
		}
		if v, present := payload["expSecondsToAdd"]; present {
			n, ok := v.(float64)
			if !ok || n < 0 || n != float64(int(n)) {
				return nil, errors.New("expSecondsToAdd must be non-negative integer")
			}
		}
		if v, present := payload["timezone"]; present {
			s, ok := v.(string)
			if !ok || s == "" {
				return nil, errors.New("timezone must be string")
			}
		}
		if v, present := payload["counterpartUserId"]; present {
			s, ok := v.(string)
			if !ok {
				return nil, errors.New("counterpartUserId must be string")
			}
			if _, err := uuid.Parse(s); err != nil {
				return nil, errors.New("counterpartUserId must be uuid")
			}
		}
		if v, present := payload["dateForExpToday"]; present {
			s, ok := v.(string)
			if !ok || !dateRe.MatchString(s) {
				return nil, errors.New("dateForExpToday must be YYYY-MM-DD")
			}
		}
	default:
		return nil, errors.New("unknown job type")
	}
	return &ParsedEnvelope{Raw: raw, Type: t, Payload: payload}, nil
}

func CanonicalJSON(p *ParsedEnvelope) ([]byte, error) {
	return json.Marshal(p.Raw)
}
