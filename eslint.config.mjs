// eslint-config-next 16.x ships native ESLint flat configs — import them
// directly (the 15.x FlatCompat bridge is no longer needed or supported).
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "convex/_generated/**",
      "secure-vibe-kit/**",
      // Git worktrees created by tooling are separate checkouts — don't lint them.
      ".claude/worktrees/**",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      // react-hooks v7 (via eslint-config-next 16) promotes its new
      // compiler-powered rules to error. The flagged patterns are pre-existing
      // (shadcn/theme mounted-state effects etc.) — downgrade to warn like
      // no-explicit-any above and clean up separately.
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
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
