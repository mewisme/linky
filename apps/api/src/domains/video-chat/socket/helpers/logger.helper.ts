import { createLogger } from "@ws/logger";

export const logger: ReturnType<typeof createLogger> = createLogger("api:video-chat:socket:handlers");
