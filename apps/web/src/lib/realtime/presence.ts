import * as Sentry from "@sentry/nextjs";

export type PresenceState =
  | "offline"
  | "online"
  | "available"
  | "matching"
  | "in_call"
  | "idle";

type PresencePublisher = (state: PresenceState) => void;

let publisher: PresencePublisher | null = null;
let lastState: PresenceState | null = null;

export function isPresenceState(value: unknown): value is PresenceState {
  return (
    value === "offline" ||
    value === "online" ||
    value === "available" ||
    value === "matching" ||
    value === "in_call" ||
    value === "idle"
  );
}

export function getLastPresenceState(): PresenceState | null {
  return lastState;
}

export function setPresencePublisher(next: PresencePublisher | null): void {
  publisher = next;
  if (publisher && lastState) {
    publisher(lastState);
  }
}

export function publishPresence(state: PresenceState): void {
  lastState = state;
  if (!publisher) return;
  try {
    publisher(state);
  } catch (error: unknown) {
    Sentry.logger.error("Failed to publish presence", {
      error: error instanceof Error ? error : new Error(String(error)),
      state,
    });
  }
}

