import {
  createUser,
  getUserByClerkId,
  getUserByEmail,
  patchUser,
  softDeleteUserByClerkId,
} from "../infra/supabase/repositories/index.js";
import {
  isUserCreatedEvent,
  isUserDeletedEvent,
  isUserUpdatedEvent,
} from "../types/webhook/webhook.types.js";

import type { ClerkWebhookEvent } from "../types/webhook/webhook.types.js";
import { REDIS_CACHE_KEYS } from "../infra/redis/cache/keys.js";
import { invalidateByPrefix } from "../infra/redis/cache/index.js";

export async function handleClerkWebhookEvent(evt: ClerkWebhookEvent): Promise<void> {
  const eventType = evt.type;

  switch (eventType) {
    case "user.created": {
      if (isUserCreatedEvent(evt)) {
        const rawEmail = evt.data.email_addresses[0]?.email_address ?? null;
        const email = rawEmail ? rawEmail.toLowerCase().trim() : null;
        const payload = {
          clerk_user_id: evt.data.id,
          email,
          first_name: evt.data.first_name ?? null,
          last_name: evt.data.last_name ?? null,
          avatar_url: evt.data.image_url ?? null,
        };

        if (email) {
          const existing = await getUserByEmail(email);
          if (existing) {
            if (existing.deleted === true) {
              await patchUser(existing.id, {
                ...payload,
                deleted: false,
                deleted_at: null,
              });
              return;
            }
            if ((existing.deleted === false || existing.deleted === null) && existing.clerk_user_id !== evt.data.id) {
              await patchUser(existing.id, {
                clerk_user_id: evt.data.id,
                email,
                first_name: evt.data.first_name ?? null,
                last_name: evt.data.last_name ?? null,
                avatar_url: evt.data.image_url ?? null,
              });
              return;
            }
          }
        }

        await createUser(payload);
      }
      break;
    }

    case "user.updated": {
      if (isUserUpdatedEvent(evt)) {
        const existing = await getUserByClerkId(evt.data.id);
        if (!existing) return;
        await patchUser(existing.id, {
          email: evt.data.email_addresses[0]?.email_address ?? null,
          first_name: evt.data.first_name ?? null,
          last_name: evt.data.last_name ?? null,
          avatar_url: evt.data.image_url ?? null,
        });
      }
      break;
    }

    case "user.deleted": {
      if (isUserDeletedEvent(evt)) {
        await softDeleteUserByClerkId(evt.data.id);
        await invalidateByPrefix(REDIS_CACHE_KEYS.adminPrefix("users"));
      }
      break;
    }

    default:
      break;
  }
}
