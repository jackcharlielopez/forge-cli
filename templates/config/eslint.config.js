import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default (async () => {
  const jestPlugin = await import("eslint-plugin-jest");
  return [
    js.configs.recommended,
    {
      files: [
        "**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx",
        ".storybook/**/*.{js,jsx,ts,tsx}",
        "**/*.config.{js,ts,cjs,mjs}"
      ],
      languageOptions: {
        parser: tsParser,
        parserOptions: {
          project: "./tsconfig.json",
          ecmaVersion: 2020,
          sourceType: "module",
          ecmaFeatures: {
            jsx: true,
          },
        },
      },
      plugins: {
        "@typescript-eslint": tseslint,
      },
      rules: {
        ...tseslint.configs.recommended.rules,
      },
    },
    {
      files: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.spec.ts",
        "**/*.spec.tsx",
        "**/*.test.js",
        "**/*.test.jsx",
        "**/*.spec.js",
        "**/*.spec.jsx",
      ],
      plugins: {
        jest: jestPlugin.default ?? jestPlugin,
      },
      languageOptions: {
        globals: {
          describe: "readonly",
          it: "readonly",
          expect: "readonly",
          jest: "readonly",
          beforeEach: "readonly",
          afterEach: "readonly",
          beforeAll: "readonly",
          afterAll: "readonly",
        },
      },
      rules: {
        ...(jestPlugin.configs?.recommended?.rules ||
          jestPlugin.default?.configs?.recommended?.rules ||
          {}),
      },
    },
  ];
})();
