/**
 * Pino signature for all levels: logger.<level>([mergingObject], [message], [...interpolationValues])
 * Put the object (error, context) first so the logger and Sentry hook receive it correctly.
 */
import * as Sentry from "@sentry/node";

import { initLogger, type Logger } from "@ws/logger";

const { createLogger: createLoggerFn, logger: rootLogger } = initLogger(Sentry);

export const createLogger: (scope?: string) => Logger = createLoggerFn;
export const logger: Logger = rootLogger;

