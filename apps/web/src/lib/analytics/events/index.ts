import {
  CLIENT_EVENT_NAMES,
  trackEvent,
  type ClientEventName,
  type Event as ClientEvent,
} from "./client";
import {
  SERVER_EVENT_NAMES,
  trackEventServer,
  type Event as ServerEvent,
  type ServerEventName,
} from "./server";

export { trackEvent, trackEventServer };
export type { ClientEvent, ClientEventName, ServerEvent, ServerEventName };
export { CLIENT_EVENT_NAMES, SERVER_EVENT_NAMES };