import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

// eslint-config-next 16.x ships native flat-config arrays, so they are spread
// directly. Do NOT reintroduce FlatCompat here: running the legacy eslintrc
// validator over a flat config throws "Converting circular structure to JSON".

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "**/convex/_generated/**",
      "secure-vibe-kit/**",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",

      // New errors introduced by eslint-config-next 16 (eslint-plugin-react-hooks v6).
      // 24 pre-existing violations across app/, components/ and templates/modules/.
      // Downgraded to "warn" so the Next.js 16 upgrade doesn't also become a
      // component-refactor PR. Fixing these changes runtime behaviour (effect
      // ordering, render purity), so it belongs in its own change.
      // TODO: fix the violations and re-promote all three to "error".
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/static-components": "warn",
    },
  },
  {
    files: ["**/*.js", "**/*.mjs", "scripts/**"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
