import type { Response } from "express";
import type { BackendUserMessage } from "@ws/shared-types";
import { userFacingPayload } from "@/types/user-message.js";

export function sendJsonError(
  res: Response,
  status: number,
  error: string,
  userMessage: BackendUserMessage,
  extra?: Record<string, unknown>,
): void {
  const { message, userMessage: um } = userFacingPayload(userMessage);
  res.status(status).json({ error, message, userMessage: um, ...extra });
}

export function sendJsonWithUserMessage(
  res: Response,
  status: number,
  body: Record<string, unknown>,
  userMessage: BackendUserMessage,
): void {
  const { message, userMessage: um } = userFacingPayload(userMessage);
  res.status(status).json({ ...body, message, userMessage: um });
}
