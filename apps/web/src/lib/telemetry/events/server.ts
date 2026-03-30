import { op } from "../op";
import { waitUntil } from '@vercel/functions';
import { z } from "zod";

export const SERVER_EVENT_NAMES = [
  "api_health_get",
  "api_admin_broadcasts_get",
  "api_admin_broadcasts_post",
  "api_push_vapid_public_key_get",
  "api_users_blocks_post",
  "api_users_blocks_me_get",
  "api_users_blocks_blocked_user_id_delete",
  "api_notifications_me_get",
  "api_notifications_me_unread_count_get",
  "api_notifications_id_read_patch",
  "api_notifications_read_all_patch",
  "api_push_subscribe_post",
  "api_push_unsubscribe_delete",
  "api_admin_embeddings_compare_post",
  "api_admin_embeddings_similar_post",
  "api_admin_embeddings_sync_post",
  "api_admin_users_get",
  "api_admin_users_id_get",
  "api_admin_users_id_put",
  "api_admin_users_id_patch",
  "api_admin_users_id_delete",
  "api_users_interest_tags_get",
  "api_users_interest_tags_all_get",
  "api_users_interest_tags_post",
  "api_users_interest_tags_put",
  "api_users_interest_tags_delete",
  "api_users_interest_tags_all_delete",
  "api_users_streak_get",
  "api_users_streak_calendar_get",
  "api_users_progress_get",
  "api_users_settings_get",
  "api_users_settings_put",
  "api_users_settings_patch",
  "api_users_details_get",
  "api_users_details_put",
  "api_users_details_patch",
  "api_users_me_get",
  "api_users_me_country_patch",
  "api_resources_call_history_get",
  "api_resources_call_history_id_get",
  "api_resources_interest_tags_get",
  "api_resources_interest_tags_id_get",
  "api_resources_favorites_get",
  "api_resources_favorites_post",
  "api_resources_favorites_favorite_user_id_delete",
  "api_resources_reports_get",
  "api_resources_reports_post",
  "api_resources_reports_me_get",
  "api_video_chat_end_call_unload_post",
  "api_admin_interest_tags_get",
  "api_admin_interest_tags_post",
  "api_admin_interest_tags_import_post",
  "api_admin_interest_tags_id_get",
  "api_admin_interest_tags_id_put",
  "api_admin_interest_tags_id_patch",
  "api_admin_interest_tags_id_delete",
  "api_admin_interest_tags_id_hard_delete",
  "api_admin_media_presigned_upload_post",
  "api_admin_level_feature_unlocks_get",
  "api_admin_level_feature_unlocks_post",
  "api_admin_level_feature_unlocks_id_get",
  "api_admin_level_feature_unlocks_id_put",
  "api_admin_level_feature_unlocks_id_patch",
  "api_admin_level_feature_unlocks_id_delete",
  "api_admin_streak_exp_bonuses_get",
  "api_admin_streak_exp_bonuses_post",
  "api_admin_streak_exp_bonuses_id_get",
  "api_admin_streak_exp_bonuses_id_put",
  "api_admin_streak_exp_bonuses_id_patch",
  "api_admin_streak_exp_bonuses_id_delete",
  "api_admin_level_rewards_get",
  "api_admin_level_rewards_post",
  "api_admin_level_rewards_id_get",
  "api_admin_level_rewards_id_put",
  "api_admin_level_rewards_id_patch",
  "api_admin_level_rewards_id_delete",
  "api_admin_reports_get",
  "api_admin_reports_id_get",
  "api_admin_reports_id_patch",
  "api_media_ice_servers_get",
  "api_media_s3_multipart_start_post",
  "api_media_s3_multipart_complete_post",
  "api_media_s3_multipart_abort_post",
  "api_media_s3_multipart_part_get",
  "api_media_s3_objects_get",
  "api_media_s3_objects_key_delete",
  "api_media_s3_presigned_upload_get",
  "api_media_s3_presigned_download_get",
  "api_matchmaking_queue_status_get",
] as const;

export type ServerEventName = (typeof SERVER_EVENT_NAMES)[number];

const eventSchema = z.object({
  name: z.enum(SERVER_EVENT_NAMES),
  properties: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()])
    )
    .optional(),
});

export type Event = z.infer<typeof eventSchema>;

export function trackEventServer(input: Event): void {
  const event = eventSchema.parse(input);
  waitUntil(op.track(event.name, event.properties ?? {}));
}
