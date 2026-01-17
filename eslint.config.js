import tseslint from "typescript-eslint";
import baseConfig from "../../eslint.config.js";

/**
 * DICE project ESLint configuration.
 * Extends the base config from Projects/Code with project-specific overrides.
 */
export default tseslint.config(
  // Ignore test files - they need significant refactoring
  {
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
  },

  ...baseConfig,

  // Project-specific TypeScript parser settings
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Disable React rules (not a React project)
  {
    files: ["**/*.ts"],
    rules: {
      "react/jsx-no-target-blank": "off",
      "react/jsx-curly-brace-presence": "off",
    },
  },

  // Project-specific overrides
  {
    files: ["**/*.ts"],
    rules: {
      // Allow console.log during development (TODO: remove for production)
      "no-console": "off",

      // This is a package that needs to re-export from index.ts
      "barrel-files/avoid-barrel-files": "off",
      "barrel-files/avoid-re-export-all": "off",
    },
  }
);
