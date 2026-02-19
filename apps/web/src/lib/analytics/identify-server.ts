import { op } from "./op";

export async function identifyUser(
  input: {
    profileId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  },
  extraProperties?: Record<string, string | number | boolean | null>
): Promise<void> {
  if (!input.profileId || !input.email) return Promise.resolve();
  await op.identify({
    profileId: input.profileId,
    firstName: input.firstName ?? undefined,
    lastName: input.lastName ?? undefined,
    email: input.email,
    properties: extraProperties ?? {},
  });
}
