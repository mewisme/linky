-- Postgres-backed dedupe and idempotency tables.
--
-- The job queue itself lives in Redis (worker uses BLMOVE + per-worker
-- processing list + heartbeat + reaper). This migration covers everything
-- that stays on Postgres for durability and auditability:
--
-- webhook_deliveries: replaces the Redis Clerk webhook dedupe lock.
-- broadcast_ai_drafts: replaces the Redis broadcast AI single-flight + cache.
-- call_history unique index: replaces the Redis call:processed:* lock.

CREATE TABLE IF NOT EXISTS "public"."webhook_deliveries" (
  "id" text NOT NULL,
  "source" text NOT NULL,
  "status" text NOT NULL DEFAULT 'processing',
  "processed_at" timestamptz,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "webhook_deliveries_status_check" CHECK ("status" IN ('processing','processed'))
);

CREATE INDEX IF NOT EXISTS "webhook_deliveries_expires_at_idx"
  ON "public"."webhook_deliveries" ("expires_at");

REVOKE ALL ON TABLE "public"."webhook_deliveries" FROM "anon";
REVOKE ALL ON TABLE "public"."webhook_deliveries" FROM "authenticated";
GRANT ALL ON TABLE "public"."webhook_deliveries" TO "service_role";


CREATE TABLE IF NOT EXISTS "public"."broadcast_ai_drafts" (
  "hash" text NOT NULL,
  "payload" jsonb NOT NULL,
  "model" text,
  "prompt_version" text,
  "status" text NOT NULL DEFAULT 'idle',
  "generated_at" timestamptz NOT NULL DEFAULT now(),
  "expires_at" timestamptz NOT NULL,
  PRIMARY KEY ("hash"),
  CONSTRAINT "broadcast_ai_drafts_status_check" CHECK ("status" IN ('idle','generating','ready'))
);

CREATE INDEX IF NOT EXISTS "broadcast_ai_drafts_expires_at_idx"
  ON "public"."broadcast_ai_drafts" ("expires_at");

REVOKE ALL ON TABLE "public"."broadcast_ai_drafts" FROM "anon";
REVOKE ALL ON TABLE "public"."broadcast_ai_drafts" FROM "authenticated";
GRANT ALL ON TABLE "public"."broadcast_ai_drafts" TO "service_role";


-- Replaces the call:processed:* Redis lock with a real DB-level uniqueness
-- constraint. Drop any duplicate rows defensively so the migration is
-- replayable.
DELETE FROM "public"."call_history" a
USING "public"."call_history" b
WHERE a.ctid > b.ctid
  AND a.caller_id = b.caller_id
  AND a.callee_id = b.callee_id
  AND a.started_at = b.started_at;

CREATE UNIQUE INDEX IF NOT EXISTS "call_history_caller_callee_started_uidx"
  ON "public"."call_history" ("caller_id", "callee_id", "started_at");


-- ---------------------------------------------------------------------------
-- RPC helpers (webhook dedupe)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.try_claim_webhook_delivery(
  p_id text,
  p_source text,
  p_lock_seconds integer
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text;
BEGIN
  DELETE FROM public.webhook_deliveries
   WHERE id = p_id AND status = 'processing' AND expires_at < now();
  INSERT INTO public.webhook_deliveries (id, source, status, expires_at)
    VALUES (p_id, p_source, 'processing', now() + make_interval(secs => p_lock_seconds))
    ON CONFLICT (id) DO NOTHING;
  IF FOUND THEN
    RETURN 'claimed';
  END IF;
  SELECT status INTO v_status FROM public.webhook_deliveries WHERE id = p_id;
  IF v_status = 'processed' THEN
    RETURN 'processed';
  END IF;
  RETURN 'busy';
END $$;


CREATE OR REPLACE FUNCTION public.mark_webhook_processed(p_id text, p_source text)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO public.webhook_deliveries (id, source, status, processed_at, expires_at)
    VALUES (p_id, p_source, 'processed', now(), now() + interval '24 hours')
    ON CONFLICT (id) DO UPDATE
      SET status = 'processed',
          processed_at = now(),
          expires_at = now() + interval '24 hours';
$$;


CREATE OR REPLACE FUNCTION public.release_webhook_processing(p_id text)
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM public.webhook_deliveries WHERE id = p_id AND status = 'processing';
$$;
