import { JOB_QUEUE_KEY, type JobEnvelope } from "@ws/shared-types";

export type RedisListClient = {
  lPush: (key: string, element: string) => Promise<unknown>;
  brPop: (key: string, timeoutSeconds: number) => Promise<{ element: string } | null>;
};

export async function enqueueJob(client: RedisListClient, envelope: JobEnvelope): Promise<void> {
  await client.lPush(JOB_QUEUE_KEY, JSON.stringify(envelope));
}

export async function dequeueJob(client: RedisListClient, timeoutSeconds: number): Promise<string | null> {
  const res = await client.brPop(JOB_QUEUE_KEY, timeoutSeconds);
  return res?.element ?? null;
}
