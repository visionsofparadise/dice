import js from "@eslint/js";
import barrelFiles from "eslint-plugin-barrel-files";
import checkFile from "eslint-plugin-check-file";
import importX from "eslint-plugin-import-x";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/dist-*/**",
      "**/.vite/**",
      "**/build/**",
      "**/*.config.js",
      "**/*.config.ts",
      "**/vite.config.*",
      "**/tailwind.config.*",
      "**/postcss.config.*",
      // Ignore test files - they need significant refactoring
      "**/*.test.ts",
      "**/*.test.tsx",
    ],
  },

  // Base JS recommended
  js.configs.recommended,

  // TypeScript strict + stylistic
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // TypeScript parser settings
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Main rules for TypeScript files
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "import-x": importX,
      "barrel-files": barrelFiles,
      "check-file": checkFile,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // === FUNCTIONS: Arrow functions by default ===
      "prefer-arrow-callback": "error",
      "arrow-body-style": ["error", "as-needed"],

      // === NAMING CONVENTIONS ===
      "@typescript-eslint/naming-convention": [
        "error",
        // Default: camelCase with leading underscore allowed
        {
          selector: "default",
          format: ["camelCase"],
          leadingUnderscore: "allow",
        },
        // Variables: camelCase, PascalCase (React components), UPPER_CASE (constants)
        // Must be at least 2 chars (except: _, x, y, z for coordinates)
        {
          selector: "variable",
          format: ["camelCase", "PascalCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
          custom: {
            regex: "^(_|[xyz]|.{2,})$",
            match: true,
          },
        },
        // Parameters: min 2 chars (except: x, y, z for coordinates)
        {
          selector: "parameter",
          format: ["camelCase", "PascalCase"],
          leadingUnderscore: "allowSingleOrDouble",
          filter: {
            // Skip check for underscore-only names (unused params)
            regex: "^_+$",
            match: false,
          },
          custom: {
            regex: "^([xyz]|.{2,})$",
            match: true,
          },
        },
        // Functions: camelCase or PascalCase (React components)
        {
          selector: "function",
          format: ["camelCase", "PascalCase"],
        },
        // Type parameters (generics): single uppercase letter or PascalCase
        {
          selector: "typeParameter",
          format: ["PascalCase"],
          custom: { regex: "^[A-Z]([a-zA-Z0-9]*)?$", match: true },
        },
        // Interfaces: PascalCase, no I prefix
        {
          selector: "interface",
          format: ["PascalCase"],
        },
        // Type aliases: PascalCase
        {
          selector: "typeAlias",
          format: ["PascalCase"],
        },
        // Classes: PascalCase
        {
          selector: "class",
          format: ["PascalCase"],
        },
        // Enums and enum members: PascalCase or UPPER_CASE
        {
          selector: "enum",
          format: ["PascalCase"],
        },
        {
          selector: "enumMember",
          format: ["PascalCase", "UPPER_CASE"],
        },
        // Properties: camelCase (allow leading underscore for private)
        {
          selector: "property",
          format: ["camelCase", "PascalCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
        },
        // Object literal properties: allow anything (API compatibility, CSS-in-JS)
        {
          selector: "objectLiteralProperty",
          format: null,
        },
        // Type properties: allow anything (external API types)
        {
          selector: "typeProperty",
          format: null,
        },
        // Imports: allow any format (external packages)
        {
          selector: "import",
          format: null,
        },
      ],

      // === TYPESCRIPT: Interfaces over types ===
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],

      // === TYPESCRIPT: Array<T> over T[] ===
      "@typescript-eslint/array-type": ["error", { default: "generic" }],

      // === TYPESCRIPT: No explicit any, prefer unknown ===
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-return": "error",

      // === TYPESCRIPT: Prefer undefined over null ===
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "error",

      // === TYPESCRIPT: async/await over .then() ===
      "@typescript-eslint/promise-function-async": "off", // Too strict for React components
      "@typescript-eslint/no-floating-promises": ["error", { ignoreVoid: true }],
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } }, // Allow async onClick handlers
      ],

      // === IMPORTS: Consistent type imports ===
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
        },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",

      // === CODE QUALITY ===
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true, allowBoolean: true },
      ],
      // Allow console.log during development (TODO: remove for production)
      "no-console": "off",
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],

      // === NAMING: No abbreviations ===
      "id-denylist": [
        "error",
        "btn",
        "cb",
        "ctx",
        "el",
        "elem",
        "err",
        "evt",
        "fn",
        "idx",
        "msg",
        "num",
        "obj",
        "opts",
        "params",
        "pkg",
        "ptr",
        "req",
        "res",
        "ret",
        "str",
        "temp",
        "tmp",
        "val",
        "var",
      ],

      // === IMPORTS: No extensions, no /index paths ===
      "import-x/extensions": [
        "error",
        "never",
        { ignorePackages: true },
      ],
      "import-x/no-useless-path-segments": [
        "error",
        { noUselessIndex: true },
      ],

      // === IMPORTS: No barrel files (disabled for this package) ===
      "barrel-files/avoid-barrel-files": "off",
      "barrel-files/avoid-re-export-all": "off",
      "barrel-files/avoid-namespace-import": "warn",

      // === REACT (disabled - not a React project) ===
      ...reactHooks.configs.recommended.rules,
      "react/jsx-no-target-blank": "off",
      "react/jsx-curly-brace-presence": "off",

      // === RELAXATIONS for strict rules that conflict with patterns ===
      // Generic base classes legitimately use type params only in methods
      "@typescript-eslint/no-unnecessary-type-parameters": "off",
      // Allow non-null assertions in specific patterns (valtio, etc.)
      "@typescript-eslint/no-non-null-assertion": "warn",
      // Allow empty functions for callbacks
      "@typescript-eslint/no-empty-function": [
        "error",
        { allow: ["arrowFunctions"] },
      ],
      // Relax for React patterns
      "@typescript-eslint/unbound-method": "off",
      // Allow void for fire-and-forget
      "@typescript-eslint/no-confusing-void-expression": [
        "error",
        { ignoreArrowShorthand: true },
      ],
      // Allow empty interfaces for extending
      "@typescript-eslint/no-empty-object-type": "off",
      // Allow namespaces (used for type organization pattern)
      "@typescript-eslint/no-namespace": "off",
      // Mapped types require index signature syntax, Record<K,V> doesn't work
      "@typescript-eslint/consistent-indexed-object-style": "off",
      // Allow Function type
      "@typescript-eslint/no-unsafe-function-type": "off",
      // Exhaustive deps causes issues with object.property patterns
      "react-hooks/exhaustive-deps": "off",
    },
  },

  // JavaScript files (config files, scripts)
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    ...tseslint.configs.disableTypeChecked,
    rules: {
      "prefer-arrow-callback": "error",
      "prefer-const": "error",
      "no-var": "error",
    },
  }
);
