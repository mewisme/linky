import { publicEnv, serverEnv } from "@/env";
import { OpenPanel } from '@openpanel/nextjs';

export const op = new OpenPanel({
  apiUrl: publicEnv.OPENPANEL_API_URL,
  clientId: publicEnv.OPENPANEL_CLIENT_ID,
  clientSecret: serverEnv.OPENPANEL_CLIENT_SECRET,
});