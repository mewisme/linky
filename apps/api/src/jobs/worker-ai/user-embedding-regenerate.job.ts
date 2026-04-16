import { tryEnqueueAiJob } from "./job-queue.js";

export async function tryEnqueueUserEmbeddingRegenerateJob(userId: string): Promise<boolean> {
  return tryEnqueueAiJob({
    v: 1,
    type: "user_embedding_regenerate",
    payload: { userId },
  });
}
