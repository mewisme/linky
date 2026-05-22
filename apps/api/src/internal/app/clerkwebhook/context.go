package clerkwebhook

import (
	"context"
	"strings"

	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/logger"
)

const (
	processingLockSeconds = 600
	source                = "clerk"
)

var log = logger.New("context:clerk-webhook")

func ProcessDelivery(ctx context.Context, deliveryID string, evt map[string]interface{}) error {
	if deliveryID == "" {
		return nil
	}
	outcome, err := supax.TryClaimWebhookDeliveryPG(ctx, deliveryID, source, processingLockSeconds)
	if err != nil {
		log.Error().Err(err).Msg("Failed to claim webhook delivery")
		return err
	}
	switch outcome {
	case supax.WebhookProcessed:
		return nil
	case supax.WebhookBusy:
		return nil
	}
	if err := handleEvent(ctx, evt); err != nil {
		_ = supax.ReleaseWebhookProcessingPG(ctx, deliveryID)
		return err
	}
	if err := supax.MarkWebhookProcessedPG(ctx, deliveryID, source); err != nil {
		log.Warn().Err(err).Msg("Failed to mark webhook delivery as processed")
	}
	return nil
}

func handleEvent(ctx context.Context, evt map[string]interface{}) error {
	t, _ := evt["type"].(string)
	data, _ := evt["data"].(map[string]any)
	if data == nil {
		log.Info().Str("type", t).Msg("clerk webhook event with no data")
		return nil
	}
	switch t {
	case "user.created":
		return handleUserCreated(ctx, data)
	case "user.updated":
		return handleUserUpdated(ctx, data)
	case "user.deleted":
		return handleUserDeleted(ctx, data)
	}
	return nil
}

func handleUserCreated(ctx context.Context, data map[string]any) error {
	clerkID, _ := data["id"].(string)
	if clerkID == "" {
		return nil
	}
	rawEmail := firstEmail(data)
	email := ""
	if rawEmail != "" {
		email = strings.ToLower(strings.TrimSpace(rawEmail))
	}
	payload := map[string]any{
		"clerk_user_id": clerkID,
		"email":         nullable(email),
		"first_name":    nullable(asString(data["first_name"])),
		"last_name":     nullable(asString(data["last_name"])),
		"avatar_url":    nullable(asString(data["image_url"])),
	}
	if email != "" {
		existing, _ := supax.GetUserByEmail(ctx, email)
		if existing != nil {
			deleted := false
			if existing.Deleted != nil {
				deleted = *existing.Deleted
			}
			if deleted {
				body := map[string]any{
					"clerk_user_id": clerkID,
					"email":         nullable(email),
					"first_name":    nullable(asString(data["first_name"])),
					"last_name":     nullable(asString(data["last_name"])),
					"avatar_url":    nullable(asString(data["image_url"])),
					"deleted":       false,
					"deleted_at":    nil,
				}
				if _, err := supax.PatchUser(ctx, existing.ID, body); err != nil {
					log.Error().Err(err).Msg("Error reviving soft-deleted user")
					return err
				}
				return nil
			}
			if existing.ClerkUserID != clerkID {
				body := map[string]any{
					"clerk_user_id": clerkID,
					"email":         nullable(email),
					"first_name":    nullable(asString(data["first_name"])),
					"last_name":     nullable(asString(data["last_name"])),
					"avatar_url":    nullable(asString(data["image_url"])),
				}
				if _, err := supax.PatchUser(ctx, existing.ID, body); err != nil {
					log.Error().Err(err).Msg("Error patching existing user with new clerk id")
					return err
				}
				return nil
			}
			return nil
		}
	}
	if _, err := supax.CreateUser(ctx, payload); err != nil {
		log.Error().Err(err).Msg("Error creating user in Supabase")
		return err
	}
	log.Info().Str("clerkUserId", clerkID).Msg("Created user in Supabase")
	return nil
}

func handleUserUpdated(ctx context.Context, data map[string]any) error {
	clerkID, _ := data["id"].(string)
	if clerkID == "" {
		return nil
	}
	existing, err := supax.GetUserByClerkID(ctx, clerkID)
	if err != nil {
		return err
	}
	if existing == nil {
		log.Info().Str("clerkUserId", clerkID).Msg("User not found in Supabase, skipping update")
		return nil
	}
	body := map[string]any{
		"email":      nullable(asString(firstEmail(data))),
		"first_name": nullable(asString(data["first_name"])),
		"last_name":  nullable(asString(data["last_name"])),
		"avatar_url": nullable(asString(data["image_url"])),
	}
	if _, err := supax.PatchUser(ctx, existing.ID, body); err != nil {
		log.Error().Err(err).Msg("Error updating user in Supabase")
		return err
	}
	return nil
}

func handleUserDeleted(ctx context.Context, data map[string]any) error {
	clerkID, _ := data["id"].(string)
	if clerkID == "" {
		return nil
	}
	if err := supax.SoftDeleteUserByClerkID(ctx, clerkID); err != nil {
		log.Error().Err(err).Msg("Error soft-deleting user")
		return err
	}
	return nil
}

func firstEmail(data map[string]any) string {
	arr, _ := data["email_addresses"].([]any)
	if len(arr) == 0 {
		return ""
	}
	first, _ := arr[0].(map[string]any)
	if first == nil {
		return ""
	}
	s, _ := first["email_address"].(string)
	return s
}

func asString(v any) string {
	if v == nil {
		return ""
	}
	s, _ := v.(string)
	return s
}

func nullable(s string) any {
	if s == "" {
		return nil
	}
	return s
}
