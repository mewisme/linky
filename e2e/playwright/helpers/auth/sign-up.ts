interface GenerateEmailOptions {
  prefix?: string;
  suffix?: boolean;
  domain?: string;
}

export function generateEmail({ prefix = 'example', suffix = false, domain = 'example.com' }: GenerateEmailOptions) {
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}${suffix ? `_${random}` : ''}+clerk_test@${domain}`;
}