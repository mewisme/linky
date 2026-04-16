export type InternalWorkerHttpErrorBody = {
  error: string;
  message: string;
};

export function parseInternalWorkerErrorBody(text: string): InternalWorkerHttpErrorBody | null {
  try {
    const data = JSON.parse(text) as unknown;
    if (!data || typeof data !== "object") return null;
    const o = data as Record<string, unknown>;
    if (typeof o.error !== "string" || typeof o.message !== "string") return null;
    return { error: o.error, message: o.message };
  } catch {
    return null;
  }
}
