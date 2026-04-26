import { NextRequest, NextResponse } from "next/server";

import type { UsersAPI } from "@/entities/user/types/users.types";
import {
  getUserDetails,
  replaceUserDetails,
  updateUserDetails,
} from "@/features/user/api/profile";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function GET() {
  try {
    const data = await getUserDetails();
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "GET /api/users/details");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as UsersAPI.UserDetails.UpdateMe.Body;
    const data = await replaceUserDetails(body);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "PUT /api/users/details");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as UsersAPI.UserDetails.PatchMe.Body;
    const data = await updateUserDetails(body);
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "PATCH /api/users/details");
  }
}
