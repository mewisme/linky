import { OpenPanel } from "@openpanel/nextjs";
import { publicEnv } from "@/shared/env/public-env";
import { serverEnv } from "@/shared/env/server-env";

const OPENPANEL_ENABLED = false;

const disabledOp = {
  setGlobalProperties: () => {},
  track: async () => {},
  identify: async () => {},
} as const satisfies Pick<OpenPanel, "track" | "identify" | "setGlobalProperties">;

function createOpenPanel(): OpenPanel {
  const client = new OpenPanel({
    apiUrl: serverEnv.OPENPANEL_API_URL,
    clientId: publicEnv.OPENPANEL_CLIENT_ID,
    clientSecret: serverEnv.OPENPANEL_CLIENT_SECRET,
  });
  client.setGlobalProperties({
    environment: serverEnv.isProd ? "production" : "development",
  });
  return client;
}

export const op: OpenPanel = OPENPANEL_ENABLED
  ? createOpenPanel()
  : (disabledOp as unknown as OpenPanel);
