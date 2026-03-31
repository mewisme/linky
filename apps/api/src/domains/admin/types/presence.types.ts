export type PresenceState =
  | "offline"
  | "online"
  | "available"
  | "matching"
  | "in_call"
  | "idle";

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

