import { createLogger } from "@repo/logger";

export const logger: ReturnType<typeof createLogger> = createLogger("api:video-chat:socket:handlers");
