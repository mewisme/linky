import {
  createUser,
  getUserByClerkId,
  getUserByEmail,
  patchUser,
  softDeleteUserByClerkId,
} from "@/infra/supabase/repositories/index.js";
import { invalidate, invalidateByPrefix } from "@/infra/redis/cache/index.js";
import {
  isUserCreatedEvent,
  isUserDeletedEvent,
  isUserUpdatedEvent,
} from "@/types/webhook/webhook.types.js";

import type { ClerkWebhookEvent } from "@/types/webhook/webhook.types.js";
import { REDIS_CACHE_KEYS } from "@/infra/redis/cache/keys.js";
import { canAutoRemoveUserEmail } from "@/utils/clerk-validation-email.js";
import { clerk } from "@/infra/clerk/client.js";
import { createLogger } from "@/utils/logger.js";

import { toLoggableError } from "@/utils/to-loggable-error.js";
const logger = createLogger("webhook:clerk");

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
              await invalidate(REDIS_CACHE_KEYS.userProfile(existing.id));
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
              await invalidate(REDIS_CACHE_KEYS.userProfile(existing.id));
              return;
            }
            if (existing.clerk_user_id === evt.data.id) {
              return;
            }
          }
        }


        if (email && (await canAutoRemoveUserEmail(email))) {
          try {
            await clerk.users.deleteUser(evt.data.id);
            logger.info(`Deleted automation test user ${evt.data.id} from Clerk after created`);
          } catch (error) {
            logger.error(toLoggableError(error), "Error deleting user from Clerk");
          }
        } else {
          try {
            await createUser(payload);
            logger.info(`Created user ${evt.data.id} in Supabase`);
          } catch (error) {
            logger.error(toLoggableError(error), "Error creating user in Supabase");
          }
        }
      }
      break;
    }

    case "user.updated": {
      if (isUserUpdatedEvent(evt)) {
        try {

          const existing = await getUserByClerkId(evt.data.id);
          if (!existing) {
            logger.info(`User ${evt.data.id} not found in Supabase`);
            return;
          }

          logger.info(`Updating user ${evt.data.id} in Supabase`);
          await patchUser(existing.id, {
            email: evt.data.email_addresses[0]?.email_address ?? null,
            first_name: evt.data.first_name ?? null,
            last_name: evt.data.last_name ?? null,
            avatar_url: evt.data.image_url ?? null,
          });
          logger.info(`Invalidating user ${evt.data.id} in Redis`);
          await invalidate(REDIS_CACHE_KEYS.userProfile(existing.id));
          logger.info(`User ${evt.data.id} updated in Supabase`);
        } catch (error) {
          logger.error(toLoggableError(error), "Error updating user in Supabase");
        }
      }
      break;
    }

    case "user.deleted": {
      if (isUserDeletedEvent(evt)) {
        try {
          await softDeleteUserByClerkId(evt.data.id);
          logger.info(`Soft deleted user ${evt.data.id} in Supabase`);
        } catch (error) {
          logger.error(toLoggableError(error), "Error soft deleting user in Supabase");
        }
        await invalidateByPrefix(REDIS_CACHE_KEYS.adminPrefix("users"));
      }
      break;
    }

    default:
      break;
  }
}
