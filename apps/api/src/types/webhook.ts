/**
 * Type definitions for Clerk webhook events
 */

/**
 * Clerk user.created webhook event data structure
 */
export interface ClerkUserCreatedEvent {
  data: ClerkUserData;
  event_attributes: ClerkEventAttributes;
  instance_id: string;
  object: "event";
  timestamp: number;
  type: "user.created";
}

/**
 * Clerk user.updated webhook event data structure
 */
export interface ClerkUserUpdatedEvent {
  data: ClerkUserData;
  event_attributes: ClerkEventAttributes;
  object: "event";
  timestamp: number;
  type: "user.updated";
}

export interface ClerkUserData {
  backup_code_enabled: boolean;
  banned: boolean;
  create_organization_enabled: boolean;
  create_organizations_limit: number | null;
  created_at: number;
  delete_self_enabled: boolean;
  email_addresses: ClerkEmailAddress[];
  enterprise_accounts: unknown[];
  external_accounts: unknown[];
  external_id: string | null;
  first_name: string;
  has_image: boolean;
  id: string;
  image_url: string;
  last_active_at: number;
  last_name: string;
  last_sign_in_at: number;
  legal_accepted_at: number;
  locked: boolean;
  lockout_expires_in_seconds: number | null;
  mfa_disabled_at: number | null;
  mfa_enabled_at: number | null;
  object: "user";
  passkeys: unknown[];
  password_enabled: boolean;
  phone_numbers: unknown[];
  primary_email_address_id: string;
  primary_phone_number_id: string | null;
  primary_web3_wallet_id: string | null;
  private_metadata: Record<string, unknown> | null;
  profile_image_url: string;
  public_metadata: Record<string, unknown>;
  saml_accounts: unknown[];
  totp_enabled: boolean;
  two_factor_enabled: boolean;
  unsafe_metadata: Record<string, unknown>;
  updated_at: number;
  username: string | null;
  verification_attempts_remaining: number | null;
  web3_wallets: unknown[];
}

export interface ClerkEmailAddress {
  id: string;
  email_address: string;
  verification: {
    status: string;
    strategy: string;
    attempts: number | null;
    expire_at: number | null;
  } | null;
  linked_to: Array<{
    type: string;
    id: string;
  }>;
  created_at: number;
  updated_at: number;
}

export interface ClerkEventAttributes {
  http_request: ClerkHttpRequest;
}

export interface ClerkHttpRequest {
  client_ip: string;
  user_agent: string;
}

/**
 * Union type for all supported Clerk webhook event types
 */
export type ClerkWebhookEvent = ClerkUserCreatedEvent | ClerkUserUpdatedEvent;

/**
 * Type guard to check if event is user.created
 */
export function isUserCreatedEvent(
  event: ClerkWebhookEvent
): event is ClerkUserCreatedEvent {
  return event.type === "user.created";
}

/**
 * Type guard to check if event is user.updated
 */
export function isUserUpdatedEvent(
  event: ClerkWebhookEvent
): event is ClerkUserUpdatedEvent {
  return event.type === "user.updated";
}
