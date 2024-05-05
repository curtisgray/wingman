import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReactConfig from "eslint-plugin-react/configs/jsx-runtime.js";

export default [
    {
        files: ["src/**/*.js", "src/**/*.jsx", "src/**/*.ts", "src/**/*.tsx"],
        rules: {
            "@typescript-eslint/no-explicit-any": "warn",
            "no-unused-vars": "warn",
            "no-undef": "warn",
            "no-constant-condition": "warn",
            "no-unused-expressions": "warn",
            "no-prototype-builtins": "warn",
            "no-async-promise-executor": "warn",
            "no-template-curly-in-string": "warn",
            "no-unsafe-optional-chaining": "warn",
            "no-unsafe-negation": "warn",
        },
        ignores: ["node_modules", "dist", "build", "out", "public", "**/*.config.js", "!**/eslint.config.js"],
    },
    { languageOptions: { globals: globals.browser } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    pluginReactConfig,
];
