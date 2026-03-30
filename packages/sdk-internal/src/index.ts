import { AI_JOB_QUEUE_KEY, JOBS_QUEUE_KEY, type AiJobEnvelope } from "@ws/shared-types";

type RedisListClient = {
  lPush: (key: string, element: string) => Promise<unknown>;
  brPop: (key: string, timeoutSeconds: number) => Promise<{ element: string } | null>;
};

export async function enqueueAiJob(client: RedisListClient, envelope: AiJobEnvelope): Promise<void> {
  await client.lPush(AI_JOB_QUEUE_KEY, JSON.stringify(envelope));
}

export async function dequeueAiJob(client: RedisListClient, timeoutSeconds: number): Promise<string | null> {
  const res = await client.brPop(AI_JOB_QUEUE_KEY, timeoutSeconds);
  return res?.element ?? null;
}

export async function dequeueGeneralJob(client: RedisListClient, timeoutSeconds: number): Promise<string | null> {
  const res = await client.brPop(JOBS_QUEUE_KEY, timeoutSeconds);
  return res?.element ?? null;
}
