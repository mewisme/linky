import type { Logger as PinoLogger } from "pino";
import { baseLogger } from "./base.js";

export const createLogger = (scope?: string): PinoLogger =>
  scope ? baseLogger.child({ scope }) : baseLogger;

export const logger = createLogger();
