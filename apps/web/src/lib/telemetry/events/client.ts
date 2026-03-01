import { useOpenPanel } from "@openpanel/nextjs";
import { z } from "zod";

export const CLIENT_EVENT_NAMES = [
  "call_started",
  "call_ended",
  "call_reconnected",
  "matchmaking_started",
  "matchmaking_matched",
  "matchmaking_skipped",
  "chat_message_sent",
  "chat_attachment_sent",
  "screen_share_started",
  "screen_share_stopped",
  "favorite_added",
  "favorite_removed",
  "user_blocked",
  "user_unblocked",
  "report_submitted",
  "notification_received",
  "notification_clicked",
  "profile_updated",
  "interest_tags_updated",
  "settings_updated",
  "command_palette_opened",
  "command_executed",
  "sign_out",
  "error_occurred",
  "matchmaking_still_searching",
  "matchmaking_alt_action_clicked",
] as const;

export type ClientEventName = (typeof CLIENT_EVENT_NAMES)[number];

const eventSchema = z.object({
  name: z.enum(CLIENT_EVENT_NAMES),
  properties: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()])
    )
    .optional(),
});

export type Event = z.infer<typeof eventSchema>;

export function trackEvent(input: Event): void {
  const event = eventSchema.parse(input);
  const { track } = useOpenPanel();
  track(event.name, event.properties ?? {});
}
