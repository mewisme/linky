import { Database } from "../../types/database.types.js";
import { config } from "../../config/index.js";
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient<Database>(
  config.supabaseUrl,
  config.supabaseServiceRoleKey
);