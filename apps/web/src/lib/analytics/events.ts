import va from "@vercel/analytics"
import { z } from "zod"

const eventSchema = z.object({
  name: z.enum([
    "call_started",
    "call_ended",
    "call_reconnected",
    "command_executed",
    "matchmaking_started",
    "matchmaking_matched",
    "matchmaking_skipped",
    "chat_message_sent",
    "chat_attachment_sent",
    "favorite_added",
    "favorite_removed",
    "user_blocked",
    "user_unblocked",
    "screen_share_started",
    "screen_share_stopped",
    "notification_received",
    "notification_clicked",
    "error_occurred",
  ]),
  properties: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
})

export type Event = z.infer<typeof eventSchema>

export function trackEvent(input: Event): void {
  const event = eventSchema.parse(input)
  if (event) {
    va.track(event.name, event.properties)
  }
}
