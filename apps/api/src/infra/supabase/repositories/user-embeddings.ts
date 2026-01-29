import { createLogger } from "@repo/logger";
import { supabase } from "../client.js";

const logger = createLogger("API:Supabase:UserEmbeddings:Repository");

export async function getUserEmbeddingByUserId(userId: string) {
  const { data, error } = await supabase
    .from("user_embeddings")
    .select("id, user_id, embedding, model_name, source_hash, created_at, updated_at")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error("Error fetching user embedding: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data;
}

export async function upsertUserEmbedding(
  userId: string,
  embedding: number[],
  modelName: string,
  sourceHash: string
) {
  const { data, error } = await supabase
    .from("user_embeddings")
    .upsert(
      {
        user_id: userId,
        embedding,
        model_name: modelName,
        source_hash: sourceHash,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    logger.error("Error upserting user embedding: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data;
}
