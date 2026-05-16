import { OpenPanel } from '@openpanel/nextjs';
import { publicEnv } from "@/shared/env/public-env";
import { serverEnv } from "@/shared/env/server-env";

export const op: OpenPanel = false ? new OpenPanel({
  apiUrl: serverEnv.OPENPANEL_API_URL,
    clientId: publicEnv.OPENPANEL_CLIENT_ID,
    clientSecret: serverEnv.OPENPANEL_CLIENT_SECRET,
  })
  : null as unknown as OpenPanel;

op.setGlobalProperties({
  environment: serverEnv.isProd ? "production" : "development"
})
