import { User } from "@clerk/nextjs/server";
import { op } from "./op";

export async function identifyUser(
  input: User | null,
  extraProperties?: Record<string, string | number | boolean | null>
): Promise<void> {
  if (!input) return Promise.resolve();
  await op.identify({
    profileId: input.id,
    firstName: input.firstName ?? undefined,
    lastName: input.lastName ?? undefined,
    email: input.emailAddresses[0]?.emailAddress ?? undefined,
    avatar: input.imageUrl ?? undefined,
    properties: extraProperties ?? {},
  });
}
