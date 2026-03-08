'use server'

import { auth } from '@clerk/nextjs/server';

export async function getToken(): Promise<string> {
  const { getToken } = await auth();
  const token = await getToken({ template: 'custom' });

  if (!token) {
    throw new Error('Unauthorized');
  }

  return token;
}