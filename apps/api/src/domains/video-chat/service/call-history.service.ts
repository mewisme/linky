import { createCallHistory, getUserCountry } from "@/infra/supabase/repositories/call-history.js";

export async function recordCallHistoryInDatabase(params: {
  callerId: string;
  calleeId: string;
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
  callerTimezone: string;
  calleeTimezone: string;
}): Promise<void> {
  const {
    callerId,
    calleeId,
    startedAt,
    endedAt,
    durationSeconds,
  } = params;

  const callerCountry = await getUserCountry(callerId);
  const calleeCountry = await getUserCountry(calleeId);

  await createCallHistory({
    callerId,
    calleeId,
    callerCountry,
    calleeCountry,
    startedAt,
    endedAt,
    durationSeconds,
  });
}
