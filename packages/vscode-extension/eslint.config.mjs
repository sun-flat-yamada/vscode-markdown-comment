import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.mocha,
        ...globals.browser,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
      "no-undef": "off",
      "no-case-declarations": "off",
      "no-inner-declarations": "off",
      "no-redeclare": "off",
      "@typescript-eslint/no-namespace": "off",
      "prefer-const": "off",
      "no-useless-assignment": "off",
    },
  },
  {
    ignores: [
      "**/dist/**",
      "**/out/**",
      "**/node_modules/**",
      "webpack.config.js",
      "scripts/**",
    ],
  },
);
