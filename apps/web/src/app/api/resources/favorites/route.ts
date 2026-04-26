import { NextRequest, NextResponse } from "next/server";

import { addFavorite, getFavorites } from "@/actions/resources/favorites";
import { nextResponseFromActionError } from "@/lib/http/action-route-response";

export async function GET() {
  try {
    const data = await getFavorites();
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "GET /api/resources/favorites");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { favorite_user_id?: string };
    if (!body.favorite_user_id?.trim()) {
      return NextResponse.json(
        { error: "Bad Request", message: "favorite_user_id is required" },
        { status: 400 },
      );
    }
    const data = await addFavorite(body.favorite_user_id.trim());
    return NextResponse.json(data);
  } catch (error) {
    return nextResponseFromActionError(error, "POST /api/resources/favorites");
  }
}
