DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_vault_coin_balance') THEN
    ALTER TABLE "public"."user_wallets" ADD CONSTRAINT "check_vault_coin_balance" CHECK (("vault_coin_balance" >= 0));
  END IF;
END
$$;
