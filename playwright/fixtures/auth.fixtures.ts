import { generateEmail } from "../utils/auth/sign-up";

export const CORRECT_TEST_EMAIL = 'example+clerk_test@example.com';
export const CORRECT_TEST_PASSWORD = 'example';

export const INVALID_EMAIL = 'invalid-email';
export const WRONG_IDENTIFIER = 'example_wrong+clerk_test@example.com';
export const WRONG_PASSWORD = 'wrong-password';

export const WRONG_OTP = '000000';
export const CORRECT_OTP = '424242';

export const NEW_SHORT_PASSWORD = '123456';
export const NEW_PASSWORD = '12345678';
export const CONFIRM_PASSWORD = '12345678';
export const CONFIRM_PASSWORD_MISMATCH = '123456789';
export const NEW_STRONG_PASSWORD = 'Example@2026';
export const CONFIRM_STRONG_PASSWORD = 'Example@2026';
export const NOT_COMPROMISED_PASSWORD = 'Example@2026';

export const FIRST_NAME = 'John';
export const LAST_NAME = 'Doe';

export const CORRECT_SIGN_UP_EMAIL = generateEmail({ prefix: 'example', suffix: true, domain: 'example.com' });