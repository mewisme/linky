import { createLogger } from "@/utils/logger.js";

export const logger: ReturnType<typeof createLogger> = createLogger("api:video-chat:socket:handlers");
