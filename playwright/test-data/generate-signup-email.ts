import "dotenv/config";

export type AutoRemovePosition = "prefix" | "suffix" | "include";

export type SignupEmailOptions = {
  enableGenerate: boolean;
  autoRemoveContent: string | null;
  autoRemovePosition: AutoRemovePosition | null;
};

function trimmedEnv(name: string): string | undefined {
  const v = process.env[name];
  if (v === undefined || v === null) {
    return undefined;
  }
  const t = v.trim();
  return t === "" ? undefined : t;
}

export function getSignupEmailOptionsForGenerate(
  enableGenerate: boolean,
): SignupEmailOptions {
  const posRaw = trimmedEnv("SIGNUP_EMAIL_AUTO_REMOVE_POSITION") ?? "include";
  const pos = posRaw as AutoRemovePosition;
  const normalized: AutoRemovePosition = [
    "prefix",
    "suffix",
    "include",
  ].includes(pos)
    ? pos
    : "include";
  return {
    enableGenerate,
    autoRemoveContent: "amtest",
    autoRemovePosition: normalized,
  };
}

function generateSignupEmailWithOptions(
  baseEmail: string,
  options: SignupEmailOptions,
): string {
  if (!options.enableGenerate) {
    return baseEmail ?? "";
  }
  if (!baseEmail || !baseEmail.includes("@")) {
    return baseEmail ?? "";
  }
  const at = baseEmail.indexOf("@");
  const local = baseEmail.slice(0, at);
  const domain = baseEmail.slice(at + 1);
  if (!local.toLowerCase().includes("+clerk_test")) {
    return baseEmail;
  }
  const plusIdx = local.indexOf("+");
  if (plusIdx < 0) {
    return baseEmail;
  }
  const prefix = local.slice(0, plusIdx);
  const suffix = local.slice(plusIdx + 1);
  const timestamp = String(Date.now());
  const { autoRemoveContent, autoRemovePosition } = options;
  if (!autoRemoveContent || !autoRemovePosition) {
    return `${prefix}${timestamp}+${suffix}@${domain}`;
  }
  let newLocal: string;
  switch (autoRemovePosition) {
    case "prefix":
      newLocal = `${autoRemoveContent}${prefix}${timestamp}`;
      break;
    case "suffix":
      newLocal = `${prefix}${timestamp}${autoRemoveContent}`;
      break;
    case "include":
      newLocal = `${prefix}${autoRemoveContent}${timestamp}`;
      break;
    default:
      newLocal = `${prefix}${timestamp}`;
  }
  return `${newLocal}+${suffix}@${domain}`;
}

export function generateSignupEmail(
  baseEmail: string,
  enableGenerate: boolean,
): string;
export function generateSignupEmail(
  baseEmail: string,
  options: SignupEmailOptions,
): string;
export function generateSignupEmail(
  baseEmail: string,
  optionsOrEnable: boolean | SignupEmailOptions,
): string {
  const options =
    typeof optionsOrEnable === "boolean"
      ? getSignupEmailOptionsForGenerate(optionsOrEnable)
      : optionsOrEnable;
  return generateSignupEmailWithOptions(baseEmail, options);
}

export function shouldDisableSignupEmailGenerate(expectedMessage: string): boolean {
  if (!expectedMessage) {
    return false;
  }
  return (
    expectedMessage.includes("email address already in use") ||
    expectedMessage.includes("email address is taken")
  );
}
