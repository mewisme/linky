import { tryEnqueueJob } from "@/jobs/job-queue.js";

export async function tryEnqueueUserEmbeddingRegenerateJob(userId: string): Promise<boolean> {
  return tryEnqueueJob({
    v: 1,
    type: "user_embedding_regenerate",
    payload: { userId },
  });
}
