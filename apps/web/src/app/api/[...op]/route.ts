import { createRouteHandler } from '@openpanel/nextjs/server';
import { serverEnv } from '@/env/server-env';

export const { GET, POST } = createRouteHandler({
  apiUrl: serverEnv.OPENPANEL_API_URL,
});