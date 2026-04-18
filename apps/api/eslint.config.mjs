import { config } from "@ws/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    files: ["**/*.{ts,mts,cts}"],
    rules: {
      "turbo/no-undeclared-env-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-control-regex": "off",
    },
  },
];
