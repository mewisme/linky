import { nextJsConfig } from "@ws/eslint-config/next-js";

const noServerInClientImports = {
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        {
          group: ["@/actions", "@/actions/*"],
          message:
            "Do not import server actions from client-oriented modules. Call a same-origin /api route that delegates to the action instead.",
        },
        {
          group: ["@/features/*/api", "@/features/*/api/*"],
          message:
            "Do not import use server API modules from the client. Call a same-origin /api route that delegates instead.",
        },
      ],
    },
  ],
};

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    files: [
      "src/features/**/*.{ts,tsx}",
      "src/providers/**/*.tsx",
      "src/shared/ui/data-table/**/*.{ts,tsx}",
      "src/app/[locale]/(app)/admin/**/create/**/*.tsx",
    ],
    ignores: ["src/features/**/api/**"],
    rules: noServerInClientImports,
  },
];
