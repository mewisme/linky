import { NextRequest, NextResponse } from 'next/server';

import { setClerkAdminPasswordCompromised } from '@/features/admin/api/clerk-users';
import type { AdminAPI } from '@/features/admin/types/admin.types';
import { nextResponseFromActionError } from '@/lib/http/action-route-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = (await request.json()) as AdminAPI.SetClerkPasswordCompromised.Body;
    const data = await setClerkAdminPasswordCompromised(id, body);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(
      error,
      'POST /api/admin/users/clerk/[id]/password/set-compromised',
    );
  }
}
