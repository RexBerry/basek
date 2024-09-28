// @ts-check

import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default tseslint.config(
    eslint.configs.recommended,
    eslintPluginPrettierRecommended,
    ...tseslint.configs.strictTypeChecked,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            parserOptions: {
                project: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            eqeqeq: ["error", "smart"],
            "no-constant-condition": ["error", { checkLoops: "allExceptWhileTrue" }],
            "prefer-const": ["warn"],
            "@typescript-eslint/no-confusing-void-expression": "off",
            "@typescript-eslint/no-non-null-assertion": "warn",
            "@typescript-eslint/no-unnecessary-condition": [
                "error",
                { allowConstantLoopConditions: true },
            ],
            "@typescript-eslint/no-unused-vars": "warn",
            "@typescript-eslint/restrict-template-expressions": [
                "error",
                {
                    allowBoolean: true,
                    allowNullish: true,
                    allowNumber: true,
                },
            ],
            "prettier/prettier": [
                "error",
                {
                    printWidth: 90,
                    semi: true,
                    singleQuote: false,
                    tabWidth: 4,
                    trailingComma: "all",
                },
            ],
        },
    },
    {
        ignores: ["**/node_modules/", "dist/", "emscripten/", "vendor/", "*.config.js"],
    },
);
