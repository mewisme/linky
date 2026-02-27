'use server'

import { auth } from '@clerk/nextjs/server';
import { cache } from 'react';

export const getToken = cache(async (): Promise<string> => {
  const { getToken } = await auth();
  const token = await getToken({ template: 'custom' });

  if (!token) {
    throw new Error('Unauthorized');
  }

  return token;
});