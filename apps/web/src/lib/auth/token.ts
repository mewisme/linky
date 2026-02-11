'use server'

import { auth } from '@clerk/nextjs/server';

export async function getToken(): Promise<string> {
  const { getToken: getClerkToken } = await auth();
  const token = await getClerkToken({ template: 'custom' });
  if (!token) {
    throw new Error('Unauthorized');
  }
  return token;
}