export type TelemetryValue = string | number | boolean | null;

export interface TelemetryClient {
  setGlobalProperties: (properties: Record<string, TelemetryValue>) => void;
  track: (
    event: string,
    properties?: Record<string, TelemetryValue>,
  ) => Promise<void>;
  identify: (input: {
    profileId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatar?: string;
    properties?: Record<string, TelemetryValue>;
  }) => Promise<void>;
}

export const op: TelemetryClient = {
  setGlobalProperties: () => {},
  track: async () => {},
  identify: async () => {},
};
