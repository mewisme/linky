CREATE OR REPLACE FUNCTION "public"."update_coin_shop_items_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."update_coin_shop_items_updated_at"() OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."coin_shop_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" text NOT NULL,
    "name" text NOT NULL,
    "type" text NOT NULL,
    "price" integer NOT NULL,
    "metadata" jsonb,
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "coin_shop_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "coin_shop_items_key_key" UNIQUE ("key"),
    CONSTRAINT "check_coin_shop_items_price" CHECK (("price" >= 0))
);

ALTER TABLE "public"."coin_shop_items" OWNER TO "postgres";

COMMENT ON TABLE "public"."coin_shop_items" IS 'Cosmetic shop catalog. type: avatar_frame | reaction_pack | profile_effect | video_overlay';

CREATE INDEX IF NOT EXISTS "idx_coin_shop_items_is_active" ON "public"."coin_shop_items" ("is_active");

CREATE OR REPLACE TRIGGER "trigger_update_coin_shop_items_updated_at"
  BEFORE UPDATE ON "public"."coin_shop_items"
  FOR EACH ROW EXECUTE FUNCTION "public"."update_coin_shop_items_updated_at"();

CREATE TABLE IF NOT EXISTS "public"."user_owned_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "acquired_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_owned_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_owned_items_user_id_item_id_key" UNIQUE ("user_id", "item_id")
);

ALTER TABLE "public"."user_owned_items" OWNER TO "postgres";

COMMENT ON TABLE "public"."user_owned_items" IS 'Permanent cosmetic ownership per user';

CREATE INDEX IF NOT EXISTS "idx_user_owned_items_user_id" ON "public"."user_owned_items" ("user_id");

ALTER TABLE ONLY "public"."user_owned_items"
    ADD CONSTRAINT "fk_user_owned_items_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_owned_items"
    ADD CONSTRAINT "fk_user_owned_items_item" FOREIGN KEY ("item_id") REFERENCES "public"."coin_shop_items"("id") ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION "public"."purchase_shop_item"("p_user_id" "uuid", "p_item_id" "uuid")
RETURNS TABLE("new_coin_balance" integer)
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_item record;
  v_balance integer;
  v_new_balance integer;
BEGIN
  SELECT id, price, is_active INTO v_item
  FROM coin_shop_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'ITEM_NOT_FOUND' USING errcode = 'check_violation';
  END IF;
  IF NOT v_item.is_active THEN
    RAISE EXCEPTION 'ITEM_NOT_FOUND' USING errcode = 'check_violation';
  END IF;

  IF EXISTS (SELECT 1 FROM user_owned_items WHERE user_id = p_user_id AND item_id = p_item_id) THEN
    RAISE EXCEPTION 'ALREADY_OWNED' USING errcode = 'check_violation';
  END IF;

  SELECT coin_balance INTO v_balance
  FROM user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'INSUFFICIENT_COINS' USING errcode = 'check_violation';
  END IF;
  IF v_balance < v_item.price THEN
    RAISE EXCEPTION 'INSUFFICIENT_COINS' USING errcode = 'check_violation';
  END IF;

  UPDATE user_wallets
  SET coin_balance = coin_balance - v_item.price,
      total_spent = total_spent + v_item.price
  WHERE user_id = p_user_id;

  INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
  VALUES (p_user_id, 'shop_purchase', -(v_item.price), 'shop_purchase',
    jsonb_build_object('item_id', p_item_id));

  INSERT INTO user_owned_items (user_id, item_id)
  VALUES (p_user_id, p_item_id);

  SELECT coin_balance INTO v_new_balance FROM user_wallets WHERE user_id = p_user_id;
  new_coin_balance := v_new_balance;
  RETURN NEXT;
END;
$$;

ALTER FUNCTION "public"."purchase_shop_item"("p_user_id" "uuid", "p_item_id" "uuid") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."purchase_shop_item"("p_user_id" "uuid", "p_item_id" "uuid") IS 'Atomically deducts coins, logs ledger, grants item. Raises ITEM_NOT_FOUND, ALREADY_OWNED, INSUFFICIENT_COINS.';

GRANT ALL ON TABLE "public"."coin_shop_items" TO "anon";
GRANT ALL ON TABLE "public"."coin_shop_items" TO "authenticated";
GRANT ALL ON TABLE "public"."coin_shop_items" TO "service_role";

GRANT ALL ON TABLE "public"."user_owned_items" TO "anon";
GRANT ALL ON TABLE "public"."user_owned_items" TO "authenticated";
GRANT ALL ON TABLE "public"."user_owned_items" TO "service_role";

GRANT ALL ON FUNCTION "public"."update_coin_shop_items_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_coin_shop_items_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_coin_shop_items_updated_at"() TO "service_role";

GRANT ALL ON FUNCTION "public"."purchase_shop_item"("p_user_id" "uuid", "p_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."purchase_shop_item"("p_user_id" "uuid", "p_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."purchase_shop_item"("p_user_id" "uuid", "p_item_id" "uuid") TO "service_role";
