import { NextRequest, NextResponse } from "next/server";

import type { UsersAPI } from "@/entities/user/types/users.types";
import {
  getUserSettings,
  replaceUserSettings,
  updateUserSettings,
} from "@/features/user/api/settings";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function GET() {
  try {
    const data = await getUserSettings();
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "GET /api/users/settings");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as UsersAPI.UserSettings.UpdateMe.Body;
    const data = await replaceUserSettings(body);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "PUT /api/users/settings");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as UsersAPI.UserSettings.PatchMe.Body;
    const data = await updateUserSettings(body);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "PATCH /api/users/settings");
  }
}
