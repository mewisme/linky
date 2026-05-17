import { parseArgs } from "node:util";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    port: { type: "string", short: "p" },
  },
  strict: false,
  allowPositionals: true,
});

function toPort(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : undefined;
}

export const args = {
  port: toPort(typeof values.port === "string" ? values.port : undefined),
} as const;
