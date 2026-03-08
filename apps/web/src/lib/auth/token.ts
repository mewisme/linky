'use server'

import { auth } from '@clerk/nextjs/server';

const MAX_RETRIES = 3;

export async function getToken(): Promise<string> {
  const { getToken } = await auth({
    acceptsToken: 'any'
  });

  let token: string | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    token = await getToken({ template: 'server_action' });
    if (token) break;
    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 100 * attempt));
    }
  }

  if (!token) {
    throw new Error('Unauthorized');
  }

  return token;
}